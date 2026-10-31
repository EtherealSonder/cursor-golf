import { PortalTeleportDiagnosticController as TeleportDebug } from "../debug/PortalTeleportDiagnosticController";
import type { Ball } from "../entities/Ball";
import { BallGameplayState } from "../entities/Ball";
import type { Portal } from "./Portal";
import { PORTAL_INTERACTION as D } from "./PortalInteractionDefinition";
import { classifyPortalZone, portalExit, portalExitSide, portalInteractionCleared, portalLocal, sweptUsableCentralEntry } from "./PortalInteractionGeometry";
import { PORTAL_COLLIDER } from "../config/PortalPhysicsDefinition";
import { getPairedPortal } from "./PortalPairController";
import { PortalPerformanceDiagnosticController as Diag } from "../debug/PortalPerformanceDiagnosticController";

/** P3: ball-only interaction; no modification to the rigid-body collision solver. */
export class PortalBallInteractionController {
    private readonly previousZones = new Map<string,string>();
    private readonly stalled = new Map<string,number>();
    private cooldown = 0;
    private protectedPortalId: string | null = null;
    private destinationReleaseArmed = false;
    private readonly portals: readonly Portal[];
    public constructor(portals:readonly Portal[],private readonly clearExit:(x:number,y:number,radius:number)=>boolean, private readonly cameraState?:()=>{x:number;y:number}, private readonly onTeleport?: (x:number,y:number)=>void) {
        this.portals=portals;
    }
    public update(dt:number,ball:Ball, segmentStart?: {x:number;y:number}):boolean {
        this.cooldown=Math.max(0,this.cooldown-dt);
        if(this.protectedPortalId) {
            const protectedPortal=this.portals.find(p=>p.id===this.protectedPortalId);
            if(this.destinationReleaseArmed && protectedPortal &&
                portalInteractionCleared(protectedPortal,ball.getX(),ball.getY(),ball.getRadius())) {
                this.protectedPortalId=null;
                this.destinationReleaseArmed=false;
            } else {
                this.destinationReleaseArmed=true;
            }
        }
        if(ball.isDeathPhysicsLocked || ball.getGameplayState()!==BallGameplayState.Active) return false;
        const radius=ball.getRadius();
        const speed=ball.getSpeed();
        for(const portal of this.portals) {
            const start=segmentStart??ball.getPortalFrameStart();
            const sweep=start?sweptUsableCentralEntry(portal,start.x,start.y,ball.getX(),ball.getY(),radius):null;
            const zone=classifyPortalZone(portal,ball.getX(),ball.getY(),radius);
            // The physical opening is authoritative. A ball that reaches the
            // central void in a later physics step must still be admitted.
            const localNow=portalLocal(portal,ball.getX(),ball.getY());
            const insideCorridor=Math.abs(localNow.x)+radius<=PORTAL_COLLIDER.entranceHalfWidth;
            const centralEntry=sweep!==null || (insideCorridor && zone==="centralVoid");
            const previous=this.previousZones.get(portal.id)??"outside";
            const context={portal:portal.id,zone,previous,centralEntry,sweep:!!sweep,
                x:+ball.getX().toFixed(1),y:+ball.getY().toFixed(1),
                localX:+localNow.x.toFixed(1),localY:+localNow.y.toFixed(1),
                corridor:insideCorridor,speed:+speed.toFixed(1),cooldown:+this.cooldown.toFixed(3)};
            this.previousZones.set(portal.id,zone);
            if(zone==="outside" && !centralEntry) {this.stalled.delete(portal.id);continue;}
            if(previous==="outside") Diag.active?.count("portalOuterVortexEntries");
            if(centralEntry) {
                if(previous!=="centralVoid") Diag.active?.count("portalCentralEntryAttempts");
                Diag.active?.count("portalCentralEntryEligible");
                if(this.cooldown>0 || this.protectedPortalId===portal.id) {
                    if (false) TeleportDebug.rejected(portal.id,"COOLDOWN_ACTIVE",{...context,protectedPortalId:this.protectedPortalId});
                    Diag.active?.count("portalReentryPrevented");continue;}
                if(speed<D.minimumEntrySpeed || speed>D.maximumEntrySpeed) {
                    if (false) TeleportDebug.rejected(portal.id,speed<D.minimumEntrySpeed?"SPEED_TOO_LOW":"SPEED_TOO_HIGH",{...context,min:D.minimumEntrySpeed,max:D.maximumEntrySpeed});
                    Diag.active?.count("portalEntrySpeedRejected");
                    continue;
                }
                const destination=getPairedPortal(this.portals,portal);
                if(!destination) {
                    if (false) TeleportDebug.rejected(portal.id,"PAIR_NOT_FOUND",context);
                    Diag.active?.count("portalPairMissing");
                    continue;
                }
                // The null guard above guarantees an active paired endpoint.
                const pairedDestination = destination!;
                {
                        const local=portalLocal(portal,sweep?.x??ball.getX(),sweep?.y??ball.getY());
                        const delta=pairedDestination.getRotation()-portal.getRotation();
                        const c=Math.cos(delta),s=Math.sin(delta);
                        let vx=ball.getVelocityX()*c-ball.getVelocityY()*s;
                        let vy=ball.getVelocityX()*s+ball.getVelocityY()*c;
                        const magnitude=Math.hypot(vx,vy);
                        if(magnitude>0) {const scale=Math.min(D.maximumExitSpeed,Math.max(D.minimumExitSpeed,magnitude))/magnitude;vx*=scale;vy*=scale;}
                        const sourceNormal=-ball.getVelocityX()*Math.sin(portal.getRotation())+ball.getVelocityY()*Math.cos(portal.getRotation());
                        const fallback:1|-1=sourceNormal!==0?(sourceNormal>0?1:-1):(local.y>=0?1:-1);
                        const sign=portalExitSide(pairedDestination,vx,vy,fallback);
                        const exit=portalExit(pairedDestination,radius,sign);
                        if(!this.clearExit(exit.x,exit.y,radius)) {
                            if (false) TeleportDebug.rejected(portal.id,"EXIT_BLOCKED",{...context,destination:pairedDestination.id,exit});
                            Diag.active?.count("portalExitBlocked");continue;}
                        const traceId = false ? TeleportDebug.begin(portal.id, {
                            ...context, entryPosition:{x:ball.getX(),y:ball.getY()},
                            incomingVelocity:{x:ball.getVelocityX(),y:ball.getVelocityY()},
                            sourceRotationRadians:portal.getRotation(), sourceRotationDegrees:portal.getRotation()*180/Math.PI,
                            entrySide:sign===1?"POSITIVE_LOCAL_Y":"NEGATIVE_LOCAL_Y",
                            cameraBefore:this.cameraState?.() ?? null,
                        }) : -1;
                        if (false) TeleportDebug.emit(traceId,"EXIT_CALCULATED",{
                            destination:pairedDestination.id, destinationRotationRadians:pairedDestination.getRotation(),
                            destinationRotationDegrees:pairedDestination.getRotation()*180/Math.PI,
                            relativeRotationRadians:delta, relativeRotationDegrees:delta*180/Math.PI,
                            exitSide:sign===1?"POSITIVE_LOCAL_Y":"NEGATIVE_LOCAL_Y",
                            exitPosition:exit, outgoingVelocity:{x:vx,y:vy},
                            predictedSpeed:Math.hypot(vx,vy),
                        });
                        ball.teleportThroughPortal(exit.x,exit.y,vx,vy);
                        this.cooldown=D.reentryCooldownSeconds;
                        this.protectedPortalId=pairedDestination.id;
                        this.destinationReleaseArmed=false;
                        this.stalled.clear();this.previousZones.clear();
                        if (false) TeleportDebug.completed(traceId,pairedDestination.id,{
                            source:portal.id, actualPosition:{x:ball.getX(),y:ball.getY()},
                            actualVelocity:{x:ball.getVelocityX(),y:ball.getVelocityY()},
                            actualSpeed:ball.getSpeed(), cameraImmediatelyAfter:this.cameraState?.() ?? null,
                        });
                        this.onTeleport?.(exit.x,exit.y);
                        Diag.active?.count("portalTeleports");
                        return true;
                }
            }
            if(zone==="outerVortex" && !centralEntry && speed<D.lowSpeedThreshold) {
                const elapsed=(this.stalled.get(portal.id)??0)+dt;
                this.stalled.set(portal.id,elapsed);
                const local=portalLocal(portal,ball.getX(),ball.getY());
                const sign=local.y>=0?1:-1;
                const nx=-Math.sin(portal.getRotation())*sign,ny=Math.cos(portal.getRotation())*sign;
                if(elapsed>=D.stuckSeconds) {
                    ball.applyDirectionalBumperVelocity(nx*D.stuckEjectionSpeed,ny*D.stuckEjectionSpeed);
                    this.stalled.set(portal.id,0);
                    Diag.active?.count("portalStuckEjections");
                } else {
                    ball.applyDirectionalBumperVelocity(ball.getVelocityX()+nx*D.edgeRejectAcceleration*dt,ball.getVelocityY()+ny*D.edgeRejectAcceleration*dt);
                    Diag.active?.count("portalEdgeRejections");
                }
            } else this.stalled.delete(portal.id);
        }
        return false;
    }
}
