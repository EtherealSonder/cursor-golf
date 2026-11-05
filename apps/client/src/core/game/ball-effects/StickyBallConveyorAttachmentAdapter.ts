import type { ConveyorBelt } from "../entities/mechanisms/ConveyorBelt";
import type { StickyAttachmentTarget } from "./StickyBallAttachmentController";

/** A belt transports the ball at its prescribed speed, not by acceleration. */
export function createConveyorStickyAttachment(belt: ConveyorBelt, x: number, y: number): StickyAttachmentTarget {
    const direction = belt.getTransportDirection();
    const speed = belt.getTransportProfile().animationSpeed;
    const velocity = { x: direction.x * speed, y: direction.y * speed };
    let anchor = { x, y };
    let finished = false;

    return {
        id: `sticky-conveyor:${belt.getId()}`,
        kind: "conveyor",
        // Stop at the far end, rather than waiting for the ball to be outside
        // and allowing an extra frame of transport / ordinary conveyor impulse.
        getAnchor: () => {
            if (finished) return null;
            const dx = anchor.x - belt.getX();
            const dy = anchor.y - belt.getY();
            const forward = dx * direction.x + dy * direction.y;
            const sideways = -dx * direction.y + dy * direction.x;
            return forward < belt.getFootprintWidth() / 2 &&
                Math.abs(sideways) < belt.getFootprintHeight() / 2 ? anchor : null;
        },
        getReleaseVelocity: () => velocity,
        // The World advances this anchor exactly once per simulation step.
        advance: (dt: number) => {
            const next = { x: anchor.x + velocity.x * dt, y: anchor.y + velocity.y * dt };
            const dx = next.x - belt.getX();
            const dy = next.y - belt.getY();
            const forward = dx * direction.x + dy * direction.y;
            const end = belt.getFootprintWidth() / 2;
            // Keep the last attached point on the belt edge; release next update.
            if (forward >= end) {
                const overshoot = forward - end;
                anchor = { x: next.x - direction.x * overshoot, y: next.y - direction.y * overshoot };
                finished = true;
            } else anchor = next;
        },
    } as StickyAttachmentTarget & { advance(dt: number): void };
}
