import type { StickyAttachmentTarget } from "./StickyBallAttachmentController";

export interface RotatingAnchorSource {
    getCenter(): { x: number; y: number };
    getAngle(): number;
    getAngularVelocity(): number;
}
/** A ball-center anchor stored in the mechanism's rotating local coordinates. */
export function createRotatingAttachment(id: string, source: RotatingAnchorSource,
    x: number, y: number, rotates = true): StickyAttachmentTarget {
    const center = source.getCenter();
    const angle = source.getAngle();
    const dx = x - center.x, dy = y - center.y;
    const localX = dx * Math.cos(angle) + dy * Math.sin(angle);
    const localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
    const getAnchor = () => {
        const c = source.getCenter();
        const a = rotates ? source.getAngle() : angle;
        return { x: c.x + localX * Math.cos(a) - localY * Math.sin(a),
            y: c.y + localX * Math.sin(a) + localY * Math.cos(a) };
    };
    return {
        id, kind: "rotating", getAnchor,
        getReleaseVelocity: () => {
            const anchor = getAnchor(), c = source.getCenter();
            const omega = rotates ? source.getAngularVelocity() : 0;
            return { x: -omega * (anchor.y - c.y), y: omega * (anchor.x - c.x) };
        },
    };
}
