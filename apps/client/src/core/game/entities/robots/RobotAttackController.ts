export type RobotAttackPhase = "IDLE" | "ATTACKING" | "COMPLETE";

export interface RobotAttackSnapshot {
    readonly phase: RobotAttackPhase;
    readonly elapsedSeconds: number;
    readonly remainingSeconds: number;
    readonly durationSeconds: number;
    readonly targetId: string | null;
}

/**
 * R-6 generic attack-state timer.
 *
 * This controller deliberately owns no elemental gameplay. It only commits a
 * robot to a locked target for a fixed duration and reports completion.
 */
export class RobotAttackController {
    private phase: RobotAttackPhase = "IDLE";
    private elapsedSeconds = 0;
    private targetId: string | null = null;
    private completedTargetId: string | null = null;

    public constructor(private readonly durationSeconds: number) {}

    public start(targetId: string): void {
        if (this.phase === "ATTACKING" && this.targetId === targetId) return;
        this.phase = "ATTACKING";
        this.elapsedSeconds = 0;
        this.targetId = targetId;
    }

    public update(deltaTime: number): boolean {
        if (this.phase !== "ATTACKING") return false;
        this.elapsedSeconds = Math.min(this.durationSeconds, this.elapsedSeconds + Math.max(0, deltaTime));
        if (this.elapsedSeconds < this.durationSeconds) return false;
        this.phase = "COMPLETE";
        this.completedTargetId = this.targetId;
        return true;
    }

    /** Prevent an immediately completed target from retriggering every frame. */
    public isSuppressed(targetId: string): boolean { return this.completedTargetId === targetId; }

    /** Once the completed target leaves perception, it may be acquired again later. */
    public releaseSuppressionIfAbsent(perceivedTargetId: string | null): void {
        if (this.completedTargetId && perceivedTargetId !== this.completedTargetId) this.completedTargetId = null;
    }

    public reset(): void {
        this.phase = "IDLE";
        this.elapsedSeconds = 0;
        this.targetId = null;
    }

    public getSnapshot(): RobotAttackSnapshot {
        return {
            phase: this.phase,
            elapsedSeconds: this.elapsedSeconds,
            remainingSeconds: Math.max(0, this.durationSeconds - this.elapsedSeconds),
            durationSeconds: this.durationSeconds,
            targetId: this.targetId,
        };
    }
}
