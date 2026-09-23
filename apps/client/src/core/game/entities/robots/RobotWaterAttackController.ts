import { createHoseWaterSourceDefinition } from "../../config/HoseWaterDefinition";
import type { WaterSource } from "../../environment/WaterSource";
import type { WaterSourceSystem } from "../../environment/WaterSourceSystem";

export type RobotWaterAttackPhase = "IDLE" | "WARNING" | "ATTACKING";

export interface RobotWaterAttackSnapshot {
    readonly phase: RobotWaterAttackPhase;
    readonly warningElapsedSeconds: number;
    readonly warningRemainingSeconds: number;
    readonly warningDurationSeconds: number;
    readonly warningActive: boolean;
    readonly targetId: string | null;
}

/** Maps the shared Robot attack lifecycle onto the authoritative Hose Water source. */
export class RobotWaterAttackController {
    private readonly sourceId: string;
    private readonly ownerColliderId: string;
    private source: WaterSource | null = null;
    private phase: RobotWaterAttackPhase = "IDLE";
    private warningElapsedSeconds = 0;
    private targetId: string | null = null;
    private nozzleX = 0;
    private nozzleY = 0;

    public constructor(
        robotId: string,
        private readonly waterSourceSystem: WaterSourceSystem,
        private readonly outletOffset: number,
        private readonly warningDurationSeconds: number,
    ) {
        this.sourceId = `${robotId}-hose-water`;
        this.ownerColliderId = `${robotId}-collider`;
    }

    public initialize(robotX: number, robotY: number, rotationRadians: number): void {
        if (this.source) throw new Error(`Robot Water source '${this.sourceId}' is already initialized.`);
        const outlet = this.calculateOutlet(robotX, robotY, rotationRadians);
        this.nozzleX = outlet.x;
        this.nozzleY = outlet.y;
        this.source = this.waterSourceSystem.addSource(
            createHoseWaterSourceDefinition(this.sourceId, outlet.x, outlet.y, rotationRadians, false),
        );
    }

    public startWarning(targetId: string): boolean {
        if (!this.source || this.phase !== "IDLE") return false;
        this.phase = "WARNING";
        this.warningElapsedSeconds = 0;
        this.targetId = targetId;
        this.source.setEnabled(false);
        return true;
    }

    public updateWarning(deltaTime: number): boolean {
        if (this.phase !== "WARNING") return false;
        this.warningElapsedSeconds = Math.min(this.warningDurationSeconds, this.warningElapsedSeconds + Math.max(0, deltaTime));
        if (this.warningElapsedSeconds < this.warningDurationSeconds) return false;
        this.phase = "ATTACKING";
        return true;
    }

    public cancelWarning(): void {
        if (this.phase !== "WARNING") return;
        this.phase = "IDLE";
        this.warningElapsedSeconds = 0;
        this.targetId = null;
        this.source?.setEnabled(false);
    }

    public getSnapshot(): RobotWaterAttackSnapshot {
        return {
            phase: this.phase,
            warningElapsedSeconds: this.phase === "WARNING" ? this.warningElapsedSeconds : 0,
            warningRemainingSeconds: this.phase === "WARNING" ? Math.max(0, this.warningDurationSeconds - this.warningElapsedSeconds) : 0,
            warningDurationSeconds: this.warningDurationSeconds,
            warningActive: this.phase === "WARNING",
            targetId: this.targetId,
        };
    }

    public update(robotX: number, robotY: number, rotationRadians: number, attacking: boolean): void {
        if (!this.source) return;
        const outlet = this.calculateOutlet(robotX, robotY, rotationRadians);
        this.nozzleX = outlet.x;
        this.nozzleY = outlet.y;
        this.source.setPosition(outlet.x, outlet.y);
        this.source.setDirectionRadians(rotationRadians);
        this.source.setEnabled(attacking);
        this.phase = attacking ? "ATTACKING" : (this.phase === "WARNING" ? "WARNING" : "IDLE");
    }

    public getWaterSourceId(): string { return this.sourceId; }
    public getOwnerColliderId(): string { return this.ownerColliderId; }
    /** Water commits to the full attack duration even after perception is lost. */
    public continuesAttackAfterTargetLoss(): boolean { return true; }
    public getNozzlePosition(): { readonly x: number; readonly y: number } { return { x: this.nozzleX, y: this.nozzleY }; }
    public getNozzleDirectionRadians(): number { return this.source?.getDirectionRadians() ?? 0; }
    public getWaterSource(): WaterSource | null { return this.source; }
    public isWaterEnabled(): boolean { return this.source?.isEnabled() ?? false; }
    public isJetActive(): boolean { return this.isWaterEnabled() && this.phase === "ATTACKING"; }
    /** Robot nozzle is intentionally a much stronger gameplay hazard than the hand Hose. */
    public getBallForceMultiplier(): number { return 3.2; }
    public getJetForceMultiplier(): number { return 3.2; }
    /** Robot jets only affect the Ball where authoritative airborne Water has actually reached. */
    public requiresAuthoritativeJetReach(): boolean { return true; }
    /** Carry and terminally capture the Ball at the live ground-impact/deposition point. */
    public shouldTransportBallToImpactPoint(): boolean { return true; }

    public destroy(): void {
        if (this.source) this.waterSourceSystem.removeSource(this.sourceId);
        this.source = null;
        this.phase = "IDLE";
        this.warningElapsedSeconds = 0;
        this.targetId = null;
    }

    private calculateOutlet(robotX: number, robotY: number, rotationRadians: number) {
        /*
         * RobotDefinition.waterOutletOffset was authored against the outer end
         * of the tube artwork. The Water ribbon has finite width, so beginning
         * its centreline exactly at that outer edge leaves a visible air gap.
         * Pull the authoritative source a small distance back inside the dark
         * nozzle lip. Rendering and physics both consume this same position.
         */
        const nozzleLipOverlap = 14;
        const sourceOffset = Math.max(0, this.outletOffset - nozzleLipOverlap);
        return {
            x: robotX + Math.cos(rotationRadians) * sourceOffset,
            y: robotY + Math.sin(rotationRadians) * sourceOffset,
        };
    }
}
