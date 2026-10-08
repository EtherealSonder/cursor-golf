import { SHOT_CAMERA_FOLLOW as T } from "../config/ShotCameraFollowDefinition";
import type { Camera } from "./Camera";
import type { Ball } from "../entities/Ball";

/** Tracks only successfully launched club shots, never ambient motion. */
export class ShotCameraFollowController {
    private active = false;
    private elapsed = 0;
    private slowElapsed = 0;
    private slowGraceElapsed = 0;
    private eligibleElapsed = 0;
    private completed = false;

    public begin(): void {
        this.active = true;
        this.completed = false;
        this.elapsed = 0;
        this.slowElapsed = 0;
        this.slowGraceElapsed = 0;
        this.eligibleElapsed = 0;
    }

    public reset(): void {
        this.active = false;
        this.completed = false;
        this.elapsed = 0;
        this.slowElapsed = 0;
        this.slowGraceElapsed = 0;
        this.eligibleElapsed = 0;
    }

    public isActive(): boolean { return this.active; }

    /** Consume the completion edge exactly once. */
    public consumeCompletion(): boolean {
        if (!this.completed) return false;
        this.completed = false;
        return true;
    }

    public update(dt: number, ball: Ball | null, camera: Camera): void {
        if (!this.active) return;
        if (!ball) { this.finish(); return; }
        const step = Math.max(0, Math.min(0.05, dt));
        this.elapsed += step;
        camera.followWorldPoint(ball.getX(), ball.getY(), step, T.responseRate);
        const speed = ball.getSpeed();
        if (speed <= T.settleSpeed) {
            this.slowElapsed += step;
            this.slowGraceElapsed += step;
        } else {
            this.slowElapsed = 0;
            this.slowGraceElapsed = 0;
        }
        // Ball already applies hysteresis and settling to club eligibility.
        this.eligibleElapsed = ball.canInteractWithClub()
            ? this.eligibleElapsed + step
            : 0;
        if (this.elapsed >= T.minimumFollowDuration &&
            (this.eligibleElapsed >= T.eligibilityConfirmationDuration ||
             this.slowGraceElapsed >= T.lowSpeedGrace)) {
            this.finish();
        }
    }

    private finish(): void {
        this.active = false;
        this.completed = true;
    }
}
