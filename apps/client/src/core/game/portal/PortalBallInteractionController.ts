import { PortalTeleportDiagnosticController as TeleportDebug } from "../debug/PortalTeleportDiagnosticController";
import type { Ball } from "../entities/Ball";
import { BallGameplayState } from "../entities/Ball";
import type { Portal } from "./Portal";
import { PORTAL_INTERACTION as D } from "./PortalInteractionDefinition";
import { classifyPortalZone, portalExit, portalLocal, sweptUsableCentralEntry } from "./PortalInteractionGeometry";
import { PORTAL_COLLIDER } from "../config/PortalPhysicsDefinition";
import { getPairedPortal } from "./PortalPairController";
import { PortalPerformanceDiagnosticController as Diag } from "../debug/PortalPerformanceDiagnosticController";

/** P3: ball-only interaction; no modification to the rigid-body collision solver. */
export class PortalBallInteractionController {
    private readonly previousZones = new Map<string,string>();
    private readonly stalled = new Map<string,number>();
    private callbackConfirmed = false;
    private cooldown = 0;
    private protectedPortalId: string | null = null;
    private readonly portals: readonly Portal[];
    public constructor(portals:readonly Portal[],private readonly clearExit:(x:number,y:number,radius:number)=>boolean) {
        this.portals=portals;
    }
    public update(dt:number,ball:Ball, segmentStart?: {x:number;y:number}):boolean {
        TeleportDebug.event("CONTROLLER_CALLED", {dt,portalCount:this.portals.length,x:ball.getX(),y:ball.getY(),hasSegmentStart:!!segmentStart}, "controller-called", 2500);
        if (!this.callbackConfirmed) {
            this.callbackConfirmed = true;
            TeleportDebug.event("PORTAL_CALLBACK_ACTIVE", {
                portalCount: this.portals.length,
                hasSegmentStart: !!segmentStart,
                ballHasHandler: ball.hasPortalPreContactHandler(),
            }, "portal-callback-active", 0);
        }
        if(!(dt>0) || !Number.isFinite(dt)) {
            TeleportDebug.event("CONTROLLER_INVALID_DT",{dt},"invalid-dt",1000);
            return false;
        }
        this.cooldown=Math.max(0,this.cooldown-dt);
        if(ball.isDeathPhysicsLocked || ball.getGameplayState()!==BallGameplayState.Active) {
            TeleportDebug.event("CONTROLLER_INACTIVE_BALL",{deathLocked:ball.isDeathPhysicsLocked,state:ball.getGameplayState()},"inactive-ball",2500);
            return false;
        }
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
            if (Math.abs(localNow.x)<160 && Math.abs(localNow.y)<110) {
                TeleportDebug.event("ENTRY_EVALUATION",{portal:portal.id,zone,localX:+localNow.x.toFixed(1),localY:+localNow.y.toFixed(1),radius,insideCorridor,centralEntry,swept:!!sweep,speed:+speed.toFixed(1)},`evaluate:${portal.id}`,400);
            }
            const previous=this.previousZones.get(portal.id)??"outside";
            const context={portal:portal.id,zone,previous,centralEntry,sweep:!!sweep,
                x:+ball.getX().toFixed(1),y:+ball.getY().toFixed(1),
                localX:+localNow.x.toFixed(1),localY:+localNow.y.toFixed(1),
                corridor:insideCorridor,speed:+speed.toFixed(1),cooldown:+this.cooldown.toFixed(3)};
            this.previousZones.set(portal.id,zone);
            if(zone==="outside" && !centralEntry) {this.stalled.delete(portal.id);if(this.protectedPortalId===portal.id)this.protectedPortalId=null;continue;}
            if(previous==="outside") Diag.active?.count("portalOuterVortexEntries");
            if(centralEntry) {
                TeleportDebug.event("ENTRY_DETECTED",context,`entry:${portal.id}`,1000);
                if(previous!=="centralVoid") Diag.active?.count("portalCentralEntryAttempts");
                Diag.active?.count("portalCentralEntryEligible");
                if(this.cooldown>0 || this.protectedPortalId===portal.id) {
                    TeleportDebug.event("COOLDOWN_ACTIVE",{...context,protectedPortalId:this.protectedPortalId},`cooldown:${portal.id}`,1000);
                    Diag.active?.count("portalReentryPrevented");continue;}
                if(speed<D.minimumEntrySpeed || speed>D.maximumEntrySpeed) {
                    TeleportDebug.event(speed<D.minimumEntrySpeed?"SPEED_TOO_LOW":"SPEED_TOO_HIGH",{...context,min:D.minimumEntrySpeed,max:D.maximumEntrySpeed},`speed:${portal.id}`,1000);
                    Diag.active?.count("portalEntrySpeedRejected");
                    continue;
                }
                const destination=getPairedPortal(this.portals,portal);
                if(!destination) {
                    TeleportDebug.event("PAIR_NOT_FOUND",context,`pair:${portal.id}`,1000);
                    Diag.active?.count("portalPairMissing");
                    continue;
                }
                {
                        const local=portalLocal(portal,sweep?.x??ball.getX(),sweep?.y??ball.getY());
                        const sign:1|-1=local.y>=0?1:-1;
                        const exit=portalExit(destination,radius,sign);
                        if(!this.clearExit(exit.x,exit.y,radius)) {
                            TeleportDebug.event("EXIT_BLOCKED",{...context,destination:destination.id,exit},`exit:${portal.id}`,1000);
                            Diag.active?.count("portalExitBlocked");continue;}
                        const delta=destination.getRotation()-portal.getRotation();
                        const c=Math.cos(delta),s=Math.sin(delta);
                        let vx=ball.getVelocityX()*c-ball.getVelocityY()*s;
                        let vy=ball.getVelocityX()*s+ball.getVelocityY()*c;
                        const magnitude=Math.hypot(vx,vy);
                        if(magnitude>0) {const scale=Math.min(D.maximumExitSpeed,Math.max(D.minimumExitSpeed,magnitude))/magnitude;vx*=scale;vy*=scale;}
                        TeleportDebug.event("TELEPORT_ATTEMPT",{...context,destination:destination.id,exit,vx,vy},`attempt:${portal.id}`,0);
                        ball.teleportThroughPortal(exit.x,exit.y,vx,vy);
                        this.cooldown=D.reentryCooldownSeconds;
                        this.protectedPortalId=destination.id;
                        this.stalled.clear();this.previousZones.clear();
                        TeleportDebug.event("TELEPORT_SUCCESS",{source:portal.id,destination:destination.id,
                            x:ball.getX(),y:ball.getY(),vx:ball.getVelocityX(),vy:ball.getVelocityY()},`success:${portal.id}`,0);
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
