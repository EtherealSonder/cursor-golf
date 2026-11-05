import { createRotatingAttachment } from "../ball-effects/StickyBallRotatingAttachmentAdapter";
/** Optional deterministic regression for rotating attachment coordinates and velocity. */
export function assertStickyRotatingAttachmentValidation(): void {
    let angle = 0;
    const source = {
        getCenter: () => ({ x: 10, y: 20 }),
        getAngle: () => angle,
        getAngularVelocity: () => 2,
    };
    const target = createRotatingAttachment("test", source, 20, 20);
    angle = Math.PI / 2;
    const anchor = target.getAnchor();
    const velocity = target.getReleaseVelocity?.();
    if (!anchor || Math.abs(anchor.x - 10) > 1e-7 || Math.abs(anchor.y - 30) > 1e-7 ||
        !velocity || Math.abs(velocity.x + 20) > 1e-7 || Math.abs(velocity.y) > 1e-7) {
        throw new Error("Sticky rotating anchor or tangential velocity regression");
    }
}
