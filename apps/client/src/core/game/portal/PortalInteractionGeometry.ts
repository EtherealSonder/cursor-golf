import { PortalTeleportDiagnosticController as TeleportDebug } from "../debug/PortalTeleportDiagnosticController";
import type { Portal } from "./Portal";
import { PORTAL_INTERACTION as D } from "./PortalInteractionDefinition";
import { PORTAL_COLLIDER } from "../config/PortalPhysicsDefinition";
export type PortalZone = "outside" | "outerVortex" | "centralVoid";
export function portalLocal(portal: Portal, x: number, y: number): {x:number;y:number} {
    const dx=x-portal.getX(), dy=y-portal.getY(), c=Math.cos(portal.getRotation()), s=Math.sin(portal.getRotation());
    return {x:dx*c+dy*s,y:-dx*s+dy*c};
}
export function portalWorld(portal: Portal, x: number, y: number): {x:number;y:number} {
    const c=Math.cos(portal.getRotation()),s=Math.sin(portal.getRotation());
    return {x:portal.getX()+x*c-y*s,y:portal.getY()+x*s+y*c};
}
function inside(x:number,y:number,rx:number,ry:number): boolean {
    return rx>0 && ry>0 && (x/rx)**2+(y/ry)**2<=1;
}
export function classifyPortalZone(portal:Portal,x:number,y:number,radius:number):PortalZone {
    const p=portalLocal(portal,x,y);
    const zone: PortalZone = inside(p.x,p.y,D.centralRadiusX,D.centralRadiusY) ? "centralVoid"
        : inside(p.x,p.y,D.outerRadiusX+radius,D.outerRadiusY+radius) ? "outerVortex" : "outside";
    // Report actual local coordinates so visible-vortex entry can be compared
    // against the logical trigger without altering any collision geometry.
    TeleportDebug.zone(portal.id, zone, {localX: Math.round(p.x*10)/10, localY: Math.round(p.y*10)/10, radius});
    return zone;
}
/** Exit lies outside the outer vortex on its local normal, with ball clearance. */
export function portalExit(portal:Portal,radius:number,side:1|-1):{x:number;y:number} {
    return portalWorld(portal,0,side*(D.outerRadiusY+radius+D.exitClearance+D.exitForwardOffset));
}

/** Segment-to-ellipse entry, in the portal's rotated local coordinates.
 * A ball center crossing the opening is sufficient; physical housing still blocks its rim.
 * Returns the earliest central-void intersection, or null when the sweep misses.
 */
export function sweptCentralEntry(portal: Portal, fromX: number, fromY: number, toX: number, toY: number): {x:number;y:number;t:number} | null {
    const a=portalLocal(portal,fromX,fromY), b=portalLocal(portal,toX,toY);
    const rx=D.centralRadiusX, ry=D.centralRadiusY;
    const dx=b.x-a.x,dy=b.y-a.y;
    const A=(dx/rx)**2+(dy/ry)**2;
    if(A<1e-12)return null;
    const B=2*(a.x*dx/(rx*rx)+a.y*dy/(ry*ry));
    const C=(a.x/rx)**2+(a.y/ry)**2-1;
    // Starting within the opening is handled by the regular zone classification.
    if(C<=0)return {x:fromX,y:fromY,t:0};
    const discriminant=B*B-4*A*C;
    if(discriminant<0)return null;
    const t=(-B-Math.sqrt(discriminant))/(2*A);
    if(t<0||t>1)return null;
    return {x:fromX+(toX-fromX)*t,y:fromY+(toY-fromY)*t,t};
}

/** Detect entry into the central void through the physically open top/bottom corridor.
 * The test accepts either a segment crossing the inner ellipse or an already
 * inside ball center. It does not require a single frame to traverse the
 * complete outer vortex and central ellipse.
 */
export function sweptUsableCentralEntry(portal: Portal, fromX: number, fromY: number, toX: number, toY: number, ballRadius: number): {x:number;y:number;t:number} | null {
    const a=portalLocal(portal,fromX,fromY), b=portalLocal(portal,toX,toY);
    const clearance=PORTAL_COLLIDER.entranceHalfWidth-ballRadius;
    if (Math.abs(b.x)<160 && Math.abs(b.y)<110) {
        TeleportDebug.event("SWEEP_GEOMETRY",{portal:portal.id,fromLocal:{x:+a.x.toFixed(1),y:+a.y.toFixed(1)},toLocal:{x:+b.x.toFixed(1),y:+b.y.toFixed(1)},clearance:+clearance.toFixed(1),centralRadii:{x:D.centralRadiusX,y:D.centralRadiusY}},`sweep:${portal.id}`,500);
    }
    if(clearance<=0)return null;
    const rx=D.centralRadiusX,ry=D.centralRadiusY;
    const startInside=inside(a.x,a.y,rx,ry);
    const endInside=inside(b.x,b.y,rx,ry);
    // A ball already within the open vortex must be allowed to complete its
    // teleport even when it crossed the entrance on a previous physics step.
    if(endInside && Math.abs(b.x)<=clearance) {
        if(startInside) return {x:toX,y:toY,t:1};
        const crossed=sweptCentralEntry(portal,fromX,fromY,toX,toY);
        if(crossed) {
            const contact=portalLocal(portal,crossed.x,crossed.y);
            if(Math.abs(contact.x)<=clearance)return crossed;
        }
        return {x:toX,y:toY,t:1};
    }
    if(startInside)return null;
    const crossed=sweptCentralEntry(portal,fromX,fromY,toX,toY);
    if(!crossed)return null;
    const contact=portalLocal(portal,crossed.x,crossed.y);
    if(Math.abs(contact.x)>clearance)return null;
    // Reject a sideways pass through the solid end housing. A vertical
    // component is required when entering from outside the central ellipse.
    const dx=b.x-a.x,dy=b.y-a.y;
    if(Math.abs(dy)<Math.abs(dx)*0.35)return null;
    if(a.y*dy>=0 && Math.abs(a.y)>ry)return null;
    return crossed;
}

/** Authoritative interaction radii for visualization. */
export function getPortalDebugInteractionRadii(): { outerX:number; outerY:number; centralX:number; centralY:number } {
    return {outerX:D.outerRadiusX,outerY:D.outerRadiusY,centralX:D.centralRadiusX,centralY:D.centralRadiusY};
}
