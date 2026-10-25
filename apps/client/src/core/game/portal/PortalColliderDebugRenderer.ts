import { Container, Graphics } from "pixi.js";
import { PORTAL_COLLIDER } from "../config/PortalPhysicsDefinition";
import { createPortalCollisionGeometry } from "./PortalCollisionGeometry";

/** P2-A debug-only visualization. Never registers colliders with physics. */
export function createPortalColliderDebugRenderer(): Container {
    const root = new Container();
    root.label = "PortalColliderDebug:P2-A";
    const g = new Graphics();
    const geometry = createPortalCollisionGeometry();
    for (const s of geometry.housing) {
        // The capsule perimeter is represented by a thick centerline with rounded ends.
        g.moveTo(s.x1, s.y1).lineTo(s.x2, s.y2)
            .stroke({width: s.radius * 2, color: PORTAL_COLLIDER.debugColor, alpha: 0.34, cap: "round"});
        g.moveTo(s.x1, s.y1).lineTo(s.x2, s.y2)
            .stroke({width: 1.6, color: PORTAL_COLLIDER.debugColor, alpha: 1});
    }
    for (const h of geometry.handles) {
        g.rect(h.x - h.width / 2, h.y - h.height / 2, h.width, h.height)
            .fill({color: PORTAL_COLLIDER.debugHandleColor, alpha: 0.16})
            .stroke({width: 2, color: PORTAL_COLLIDER.debugHandleColor, alpha: 0.95});
    }
    g.circle(0, 0, 3).fill(PORTAL_COLLIDER.debugCenterColor);
    root.addChild(g);
    return root;
}
