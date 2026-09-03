import type {
    LocalWindSourceDefinition,
} from "./LocalWindDefinition";

export type FireWindTestConfigurationId =
    | "no-wind"
    | "east-wind"
    | "south-wind"
    | "mixed-wind";

export interface FireWindTestConfiguration {
    readonly id: FireWindTestConfigurationId;
    readonly label: string;
    readonly sources: readonly LocalWindSourceDefinition[];
}

export interface FireWindTestDefinition {
    readonly defaultConfigurationId: FireWindTestConfigurationId;
    readonly ignitionRadius: number;
    readonly ignitionCount: number;

    /**
     * Fixed seed used for every validation ignition. Repeating the
     * same click under another Wind configuration therefore changes
     * airflow while keeping the Fire random sequence identical.
     */
    readonly deterministicSeed: number;

    /**
     * Minimum centroid movement before a spread direction is treated
     * as meaningful rather than effectively radial/noisy.
     */
    readonly minimumDirectionalDisplacement: number;

    /**
     * Dot-product threshold used when comparing measured Fire spread
     * against the sampled Wind direction.
     */
    readonly directionMatchThreshold: number;

    /**
     * Minimum ratio between historical downwind reach and historical
     * upwind reach before a Wind-biased spread is considered convincing.
     */
    readonly minimumDownwindToUpwindRatio: number;

    readonly debugArrowLength: number;
    readonly debugArrowHeadLength: number;

    readonly configurations: readonly FireWindTestConfiguration[];
}

const TEST_FAN_ACCELERATION = 1100;
const TEST_FAN_RANGE = 900;
const TEST_FAN_START_HALF_WIDTH = 105;
const TEST_FAN_END_HALF_WIDTH = 250;
const TEST_FAN_END_STRENGTH_MULTIPLIER = 0.42;
const TEST_FAN_EDGE_FALLOFF_FRACTION = 0.24;

const EAST_WIND_SOURCE: LocalWindSourceDefinition = {
    id: "fire-test-east-fan",
    enabled: true,
    positionX: 150,
    positionY: 360,
    directionRadians: 0,
    range: TEST_FAN_RANGE,
    startHalfWidth: TEST_FAN_START_HALF_WIDTH,
    endHalfWidth: TEST_FAN_END_HALF_WIDTH,
    acceleration: TEST_FAN_ACCELERATION,
    endStrengthMultiplier: TEST_FAN_END_STRENGTH_MULTIPLIER,
    edgeFalloffFraction: TEST_FAN_EDGE_FALLOFF_FRACTION,
};

const SOUTH_WIND_SOURCE: LocalWindSourceDefinition = {
    id: "fire-test-south-fan",
    enabled: true,
    positionX: 600,
    positionY: 90,
    directionRadians: Math.PI / 2,
    range: 620,
    startHalfWidth: TEST_FAN_START_HALF_WIDTH,
    endHalfWidth: 220,
    acceleration: TEST_FAN_ACCELERATION,
    endStrengthMultiplier: TEST_FAN_END_STRENGTH_MULTIPLIER,
    edgeFalloffFraction: TEST_FAN_EDGE_FALLOFF_FRACTION,
};


export const DEFAULT_FIRE_WIND_TEST_DEFINITION: FireWindTestDefinition = {
    defaultConfigurationId: "no-wind",
    ignitionRadius: 42,
    ignitionCount: 1,

    deterministicSeed: 24681357,

    minimumDirectionalDisplacement: 18,

    directionMatchThreshold: 0.55,

    minimumDownwindToUpwindRatio: 1.5,

    debugArrowLength: 96,

    debugArrowHeadLength: 14,

    configurations: [
        { id: "no-wind", label: "No Wind", sources: [] },
        {
            id: "east-wind",
            label: "East Wind",
            sources: [
                EAST_WIND_SOURCE,
            ],
        },
        {
            id: "south-wind",
            label: "South Wind",
            sources: [
                SOUTH_WIND_SOURCE,
            ],
        },
        {
            id: "mixed-wind",
            label: "Mixed Wind",
            sources: [
                EAST_WIND_SOURCE,
                SOUTH_WIND_SOURCE,
            ],
        },
    ],
};

export function getFireWindTestConfiguration(
    id: FireWindTestConfigurationId,
): FireWindTestConfiguration {
    const configuration =
        DEFAULT_FIRE_WIND_TEST_DEFINITION.configurations.find(
            (candidate): boolean => candidate.id === id,
        );

    if (!configuration) {
        throw new Error(
            `Unknown Fire/Wind test configuration '${id}'.`,
        );
    }

    return configuration;
}
