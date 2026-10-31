import type { Portal } from "./Portal";
import { PORTAL_DYNAMIC_INTERACTION, PORTAL_INTERACTION as D } from "./PortalInteractionDefinition";
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

/** Signed local normal of outgoing velocity. The exit side MUST match movement. */
export function portalExitSide(portal:Portal,vx:number,vy:number,fallback:1|-1):1|-1 {
    const c=Math.cos(portal.getRotation()),s=Math.sin(portal.getRotation());
    const localNormal=-vx*s+vy*c;
    const speed=Math.hypot(vx,vy);
    if(speed<1e-9 || Math.abs(localNormal)<speed*D.exitNormalDeadzone)return fallback;
    return localNormal>=0?1:-1;
}
/** Destination lock is released only after the entire ball clears its interaction ellipse. */
export function portalInteractionCleared(portal:Portal,x:number,y:number,radius:number):boolean {
    const p=portalLocal(portal,x,y);
    const rx=D.outerRadiusX+radius+D.releaseMargin;
    const ry=D.outerRadiusY+radius+D.releaseMargin;
    return (p.x/rx)**2+(p.y/ry)**2>1;
}

/** Dynamic bodies can be sampled after collision correction, so accept both a swept
 * central crossing and a moving body already within the usable central opening.
 * Reject lateral housing approaches and bodies too wide for the physical gap.
 */
export function dynamicPortalSweptEntry(portal: Portal, fromX: number, fromY: number, toX: number, toY: number, radius: number, vx = toX - fromX, vy = toY - fromY): boolean {
    if (!Number.isFinite(radius) || radius <= 0 || radius >= PORTAL_COLLIDER.entranceHalfWidth) return false;
    const a = portalLocal(portal, fromX, fromY);
    const b = portalLocal(portal, toX, toY);
    const velocity = portalLocalVelocity(portal, vx, vy);
    const clearance = PORTAL_COLLIDER.entranceHalfWidth - radius;
    const normal = Math.abs(velocity.y);
    if (normal < PORTAL_DYNAMIC_INTERACTION.insideEntryMinimumNormalSpeed || normal < Math.abs(velocity.x) * 0.35) return false;
    const swept = sweptUsableCentralEntry(portal, fromX, fromY, toX, toY, radius);
    if (swept) return true;
    // A solver may move a body back after its center entered the vortex. Allow
    // continued inward travel while the footprint remains in the open corridor.
    const insideCenter = (b.x / D.centralRadiusX) ** 2 + (b.y / D.centralRadiusY) ** 2 <= 1;
    return insideCenter && Math.abs(b.x) <= clearance &&
        (Math.abs(b.y) <= Math.abs(a.y) + 1 || Math.abs(b.y) < D.centralRadiusY * 0.5);
}

function portalLocalVelocity(portal: Portal, vx: number, vy: number): { x: number; y: number } {
    const c = Math.cos(portal.getRotation()), s = Math.sin(portal.getRotation());
    return { x: vx * c + vy * s, y: -vx * s + vy * c };
}

/** P4-A exit placement with the object's own collision footprint. */
export function dynamicPortalExit(portal: Portal, radius: number, side: 1 | -1): { x: number; y: number } {
    return portalWorld(portal, 0, side * (Math.max(D.outerRadiusY, PORTAL_COLLIDER.arcRadiusY + PORTAL_COLLIDER.arcThickness) + radius + PORTAL_DYNAMIC_INTERACTION.exitClearance + PORTAL_DYNAMIC_INTERACTION.exitForwardOffset));
}

/** Release destination lock only once the whole footprint is outside the vortex. */
export function dynamicPortalInteractionCleared(portal: Portal, x: number, y: number, radius: number): boolean {
    const p = portalLocal(portal, x, y);
    const rx = D.outerRadiusX + radius + PORTAL_DYNAMIC_INTERACTION.releaseMargin;
    const ry = D.outerRadiusY + radius + PORTAL_DYNAMIC_INTERACTION.releaseMargin;
    return (p.x / rx) ** 2 + (p.y / ry) ** 2 > 1;
}
