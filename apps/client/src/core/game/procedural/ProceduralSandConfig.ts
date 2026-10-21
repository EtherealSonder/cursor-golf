export type ProceduralSandDensity = "low" | "medium" | "high";

export interface ProceduralSandConfig {
    readonly density: ProceduralSandDensity;
    /** A stable integer seed; regeneration can replace it. */
    readonly seed: number;
    readonly minimumPatchDiameter: number;
    readonly maximumPatchDiameter: number;
    readonly minimumPatchSeparation: number;
    readonly spawnClearance: number;
    readonly holeClearance: number;
    readonly targetCoverage: Readonly<Record<ProceduralSandDensity, number>>;
}

export const DEFAULT_PROCEDURAL_SAND_CONFIG: ProceduralSandConfig = {
    density: "medium",
    seed: 48271,
    minimumPatchDiameter: 100,
    maximumPatchDiameter: 300,
    minimumPatchSeparation: 18,
    spawnClearance: 120,
    holeClearance: 80,
    targetCoverage: { low: 0.015, medium: 0.04, high: 0.075 },
};
