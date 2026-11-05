import type { StickyAttachmentTarget } from "./StickyBallAttachmentController";
import type { Robot } from "../entities/robots/Robot";

/** P-4E: preserve the exact ball-center contact in robot-local coordinates. */
export function createRobotStickyAttachment(robot: Robot, x: number, y: number): StickyAttachmentTarget & { readonly hostRobot: Robot } {
    const initialAngle = robot.getRotationRadians();
    const dx = x - robot.getX();
    const dy = y - robot.getY();
    const localX = dx * Math.cos(initialAngle) + dy * Math.sin(initialAngle);
    const localY = -dx * Math.sin(initialAngle) + dy * Math.cos(initialAngle);
    return {
        id: `sticky-robot:${robot.getDefinition().id}`,
        kind: "robot",
        hostRobot: robot,
        getAnchor: () => {
            if (robot.isDestroyed() || !robot.canPortalTeleport()) return null;
            const angle = robot.getRotationRadians();
            return {
                x: robot.getX() + localX * Math.cos(angle) - localY * Math.sin(angle),
                y: robot.getY() + localX * Math.sin(angle) + localY * Math.cos(angle),
            };
        },
        // A robot timeout drops the ball rather than flinging it.
        getReleaseVelocity: () => ({ x: 0, y: 0 }),
    };
}
