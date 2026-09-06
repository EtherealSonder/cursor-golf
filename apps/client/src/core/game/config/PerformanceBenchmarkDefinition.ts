import type {
    LocalWindSourceDefinition,
} from "./LocalWindDefinition";

import {
    DEFAULT_PERFORMANCE_PROFILING_DEFINITION,
} from "./PerformanceProfilingDefinition";

import type {
    PerformanceProfilingDefinition,
} from "./PerformanceProfilingDefinition";

export type PerformanceBenchmarkId =
    | "baseline"
    | "fan-1"
    | "fire-tube-1"
    | "fan-1-fire-tube-1"
    | "fan-3-fire-tube-3"
    | "fan-5-fire-tube-5";

export interface PerformanceBenchmarkFireTubeDefinition {
    readonly sourceId:
    string;

    readonly positionX:
    number;

    readonly positionY:
    number;

    readonly rotationRadians:
    number;
}

export interface PerformanceBenchmarkDefinition {
    readonly id:
    PerformanceBenchmarkId;

    readonly label:
    string;

    readonly description:
    string;

    /**
     * Fixed Local Wind source definitions. Fan body transforms are derived
     * from these authoritative outlet transforms by the existing Fan class.
     */
    readonly fanSources:
    readonly LocalWindSourceDefinition[];

    readonly fireTubes:
    readonly PerformanceBenchmarkFireTubeDefinition[];

    readonly windVfxEnabled:
    boolean;

    readonly fireVfxEnabled:
    boolean;

    /**
     * FireTube normally randomizes its autonomous firing/cooldown cycle.
     * During benchmark scenes World forces these sources on after each
     * mechanism update so the workload remains repeatable.
     */
    readonly forceFireTubesFiring:
    boolean;

    /**
     * FireManager already provides a deterministic validation RNG. Reusing it
     * here keeps Fire spread/ignition randomness stable across repeated runs.
     */
    readonly fireRandomSeed:
    number;

    /**
     * Formal benchmark scenes suppress global course Wind so Fan scenarios
     * measure Local Wind and its VFX without an unrelated global emitter.
     */
    readonly globalWindDirectionDegrees:
    number;

    readonly globalWindStrength:
    number;

    /** Formal warm-up/measurement window used by Phase G profiling. */
    readonly profiling:
    PerformanceProfilingDefinition;
}

const FAN_RANGE =
    560;

const FAN_HALF_WIDTH =
    55;

const FAN_ACCELERATION =
    1100;

const FAN_END_STRENGTH_MULTIPLIER =
    0.60;

const FAN_EDGE_FALLOFF_FRACTION =
    0.22;

const FIRE_RANDOM_SEED =
    0x4c475046;

function createFanSource(
    id:
        string,

    positionX:
        number,

    positionY:
        number,

    directionRadians:
        number,
): LocalWindSourceDefinition {

    return {
        id,
        positionX,
        positionY,
        directionRadians,

        range:
            FAN_RANGE,

        startHalfWidth:
            FAN_HALF_WIDTH,

        endHalfWidth:
            FAN_HALF_WIDTH,

        acceleration:
            FAN_ACCELERATION,

        endStrengthMultiplier:
            FAN_END_STRENGTH_MULTIPLIER,

        edgeFalloffFraction:
            FAN_EDGE_FALLOFF_FRACTION,

        enabled:
            true,
    };
}

function createFireTube(
    index:
        number,

    positionX:
        number,

    positionY:
        number,

    rotationRadians:
        number,
): PerformanceBenchmarkFireTubeDefinition {

    return {
        sourceId:
            `fire-tube-benchmark-${index}`,

        positionX,
        positionY,
        rotationRadians,
    };
}

const FIVE_FAN_SOURCES:
    readonly LocalWindSourceDefinition[] = [
        createFanSource(
            "benchmark-fan-1",
            120,
            80,
            0,
        ),
        createFanSource(
            "benchmark-fan-2",
            120,
            180,
            0,
        ),
        createFanSource(
            "benchmark-fan-3",
            120,
            280,
            0,
        ),
        createFanSource(
            "benchmark-fan-4",
            120,
            380,
            0,
        ),
        createFanSource(
            "benchmark-fan-5",
            120,
            480,
            0,
        ),
    ];

const FIVE_FIRE_TUBES:
    readonly PerformanceBenchmarkFireTubeDefinition[] = [
        createFireTube(
            1,
            820,
            80,
            Math.PI,
        ),
        createFireTube(
            2,
            820,
            180,
            Math.PI,
        ),
        createFireTube(
            3,
            820,
            280,
            Math.PI,
        ),
        createFireTube(
            4,
            820,
            380,
            Math.PI,
        ),
        createFireTube(
            5,
            820,
            480,
            Math.PI,
        ),
    ];

