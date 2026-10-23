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
    readonly intensityShapePresets: Readonly<Record<ProceduralSandDensity, {
        readonly minimumDiameter: number; readonly maximumDiameter: number;
        readonly aspectMinimum: number; readonly aspectMaximum: number;
        readonly lobeMinimum: number; readonly lobeMaximum: number;
        readonly irregularity: number;
    }>>;
    readonly targetCoverage: Readonly<Record<ProceduralSandDensity, number>>;
}

export const DEFAULT_PROCEDURAL_SAND_CONFIG: ProceduralSandConfig = {
    density: "medium",
    minimumPatchDiameter: 100,
    maximumPatchDiameter: 300,
    minimumPatchSeparation: 18,
    spawnClearance: 120,
    holeClearance: 80,
    intensityShapePresets: {
        low: { minimumDiameter: 70, maximumDiameter: 145, aspectMinimum: 0.85, aspectMaximum: 1.15, lobeMinimum: 3, lobeMaximum: 5, irregularity: 0.65 },
        medium: { minimumDiameter: 110, maximumDiameter: 245, aspectMinimum: 0.70, aspectMaximum: 1.35, lobeMinimum: 3, lobeMaximum: 6, irregularity: 1 },
        high: { minimumDiameter: 180, maximumDiameter: 380, aspectMinimum: 0.55, aspectMaximum: 1.65, lobeMinimum: 4, lobeMaximum: 8, irregularity: 1.35 },
    },
    targetCoverage: { low: 0.015, medium: 0.04, high: 0.075 },
};

/** Generate a fresh 32-bit seed once per level load or explicit regeneration. */
export function createProceduralSandSeed(): number {
    return Math.floor(Math.random() * 0x100000000) >>> 0;
}
