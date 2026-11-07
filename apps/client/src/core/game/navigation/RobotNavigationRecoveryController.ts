import { ROBOT_NAVIGATION_RECOVERY_DEFINITION as D } from "../config/RobotNavigationRecoveryDefinition";
export type RobotRecoveryStage = "NORMAL" | "REPLAN" | "ESCAPE" | "ABANDON" | "RELOCATE";
/** Cooldown and failure budget for recovery decisions. Does not move entities. */
export class RobotNavigationRecoveryController {
    private cooldown = 0;
    private repeatedRoutes = 0;
    private lastRouteSignature = "";
    private failures = 0;
    private relocations = 0;
    private stage: RobotRecoveryStage = "NORMAL";
    private reason = "none";
    public update(dt: number): void { this.cooldown = Math.max(0, this.cooldown - Math.max(0, dt)); }
    public canReplan(): boolean { return this.cooldown <= 0; }
    public request(reason: string): boolean {
        if (!this.canReplan()) return false;
        this.cooldown = D.replanCooldownSeconds;
        this.reason = reason;
        this.stage = "REPLAN";
        return true;
    }
    /** Returns false when identical replans have exhausted the retry budget. */
    public acceptRoute(signature: string, limit: number): boolean {
        this.repeatedRoutes = signature === this.lastRouteSignature ? this.repeatedRoutes + 1 : 0;
        this.lastRouteSignature = signature;
        return this.repeatedRoutes < limit;
    }
    public clearRouteHistory(): void { this.lastRouteSignature = ""; this.repeatedRoutes = 0; }
    public success(): void { this.failures = 0; this.stage = "NORMAL"; }
    public failed(): RobotRecoveryStage {
        this.failures++;
        this.stage = this.failures >= D.relocationAfterFailures ? "RELOCATE" : "ABANDON";
        return this.stage;
    }
    public escape(): void { this.stage = "ESCAPE"; }
    public relocated(): void { this.relocations++; this.failures = 0; this.stage = "NORMAL"; }
    public reset(): void { this.cooldown = 0; this.failures = 0; this.stage = "NORMAL"; this.reason = "none"; this.clearRouteHistory(); }
    public snapshot(): { stage: RobotRecoveryStage; reason: string; failures: number; relocations: number; cooldown: number; repeatedRoutes: number } {
        return { stage: this.stage, reason: this.reason, failures: this.failures, relocations: this.relocations, cooldown: this.cooldown, repeatedRoutes: this.repeatedRoutes };
    }
}
