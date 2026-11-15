import { DEFAULT_PROCEDURAL_SAND_CONFIG, type ProceduralSandDensity } from "../procedural/ProceduralSandConfig";

export type GenerationMode = "disabled" | "random" | "fixed";
export interface SandGenerationConfig {
    mode: GenerationMode;
    density: ProceduralSandDensity;
    targetCoverage: Record<ProceduralSandDensity, number>;
}
export interface MarbleGenerationConfig {
    mode: GenerationMode;
    count: number;
    areaPerMarble: number;
    maximum: number;
    rollMultiplier: number;
}
export interface RockGenerationConfig {
    mode: GenerationMode;
    boulderCount: number;
    smallRockCount: number;
    areaPerRock: number;
    maximum: number;
    boulderRatio: number;
    boulderRadius: { min: number; max: number };
    smallRockRadius: { min: number; max: number };
}
export interface LevelProceduralConfig {
    sand: SandGenerationConfig;
    marbles: MarbleGenerationConfig;
    rocks: RockGenerationConfig;
}
/** Legacy levels without a procedural section keep the original sand/marble rolls;
 * legacy test-level rock placement is migrated into the reusable controller. */
export const DEFAULT_LEVEL_PROCEDURAL_CONFIG: LevelProceduralConfig = {
    sand: { mode: "random", density: "medium", targetCoverage: { ...DEFAULT_PROCEDURAL_SAND_CONFIG.targetCoverage } },
    marbles: { mode: "random", count: 0, areaPerMarble: 100000, maximum: 30, rollMultiplier: 1 },
    rocks: { mode: "disabled", boulderCount: 0, smallRockCount: 0, areaPerRock: 180000, maximum: 20,
        boulderRatio: 0.35, boulderRadius: { min: 38, max: 62 }, smallRockRadius: { min: 4, max: 20 } },
};
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
function number(v: unknown, fallback: number, name: string, min = 0, max = Infinity): number {
    if (v === undefined) return fallback;
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) throw new Error(`[ProceduralConfig] ${name} must be a finite number in [${min}, ${max}]`);
    return v;
}
function mode(v: unknown, name: string): GenerationMode {
    if (v !== "disabled" && v !== "random" && v !== "fixed") throw new Error(`[ProceduralConfig] ${name}.mode must be disabled, random or fixed`);
    return v;
}
function radius(v: unknown, fallback: {min:number;max:number}, name: string): {min:number;max:number} {
    if (v === undefined) return { ...fallback };
    if (!object(v)) throw new Error(`[ProceduralConfig] ${name} must be an object`);
    const min = number(v.min, fallback.min, `${name}.min`, 0.1);
    const max = number(v.max, fallback.max, `${name}.max`, 0.1);
    if (min > max) throw new Error(`[ProceduralConfig] ${name}.min must not exceed max`);
    return {min,max};
}
export function parseLevelProceduralConfig(input: unknown): LevelProceduralConfig {
    if (input === undefined) return structuredDefaults();
    if (!object(input)) throw new Error("[ProceduralConfig] procedural must be an object");
    const base = structuredDefaults();
    const sand = input.sand, marbles = input.marbles, rocks = input.rocks;
    for (const [key, value] of [["sand", sand],["marbles",marbles],["rocks",rocks]] as const) {
        if (value !== undefined && !object(value)) throw new Error(`[ProceduralConfig] ${key} must be an object`);
    }
    if (object(sand)) {
        base.sand.mode = mode(sand.mode, "sand");
        if (sand.density !== undefined) {
            if (sand.density !== "low" && sand.density !== "medium" && sand.density !== "high") throw new Error("[ProceduralConfig] sand.density invalid");
            base.sand.density = sand.density;
        }
        if (sand.targetCoverage !== undefined) {
            if (!object(sand.targetCoverage)) throw new Error("[ProceduralConfig] sand.targetCoverage must be an object");
            for (const density of ["low","medium","high"] as const) base.sand.targetCoverage[density] = number(sand.targetCoverage[density], base.sand.targetCoverage[density], `sand.targetCoverage.${density}`, 0, 1);
        }
    }
    if (object(marbles)) {
        base.marbles.mode = mode(marbles.mode, "marbles");
        base.marbles.count = number(marbles.count, base.marbles.count, "marbles.count", 0, 1000);
        base.marbles.areaPerMarble = number(marbles.areaPerMarble, base.marbles.areaPerMarble, "marbles.areaPerMarble", 1);
        base.marbles.maximum = number(marbles.maximum, base.marbles.maximum, "marbles.maximum", 0, 1000);
        base.marbles.rollMultiplier = number(marbles.rollMultiplier, base.marbles.rollMultiplier, "marbles.rollMultiplier", 0, 100);
    }
    if (object(rocks)) {
        base.rocks.mode = mode(rocks.mode, "rocks");
        base.rocks.boulderCount = number(rocks.boulderCount, base.rocks.boulderCount, "rocks.boulderCount", 0, 1000);
        base.rocks.smallRockCount = number(rocks.smallRockCount, base.rocks.smallRockCount, "rocks.smallRockCount", 0, 1000);
        base.rocks.areaPerRock = number(rocks.areaPerRock, base.rocks.areaPerRock, "rocks.areaPerRock", 1);
        base.rocks.maximum = number(rocks.maximum, base.rocks.maximum, "rocks.maximum", 0, 1000);
        base.rocks.boulderRatio = number(rocks.boulderRatio, base.rocks.boulderRatio, "rocks.boulderRatio", 0, 1);
        base.rocks.boulderRadius = radius(rocks.boulderRadius, base.rocks.boulderRadius, "rocks.boulderRadius");
        base.rocks.smallRockRadius = radius(rocks.smallRockRadius, base.rocks.smallRockRadius, "rocks.smallRockRadius");
    }
    return base;
}
function structuredDefaults(): LevelProceduralConfig {
    const d = DEFAULT_LEVEL_PROCEDURAL_CONFIG;
    return {sand:{...d.sand,targetCoverage:{...d.sand.targetCoverage}},marbles:{...d.marbles},rocks:{...d.rocks,boulderRadius:{...d.rocks.boulderRadius},smallRockRadius:{...d.rocks.smallRockRadius}}};
}
