import { DEFAULT_ROBOT_WIND_ATTACK_DEFINITION } from "../../config/RobotWindAttackDefinition";
import type { LocalWindSystem } from "../../environment/LocalWindSystem";

export type RobotWindAttackPhase = "IDLE" | "WARNING" | "ATTACKING";

export interface RobotWindAttackSnapshot {
    readonly phase: RobotWindAttackPhase;
    readonly warningElapsedSeconds: number;
    readonly warningRemainingSeconds: number;
    readonly warningDurationSeconds: number;
    readonly warningActive: boolean;
    readonly targetId: string | null;
}

/** Maps the shared Robot attack lifecycle onto an authoritative Local Wind pull source. */
export class RobotWindAttackController {
    private readonly sourceId: string;
    private initialized = false;
    private phase: RobotWindAttackPhase = "IDLE";
    private warningElapsedSeconds = 0;
    private targetId: string | null = null;

    public constructor(
        robotId: string,
        private readonly localWindSystem: LocalWindSystem,
        private readonly outletOffset: number,
        private readonly warningDurationSeconds: number,
    ) {
        this.sourceId = `${robotId}-suction-wind`;
    }

    public initialize(robotX: number, robotY: number, rotationRadians: number): void {
        if (this.initialized) {
            throw new Error(`Robot Wind source '${this.sourceId}' is already initialized.`);
        }
        const outlet = this.calculateOutlet(robotX, robotY, rotationRadians);
        const tuning = DEFAULT_ROBOT_WIND_ATTACK_DEFINITION;
        this.localWindSystem.addSource({
            id: this.sourceId,
            positionX: outlet.x,
            positionY: outlet.y,
            directionRadians: rotationRadians,
            range: tuning.range,
            startHalfWidth: tuning.nozzleHalfWidth,
            endHalfWidth: tuning.farHalfWidth,
            acceleration: tuning.acceleration,
            endStrengthMultiplier: tuning.endStrengthMultiplier,
            edgeFalloffFraction: tuning.edgeFalloffFraction,
            flowMode: "pull",
            enabled: false,
        });
        this.initialized = true;
    }

    public startWarning(targetId: string): boolean {
        if (!this.initialized || this.phase !== "IDLE") return false;
        this.phase = "WARNING";
        this.warningElapsedSeconds = 0;
        this.targetId = targetId;
        this.localWindSystem.setSourceEnabled(this.sourceId, false);
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
        if (this.initialized) this.localWindSystem.setSourceEnabled(this.sourceId, false);
    }

    public getSnapshot(): RobotWindAttackSnapshot {
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

    public update(robotX: number, robotY: number, rotationRadians: number, attacking: boolean): void {
        if (!this.initialized) return;
        const outlet = this.calculateOutlet(robotX, robotY, rotationRadians);
        const transformed = this.localWindSystem.updateSourceTransform(
            this.sourceId, outlet.x, outlet.y, rotationRadians,
        );
        const enabled = this.localWindSystem.setSourceEnabled(this.sourceId, attacking);
        if (!transformed || !enabled) {
            throw new Error(`Robot Wind attack could not synchronize source '${this.sourceId}'.`);
        }
        this.phase = attacking ? "ATTACKING" : (this.phase === "WARNING" ? "WARNING" : "IDLE");
    }

    /** Wind, like Water, commits to the complete attack after firing begins. */
    public continuesAttackAfterTargetLoss(): boolean { return true; }
    public getWindSourceId(): string { return this.sourceId; }

    public destroy(): void {
        if (!this.initialized) return;
        this.localWindSystem.removeSource(this.sourceId);
        this.initialized = false;
        this.phase = "IDLE";
        this.warningElapsedSeconds = 0;
        this.targetId = null;
    }

    private calculateOutlet(robotX: number, robotY: number, rotationRadians: number) {
        return {
            x: robotX + Math.cos(rotationRadians) * this.outletOffset,
            y: robotY + Math.sin(rotationRadians) * this.outletOffset,
        };
    }
}
