export type RobotAttackPhase = "IDLE" | "ATTACKING" | "COOLDOWN";

export interface RobotAttackSnapshot {
    readonly phase: RobotAttackPhase;
    readonly elapsedSeconds: number;
    readonly remainingSeconds: number;
    readonly durationSeconds: number;
    readonly cooldownElapsedSeconds: number;
    readonly cooldownRemainingSeconds: number;
    readonly cooldownDurationSeconds: number;
    readonly ready: boolean;
    readonly targetId: string | null;
}

/**
 * Generic robot attack lifecycle.
 *
 * R-6 owns the fixed attack commitment. R-7 extends the same controller with
 * attack availability cooldown. Cooldown never owns locomotion, so a robot is
 * free to wait, turn, wander and avoid obstacles while its attack recharges.
 */
export class RobotAttackController {
    private phase: RobotAttackPhase = "IDLE";
    private elapsedSeconds = 0;
    private cooldownElapsedSeconds = 0;
    private targetId: string | null = null;

    public constructor(
        private readonly durationSeconds: number,
        private readonly cooldownDurationSeconds: number,
    ) {}

    public start(targetId: string): boolean {
        if (!this.isReady()) return false;
        this.phase = "ATTACKING";
        this.elapsedSeconds = 0;
        this.cooldownElapsedSeconds = 0;
        this.targetId = targetId;
        return true;
    }

    /** Advances only the active attack and returns true on the completion frame. */
    public updateAttack(deltaTime: number): boolean {
        if (this.phase !== "ATTACKING") return false;
        this.elapsedSeconds = Math.min(this.durationSeconds, this.elapsedSeconds + Math.max(0, deltaTime));
        if (this.elapsedSeconds < this.durationSeconds) return false;

        this.phase = "COOLDOWN";
        this.cooldownElapsedSeconds = 0;
        this.targetId = null;
        return true;
    }

    /** Cooldown runs independently while the robot resumes normal navigation. */
    public updateCooldown(deltaTime: number): void {
        if (this.phase !== "COOLDOWN") return;
        this.cooldownElapsedSeconds = Math.min(
            this.cooldownDurationSeconds,
            this.cooldownElapsedSeconds + Math.max(0, deltaTime),
        );
        if (this.cooldownElapsedSeconds < this.cooldownDurationSeconds) return;

        this.phase = "IDLE";
        this.cooldownElapsedSeconds = 0;
        this.elapsedSeconds = 0;
    }

    public isReady(): boolean { return this.phase === "IDLE"; }
    public isCoolingDown(): boolean { return this.phase === "COOLDOWN"; }

    /** Cancels an interrupted attack without starting cooldown. */
    public cancelAttack(): void {
        if (this.phase !== "ATTACKING") return;
        this.phase = "IDLE";
        this.elapsedSeconds = 0;
        this.targetId = null;
    }

    public reset(): void {
        this.phase = "IDLE";
        this.elapsedSeconds = 0;
        this.cooldownElapsedSeconds = 0;
        this.targetId = null;
    }

    public getSnapshot(): RobotAttackSnapshot {
        const attacking = this.phase === "ATTACKING";
        const coolingDown = this.phase === "COOLDOWN";
        return {
            phase: this.phase,
            elapsedSeconds: attacking ? this.elapsedSeconds : 0,
            remainingSeconds: attacking ? Math.max(0, this.durationSeconds - this.elapsedSeconds) : 0,
            durationSeconds: this.durationSeconds,
            cooldownElapsedSeconds: coolingDown ? this.cooldownElapsedSeconds : 0,
            cooldownRemainingSeconds: coolingDown
                ? Math.max(0, this.cooldownDurationSeconds - this.cooldownElapsedSeconds)
                : 0,
            cooldownDurationSeconds: this.cooldownDurationSeconds,
            ready: this.isReady(),
            targetId: this.targetId,
        };
    }
}
