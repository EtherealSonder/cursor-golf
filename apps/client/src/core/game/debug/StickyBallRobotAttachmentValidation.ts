import { createRobotStickyAttachment } from "../ball-effects/StickyBallRobotAttachmentAdapter";
import type { Robot } from "../entities/robots/Robot";

/** Lightweight geometry regression, callable from a test harness without a renderer. */
export function assertStickyRobotAttachmentGeometry(): void {
    let x = 100, y = 80, angle = 0, alive = true;
    const robot = {
        getX: () => x, getY: () => y, getRotationRadians: () => angle,
        getDefinition: () => ({ id: "test-robot-collider" }),
        isDestroyed: () => !alive, canPortalTeleport: () => alive,
    } as unknown as Robot;
    const target = createRobotStickyAttachment(robot, 120, 80);
    const first = target.getAnchor();
    if (!first || Math.abs(first.x - 120) > 0.00001 || Math.abs(first.y - 80) > 0.00001) throw new Error("Robot sticky initial anchor mismatch");
    x = 140; y = 110; angle = Math.PI / 2;
    const moved = target.getAnchor();
    if (!moved || Math.abs(moved.x - 140) > 0.00001 || Math.abs(moved.y - 130) > 0.00001) throw new Error("Robot sticky moving anchor mismatch");
    const velocity = target.getReleaseVelocity?.();
    if (!velocity || velocity.x !== 0 || velocity.y !== 0) throw new Error("Robot sticky timeout must not fling ball");
    alive = false;
    if (target.getAnchor() !== null) throw new Error("Robot sticky anchor must invalidate on removal");
}
