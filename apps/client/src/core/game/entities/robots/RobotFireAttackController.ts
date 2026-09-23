import { DEFAULT_DIRECTIONAL_FIRE_SOURCE_DEFINITION } from "../../config/DirectionalFireSourceDefinition";
import { FireSourceType } from "../../config/FireSourceDefinition";
import type { FireSourceSystem } from "../../environment/FireSourceSystem";

/**
 * R-8 Fire-specific attack bridge.
 *
 * The generic Robot/RobotAttackController remains authoritative for attack
 * timing. This controller only maps that state onto the existing directional
 * FireSource infrastructure, so Fire simulation and VFX stay unchanged.
 */
export type RobotFireAttackPhase = "IDLE" | "WARNING" | "ATTACKING";

export interface RobotFireAttackSnapshot {
    readonly phase: RobotFireAttackPhase;
    readonly warningElapsedSeconds: number;
    readonly warningRemainingSeconds: number;
    readonly warningDurationSeconds: number;
    readonly warningActive: boolean;
    readonly targetId: string | null;
}

export class RobotFireAttackController {
    private readonly sourceId: string;
    private initialized = false;
    private phase: RobotFireAttackPhase = "IDLE";
    private warningElapsedSeconds = 0;
    private targetId: string | null = null;

    public constructor(
        robotId: string,
        private readonly fireSourceSystem: FireSourceSystem,
        private readonly outletOffset: number,
        private readonly warningDurationSeconds: number,
    ) {
        this.sourceId = `${robotId}-directional-fire`;
    }

    public initialize(
        robotX: number,
        robotY: number,
        rotationRadians: number,
    ): void {
        if (this.initialized) {
            throw new Error(`Robot Fire source '${this.sourceId}' is already initialized.`);
        }

        const outlet = this.calculateOutlet(robotX, robotY, rotationRadians);
        const tuning = DEFAULT_DIRECTIONAL_FIRE_SOURCE_DEFINITION;

        this.fireSourceSystem.addSource({
            id: this.sourceId,
            type: FireSourceType.Directional,
            enabled: false,
            positionX: outlet.x,
            positionY: outlet.y,
            directionRadians: rotationRadians,
            length: tuning.length,
            halfWidth: tuning.halfWidth,
            heatPerSecond: tuning.heatPerSecond,
            endHeatMultiplier: tuning.endHeatMultiplier,
        });

        this.initialized = true;
    }

    public startWarning(targetId: string): boolean {
        if (!this.initialized || this.phase !== "IDLE") return false;
        this.phase = "WARNING";
        this.warningElapsedSeconds = 0;
        this.targetId = targetId;
        this.fireSourceSystem.setSourceEnabled(this.sourceId, false);
        return true;
    }

    public updateWarning(deltaTime: number): boolean {
        if (this.phase !== "WARNING") return false;
        this.warningElapsedSeconds = Math.min(
            this.warningDurationSeconds,
            this.warningElapsedSeconds + Math.max(0, deltaTime),
        );
        if (this.warningElapsedSeconds < this.warningDurationSeconds) return false;
        this.phase = "ATTACKING";
        return true;
    }

    public cancelWarning(): void {
        if (this.phase !== "WARNING") return;
        this.phase = "IDLE";
        this.warningElapsedSeconds = 0;
        this.targetId = null;
        if (this.initialized) this.fireSourceSystem.setSourceEnabled(this.sourceId, false);
    }

    public getSnapshot(): RobotFireAttackSnapshot {
        return {
            phase: this.phase,
            warningElapsedSeconds: this.phase === "WARNING" ? this.warningElapsedSeconds : 0,
            warningRemainingSeconds: this.phase === "WARNING"
                ? Math.max(0, this.warningDurationSeconds - this.warningElapsedSeconds) : 0,
            warningDurationSeconds: this.warningDurationSeconds,
            warningActive: this.phase === "WARNING",
            targetId: this.targetId,
        };
    }

    public update(
        robotX: number,
        robotY: number,
        rotationRadians: number,
        attacking: boolean,
    ): void {
        if (!this.initialized) return;

        const outlet = this.calculateOutlet(robotX, robotY, rotationRadians);
        const positionUpdated = this.fireSourceSystem.setSourcePosition(this.sourceId, outlet.x, outlet.y);
        const directionUpdated = this.fireSourceSystem.setSourceDirection(this.sourceId, rotationRadians);
        this.phase = attacking ? "ATTACKING" : (this.phase === "WARNING" ? "WARNING" : "IDLE");
        if (attacking) this.targetId = this.targetId;
        const enabledUpdated = this.fireSourceSystem.setSourceEnabled(this.sourceId, attacking);

        if (!positionUpdated || !directionUpdated || !enabledUpdated) {
            throw new Error(`Robot Fire attack could not synchronize source '${this.sourceId}'.`);
        }
    }

    public destroy(): void {
        if (!this.initialized) return;
        this.fireSourceSystem.removeSource(this.sourceId);
        this.initialized = false;
        this.phase = "IDLE";
        this.warningElapsedSeconds = 0;
        this.targetId = null;
    }

    private calculateOutlet(
        robotX: number,
        robotY: number,
        rotationRadians: number,
    ): { readonly x: number; readonly y: number } {
        // Match the authored tube artwork the same way as the Water Robot:
        // begin the authoritative source slightly inside the nozzle lip so
        // simulation and presentation have no visible air gap.
        const nozzleLipOverlap = 14;
        const sourceOffset = Math.max(0, this.outletOffset - nozzleLipOverlap);
        return {
            x: robotX + Math.cos(rotationRadians) * sourceOffset,
            y: robotY + Math.sin(rotationRadians) * sourceOffset,
        };
    }
}
