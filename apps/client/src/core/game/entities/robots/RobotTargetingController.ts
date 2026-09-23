import type { RobotInteractionEntry } from "./RobotInteractionRegistry";

export type RobotTargetingPhase = "NONE" | "DETECTING" | "TARGET_LOCKED";

export interface RobotTargetingUpdate {
    readonly phase: RobotTargetingPhase;
    readonly target: RobotInteractionEntry | null;
    readonly desiredAngle: number | null;
    readonly headingErrorDegrees: number;
    readonly targetLossSeconds: number;
}

/**
 * R-5 target acquisition and orientation state.
 *
 * R-4 remains authoritative for perception. This controller retains the
 * selected target briefly when visibility flickers, computes the target
 * heading, and reports when the nozzle is aligned closely enough to lock.
 */
export class RobotTargetingController {
    private target: RobotInteractionEntry | null = null;
    private phase: RobotTargetingPhase = "NONE";
    private targetLossSeconds = 0;

    public constructor(
        private readonly alignmentToleranceDegrees: number,
        private readonly targetLossGraceSeconds: number,
        private readonly isTargetValid: (target: RobotInteractionEntry) => boolean = () => true,
    ) {}

    public update(
        deltaTime: number,
        perceivedTarget: RobotInteractionEntry | null,
        originX: number,
        originY: number,
        currentRotation: number,
    ): RobotTargetingUpdate {
        if (perceivedTarget) {
            if (!this.target || this.target.id !== perceivedTarget.id) {
                this.target = perceivedTarget;
                this.phase = "DETECTING";
            }
            this.targetLossSeconds = 0;
        } else if (this.target) {
            this.targetLossSeconds += Math.max(0, deltaTime);
            if (this.targetLossSeconds > this.targetLossGraceSeconds) this.clear();
        }

        if (!this.target) return this.snapshot(null, 0);

        // A World-owned target can be unregistered while this controller still
        // retains it for the target-loss grace window. Never dereference an
        // entry that is no longer present in the authoritative interaction set.
        if (!this.isTargetValid(this.target)) {
            this.clear();
            return this.snapshot(null, 0);
        }

        const dx = this.target.getX() - originX;
        const dy = this.target.getY() - originY;
        const desiredAngle = Math.atan2(dy, dx);
        const errorRadians = this.shortestAngle(desiredAngle - currentRotation);
        const errorDegrees = Math.abs(errorRadians) * 180 / Math.PI;
        this.phase = errorDegrees <= this.alignmentToleranceDegrees ? "TARGET_LOCKED" : "DETECTING";
        return this.snapshot(desiredAngle, errorDegrees);
    }

    public clear(): void {
        this.target = null;
        this.phase = "NONE";
        this.targetLossSeconds = 0;
    }

    public getTarget(): RobotInteractionEntry | null { return this.target; }
    public getPhase(): RobotTargetingPhase { return this.phase; }
    public getTargetLossSeconds(): number { return this.targetLossSeconds; }

    private snapshot(desiredAngle: number | null, headingErrorDegrees: number): RobotTargetingUpdate {
        return {
            phase: this.phase,
            target: this.target,
            desiredAngle,
            headingErrorDegrees,
            targetLossSeconds: this.targetLossSeconds,
        };
    }

    private shortestAngle(angle: number): number { return Math.atan2(Math.sin(angle), Math.cos(angle)); }
}