const ONE_FAN_SOURCE =
    [
        FIVE_FAN_SOURCES[2]!,
    ] as const;

const THREE_FAN_SOURCES =
    [
        FIVE_FAN_SOURCES[1]!,
        FIVE_FAN_SOURCES[2]!,
        FIVE_FAN_SOURCES[3]!,
    ] as const;

const ONE_FIRE_TUBE =
    [
        FIVE_FIRE_TUBES[2]!,
    ] as const;

const THREE_FIRE_TUBES =
    [
        FIVE_FIRE_TUBES[1]!,
        FIVE_FIRE_TUBES[2]!,
        FIVE_FIRE_TUBES[3]!,
    ] as const;

const COMMON_BENCHMARK_STATE = {
    profiling:
        DEFAULT_PERFORMANCE_PROFILING_DEFINITION,

    fireRandomSeed:
        FIRE_RANDOM_SEED,

    globalWindDirectionDegrees:
        0,

    globalWindStrength:
        0,
} as const;

export const PERFORMANCE_BENCHMARK_DEFINITIONS:
    Readonly<Record<
        PerformanceBenchmarkId,
        PerformanceBenchmarkDefinition
    >> = {

    baseline: {
        ...COMMON_BENCHMARK_STATE,

        id:
            "baseline",

        label:
            "Baseline",

        description:
            "No Fans, no Fire Tubes, Wind VFX off, Fire VFX off.",

        fanSources:
            [],

        fireTubes:
            [],

        windVfxEnabled:
            false,

        fireVfxEnabled:
            false,

        forceFireTubesFiring:
            false,
    },

    "fan-1": {
        ...COMMON_BENCHMARK_STATE,

        id:
            "fan-1",

        label:
            "1 Fan",

        description:
            "One deterministic Fan with Local Wind VFX enabled.",

        fanSources:
            ONE_FAN_SOURCE,

        fireTubes:
            [],

        windVfxEnabled:
            true,

        fireVfxEnabled:
            false,

        forceFireTubesFiring:
            false,
    },

    "fire-tube-1": {
        ...COMMON_BENCHMARK_STATE,

        id:
            "fire-tube-1",

        label:
            "1 Fire Tube",

        description:
            "One deterministic always-firing Fire Tube with Fire VFX enabled.",

        fanSources:
            [],

        fireTubes:
            ONE_FIRE_TUBE,

        windVfxEnabled:
            false,

        fireVfxEnabled:
            true,

        forceFireTubesFiring:
            true,
    },

    "fan-1-fire-tube-1": {
        ...COMMON_BENCHMARK_STATE,

        id:
            "fan-1-fire-tube-1",

        label:
            "1 Fan + 1 Fire Tube",

        description:
            "One deterministic Fan and one deterministic always-firing Fire Tube.",

        fanSources:
            ONE_FAN_SOURCE,

        fireTubes:
            ONE_FIRE_TUBE,

        windVfxEnabled:
            true,

        fireVfxEnabled:
            true,

        forceFireTubesFiring:
            true,
    },

    "fan-3-fire-tube-3": {
        ...COMMON_BENCHMARK_STATE,

        id:
            "fan-3-fire-tube-3",

        label:
            "3 Fans + 3 Fire Tubes",

        description:
            "Combined deterministic medium-load mechanism/VFX benchmark.",

        fanSources:
            THREE_FAN_SOURCES,

        fireTubes:
            THREE_FIRE_TUBES,

        windVfxEnabled:
            true,

        fireVfxEnabled:
            true,

        forceFireTubesFiring:
            true,
    },

    "fan-5-fire-tube-5": {
        ...COMMON_BENCHMARK_STATE,

        id:
            "fan-5-fire-tube-5",

        label:
            "5 Fans + 5 Fire Tubes",

        description:
            "Combined deterministic stress benchmark for the final G12 pass.",

        fanSources:
            FIVE_FAN_SOURCES,

        fireTubes:
            FIVE_FIRE_TUBES,

        windVfxEnabled:
            true,

        fireVfxEnabled:
            true,

        forceFireTubesFiring:
            true,
    },
};

export const PERFORMANCE_BENCHMARK_IDS:
    readonly PerformanceBenchmarkId[] = [
        "baseline",
        "fan-1",
        "fire-tube-1",
        "fan-1-fire-tube-1",
        "fan-3-fire-tube-3",
        "fan-5-fire-tube-5",
    ];

export function getPerformanceBenchmarkDefinition(
    id:
        PerformanceBenchmarkId,
): PerformanceBenchmarkDefinition {

    return PERFORMANCE_BENCHMARK_DEFINITIONS[
        id
    ];
}
