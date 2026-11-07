import { ROBOT_NAVIGATION_RECOVERY_DEFINITION as D } from "../config/RobotNavigationRecoveryDefinition";
/** Only externally integrated displacement is observed; ordinary walking is excluded. */
export class RobotDisplacementTracker {
    private accumulated = 0;
    public recordExternalMotion(dx: number, dy: number): boolean {
        if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;
        this.accumulated += Math.hypot(dx, dy);
        if (this.accumulated < D.displacementThreshold) return false;
        this.accumulated = 0;
        return true;
    }
    public reset(): void { this.accumulated = 0; }
}
