import type { ProceduralSandConfig } from "../procedural/ProceduralSandConfig";

/** 60% is an aspirational coverage target. Valid course geometry always wins. */
export const DUNE_SURGE_TARGET_COVERAGE = 0.60;
export function createDuneSurgeSandConfig(base: ProceduralSandConfig): ProceduralSandConfig {
    return {
        ...base,
        minimumPatchSeparation: 8,
        maxPlacementAttempts: 1200,
        maxPatchCount: 60,
        secondaryPassAttemptFraction: 0.58,
        targetCoverage: { low: DUNE_SURGE_TARGET_COVERAGE, medium: DUNE_SURGE_TARGET_COVERAGE, high: DUNE_SURGE_TARGET_COVERAGE },
        intensityShapePresets: {
            ...base.intensityShapePresets,
            low: { minimumDiameter: 95, maximumDiameter: 220, aspectMinimum: 0.6, aspectMaximum: 1.7, lobeMinimum: 3, lobeMaximum: 7, irregularity: 1.1 },
            medium: { minimumDiameter: 95, maximumDiameter: 220, aspectMinimum: 0.6, aspectMaximum: 1.7, lobeMinimum: 3, lobeMaximum: 7, irregularity: 1.1 },
            high: { minimumDiameter: 95, maximumDiameter: 220, aspectMinimum: 0.6, aspectMaximum: 1.7, lobeMinimum: 3, lobeMaximum: 7, irregularity: 1.1 },
        },
        duneSurge: true,
    };
}
