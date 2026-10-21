export type ProceduralSandDensity = "low" | "medium" | "high";

export interface ProceduralSandConfig {
    readonly density: ProceduralSandDensity;
    /** Optional reproducible seed. Omit for a fresh seed on each level load. */
    readonly seed?: number;
    readonly minimumPatchDiameter: number;
    readonly maximumPatchDiameter: number;
    readonly minimumPatchSeparation: number;
    readonly spawnClearance: number;
    readonly holeClearance: number;
    readonly targetCoverage: Readonly<Record<ProceduralSandDensity, number>>;
}

export const DEFAULT_PROCEDURAL_SAND_CONFIG: ProceduralSandConfig = {
    density: "medium",
    minimumPatchDiameter: 100,
    maximumPatchDiameter: 300,
    minimumPatchSeparation: 18,
    spawnClearance: 120,
    holeClearance: 80,
    targetCoverage: { low: 0.015, medium: 0.04, high: 0.075 },
};

/** Generate a fresh 32-bit seed once per level load or explicit regeneration. */
export function createProceduralSandSeed(): number {
    return Math.floor(Math.random() * 0x100000000) >>> 0;
}
