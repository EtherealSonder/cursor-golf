import type { Portal } from "./Portal";
import type { CourseEnvironmentBoundary } from "../level/CourseEnvironmentBoundary";
import { PORTAL_COLLIDER } from "../config/PortalPhysicsDefinition";
import { getPairedPortal } from "./PortalPairController";

/** P5: pair-atomic deactivation and synchronized presentation-only shrinking. */
export class PortalPairVoidController {
    private readonly pending = new Map<string, { pair: readonly [Portal, Portal]; elapsed: number }>();
    public constructor(
        private readonly boundary: CourseEnvironmentBoundary,
        private readonly durationSeconds: number,
    ) {}
    public update(dt: number, portals: readonly Portal[], deactivate: (portal: Portal) => void,
        scale: (portal: Portal, value: number) => void, remove: (portal: Portal) => void): void {
        for (const portal of portals) {
            if (!portal.isActive()) continue;
            if (!this.boundary.isFootprintMostlyOutside({ kind: "rectangle", x: portal.getX(), y: portal.getY(),
                width: PORTAL_COLLIDER.width, height: PORTAL_COLLIDER.height, rotationRadians: portal.getRotation() }, 0.8)) continue;
            const partner = getPairedPortal(portals, portal);
            if (!partner || !partner.isActive()) continue;
            const key = [portal.id, partner.id].sort().join("|");
            if (this.pending.has(key)) continue;
            portal.beginVoidRemoval(); partner.beginVoidRemoval();
            // Immediately disable gameplay and physics before visual shrinking begins.
            deactivate(portal); deactivate(partner);
            this.pending.set(key, { pair: [portal, partner], elapsed: 0 });
        }
        const elapsedDt = Number.isFinite(dt) ? Math.max(0, dt) : 0;
        for (const [key, state] of this.pending) {
            state.elapsed += elapsedDt;
            const fraction = Math.min(1, state.elapsed / Math.max(0.001, this.durationSeconds));
            const remaining = (1 - fraction) ** 2;
            for (const portal of state.pair) scale(portal, remaining);
            if (fraction >= 1) {
                this.pending.delete(key);
                for (const portal of state.pair) { portal.finishVoidRemoval(); remove(portal); }
            }
        }
    }
    public clear(): void { this.pending.clear(); }
}
