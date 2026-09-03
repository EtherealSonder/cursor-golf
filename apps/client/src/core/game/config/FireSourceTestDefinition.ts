/**
 * Temporary Phase 4B-6 Fire-source test tuning.
 *
 * These values exist only to make Point and Persistent source behavior
 * easy to exercise while the full placement UI is built in 4B-6D.
 */
export interface FireSourceTestDefinition {
    readonly pointRadius: number;
    readonly pointHeatAmount: number;

    readonly persistentRadius: number;
    readonly persistentHeatPerSecond: number;
}

export const DEFAULT_FIRE_SOURCE_TEST_DEFINITION:
    FireSourceTestDefinition = {

    pointRadius: 30,
    pointHeatAmount: 0.72,

    persistentRadius: 26,
    persistentHeatPerSecond: 0.62,
};
