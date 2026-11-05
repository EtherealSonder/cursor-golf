import type { Ball } from "../entities/Ball";

/** P-4C: shared bumper contact gate. Bumpers remain fixed attachment targets. */
export class StickyBallBumperCollisionAdapter {
    public static tryAttach(ball: Ball, bumperId: string, normalX: number, normalY: number): boolean {
        return ball.tryAttachToStickyBumper(bumperId, normalX, normalY);
    }
}
