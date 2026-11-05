import type { Portal } from "../portal/Portal";
import type { StickyAttachmentTarget } from "./StickyBallAttachmentController";

/** Handles rotate about a fixed pivot. Adhesion lasts until the next shot. */
export function createPortalHandleStickyAttachment(portal: Portal, x: number, y: number, handle: "leftHandle" | "rightHandle"): StickyAttachmentTarget {
    const angle = portal.getRotation();
    const dx = x - portal.getX(), dy = y - portal.getY();
    const c = Math.cos(angle), s = Math.sin(angle);
    const lx = c * dx + s * dy, ly = -s * dx + c * dy;
    return {
        id: `sticky-portal-handle:${portal.id}:${handle}`,
        kind: "static",
        getAnchor: () => {
            if (!portal.isActive()) return null;
            const a = portal.getRotation(), ca = Math.cos(a), sa = Math.sin(a);
            return { x: portal.getX() + ca * lx - sa * ly, y: portal.getY() + sa * lx + ca * ly };
        },
    };
}
