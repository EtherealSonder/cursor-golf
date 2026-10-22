import type { SandCompleteAbsorptionDefinition } from "../config/WaterGroundInteractionDefinition";
import { SurfaceType } from "../surface/SurfaceType";
import type { SurfaceSystem } from "../surface/SurfaceSystem";
import type { EnvironmentField } from "./EnvironmentField";
import type { WaterField } from "./WaterField";

/**
 * Arcade sand sink. Runs after water transport and before contact wetting.
 * WaterField and EnvironmentField share an aligned grid (validated by the
 * existing WaterGroundInteractionSystem). The sink uses the *authoritative*
 * surface query, so authored and procedural sand both participate.
 *
 * Every water cell whose center belongs to sand is fully drained, even when
 * the ground is saturated. The retained moisture is capped independently.
 * There is no persistent invisible water that could apply ball drag/drowning.
 */
export class SandWaterAbsorptionController {
    private readonly candidateIndices: number[] = [];
    private lastAbsorbedCells = 0;
    private lastAbsorbedDepth = 0;

    public constructor(
        private readonly waterField: WaterField,
        private readonly environmentField: EnvironmentField,
        private readonly surfaceSystem: SurfaceSystem,
        private readonly definition: SandCompleteAbsorptionDefinition,
    ) {}

    public update(): void {
        this.lastAbsorbedCells = 0;
        this.lastAbsorbedDepth = 0;
        if (!this.definition.enabled) return;

        // Removal mutates the sparse active-water registry; snapshot indices.
        this.candidateIndices.length = 0;
        this.waterField.forEachTrackedWaterIndex((index): void => {
            this.candidateIndices.push(index);
        });

        for (const index of this.candidateIndices) {
            const depth = this.waterField.getDepthByIndex(index);
            if (depth <= 0) continue;
            const center = this.waterField.getWorldCenterByIndex(index);
            if (!center || this.surfaceSystem.getSurfaceAt(center.x, center.y).surfaceType !== SurfaceType.Sand) continue;

            const removed = this.waterField.drainWaterByIndex(index);
            if (removed <= 0) continue;

            const current = this.environmentField.getMoistureByIndex(index);
            const desired = Math.min(
                this.definition.maximumSandMoisture,
                Math.max(this.definition.initialContactMoisture, current + removed * this.definition.moistureGainPerWaterDepth),
            );
            if (desired > current) this.environmentField.addMoistureByIndex(index, desired - current);
            this.lastAbsorbedCells++;
            this.lastAbsorbedDepth += removed;
        }
    }

    public getLastAbsorption(): { cells: number; depth: number } {
        return { cells: this.lastAbsorbedCells, depth: this.lastAbsorbedDepth };
    }
}
