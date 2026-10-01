import {
    DEFAULT_BALL_DEATH_TRANSITION_DEFINITION,
} from "../config/BallDeathTransitionDefinition";
import type {
    BallDeathTransitionDefinition,
} from "../config/BallDeathTransitionDefinition";

export type BallDeathTransitionState =
    | "idle"
    | "cameraFocus"
    | "slowMotion"
    | "closing"
    | "lifeLoss"
    | "relocating"
    | "opening"
    | "complete";

export interface BallDeathTransitionSnapshot {
    readonly state: BallDeathTransitionState;
    readonly progress: number;
    readonly retryRequested: boolean;
}

export class BallDeathTransitionController {
    private state: BallDeathTransitionState = "idle";
    private elapsedSeconds = 0;
    private retryRequested = false;

    public constructor(
        private readonly definition:
            BallDeathTransitionDefinition =
            DEFAULT_BALL_DEATH_TRANSITION_DEFINITION,
    ) {}

    public begin(): boolean {
        if (this.isActive()) return false;
        this.state = "cameraFocus";
        this.elapsedSeconds = 0;
        this.retryRequested = false;
        return true;
    }

    public update(deltaTime: number): BallDeathTransitionSnapshot {
        const dt = Math.max(0, deltaTime);

        if (this.state === "cameraFocus") {
            this.elapsedSeconds += dt;
            if (this.elapsedSeconds >= this.definition.cameraFocusDurationSeconds) {
                this.state = "slowMotion";
                this.elapsedSeconds = 0;
            }
        } else if (this.state === "slowMotion") {
            this.elapsedSeconds += dt;
            if (this.elapsedSeconds >= this.definition.slowMotionDurationSeconds) {
                this.state = "closing";
                this.elapsedSeconds = 0;
            }
        } else if (this.state === "closing") {
            this.elapsedSeconds += dt;
            if (this.elapsedSeconds >= this.definition.closeDurationSeconds) {
                this.state = "lifeLoss";
                this.elapsedSeconds = 0;
            }
        } else if (this.state === "lifeLoss") {
            this.elapsedSeconds += dt;
            if (this.elapsedSeconds >= this.definition.lifeLossDurationSeconds) {
                this.state = "relocating";
                this.elapsedSeconds = 0;
                this.retryRequested = true;
            }
        } else if (this.state === "relocating") {
            this.elapsedSeconds += dt;
            if (this.elapsedSeconds >= this.definition.relocateDurationSeconds) {
                this.state = "opening";
                this.elapsedSeconds = 0;
            }
        } else if (this.state === "opening") {
            this.elapsedSeconds += dt;
            if (this.elapsedSeconds >= this.definition.openDurationSeconds) {
                this.state = "complete";
                this.elapsedSeconds = 0;
            }
        }

        return this.getSnapshot();
    }

    /** Called once after the retry state has been restored at relocation start. */
    public acknowledgeRetry(): void {
        if (this.state !== "relocating") return;
        this.retryRequested = false;
    }

    public finish(): void {
        if (this.state !== "complete") return;
        this.reset();
    }

    public reset(): void {
        this.state = "idle";
        this.elapsedSeconds = 0;
        this.retryRequested = false;
    }

    public isCameraFocusActive(): boolean {
        return this.state === "cameraFocus";
    }

    public isSlowMotionActive(): boolean {
        return this.state === "slowMotion";
    }

    public isLifeLossActive(): boolean {
        return this.state === "lifeLoss";
    }

    public getGameplayTimeScale(): number {
        return (
            this.state === "cameraFocus" ||
            this.state === "slowMotion"
        )
            ? this.definition.feedbackTimeScale
            : 0;
    }

    public isActive(): boolean {
        return this.state !== "idle";
    }

    public getSnapshot(): BallDeathTransitionSnapshot {
        let progress = 0;
        if (this.state === "cameraFocus") {
            progress = this.normalized(
                this.elapsedSeconds,
                this.definition.cameraFocusDurationSeconds,
            );
        } else if (this.state === "slowMotion") {
            progress = this.normalized(
                this.elapsedSeconds,
                this.definition.slowMotionDurationSeconds,
            );
        } else if (this.state === "closing") {
            progress = this.normalized(
                this.elapsedSeconds,
                this.definition.closeDurationSeconds,
            );
        } else if (this.state === "lifeLoss") {
            progress = this.normalized(
                this.elapsedSeconds,
                this.definition.lifeLossDurationSeconds,
            );
        } else if (this.state === "relocating") {
            progress = this.normalized(
                this.elapsedSeconds,
                this.definition.relocateDurationSeconds,
            );
        } else if (this.state === "opening") {
            progress = this.normalized(
                this.elapsedSeconds,
                this.definition.openDurationSeconds,
            );
        } else if (this.state === "complete") {
            progress = 1;
        }

        return Object.freeze({
            state: this.state,
            progress,
            retryRequested: this.retryRequested,
        });
    }

    private normalized(elapsed: number, duration: number): number {
        return Math.min(1, elapsed / Math.max(0.001, duration));
    }
}
