import type { RobotNavigationPoint } from "./RobotNavigationQuery";

export type RobotStuckRecoveryPhase =
    | "IDLE"
    | "SHRINKING"
    | "RELOCATE"
    | "GROWING";

export interface RobotStuckRecoveryUpdate {
    readonly active: boolean;
    readonly visualScale: number;
    readonly relocationRequested: boolean;
    readonly completed: boolean;
}

/**
 * Shared presentation/state controller for last-resort Robot stuck recovery.
 * Navigation owns the safe-position query. Robot owns the actual transform.
 */
export class RobotStuckRecoveryController {
    private phase: RobotStuckRecoveryPhase = "IDLE";
    private elapsedSeconds = 0;
    private recoveryPoint: RobotNavigationPoint | null = null;

    public constructor(
        private readonly shrinkSeconds: number,
        private readonly growSeconds: number,
    ) { }

    public isActive(): boolean {
        return this.phase !== "IDLE";
    }

    public begin(recoveryPoint: RobotNavigationPoint): boolean {
        if (this.isActive()) return false;
        this.recoveryPoint = recoveryPoint;
        this.phase = "SHRINKING";
        this.elapsedSeconds = 0;
        return true;
    }

    public getRecoveryPoint(): RobotNavigationPoint | null {
        return this.recoveryPoint;
    }

    public markRelocated(): void {
        if (this.phase !== "RELOCATE") return;
        this.phase = "GROWING";
        this.elapsedSeconds = 0;
    }

    public update(deltaTime: number): RobotStuckRecoveryUpdate {
        const dt = Number.isFinite(deltaTime) ? Math.max(0, deltaTime) : 0;

        if (this.phase === "IDLE") {
            return { active: false, visualScale: 1, relocationRequested: false, completed: false };
        }

        if (this.phase === "SHRINKING") {
            this.elapsedSeconds += dt;
            const duration = Math.max(0.001, this.shrinkSeconds);
            const progress = Math.min(1, this.elapsedSeconds / duration);
            if (progress >= 1) {
                this.phase = "RELOCATE";
                this.elapsedSeconds = 0;
                return { active: true, visualScale: 0, relocationRequested: true, completed: false };
            }
            return { active: true, visualScale: 1 - progress, relocationRequested: false, completed: false };
        }

        if (this.phase === "RELOCATE") {
            return { active: true, visualScale: 0, relocationRequested: true, completed: false };
        }

        this.elapsedSeconds += dt;
        const duration = Math.max(0.001, this.growSeconds);
        const progress = Math.min(1, this.elapsedSeconds / duration);
        if (progress >= 1) {
            this.reset();
            return { active: false, visualScale: 1, relocationRequested: false, completed: true };
        }
        return { active: true, visualScale: progress, relocationRequested: false, completed: false };
    }

    public reset(): void {
        this.phase = "IDLE";
        this.elapsedSeconds = 0;
        this.recoveryPoint = null;
    }
}
