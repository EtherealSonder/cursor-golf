import type {
    WaterPerformanceSnapshot,
} from "./WaterPerformanceProfiler";

export interface WaterRuntimePerformanceValidationResult {
    readonly passed: boolean;
    readonly messages: readonly string[];
}

/**
 * Phase 8I-3B runtime acceptance helper.
 *
 * This does not mutate Water or gameplay state. It evaluates profiler
 * snapshots from the same heavy benchmark used before/after optimization.
 * Correctness remains guarded by the existing 8A-8F validations.
 */
export class WaterRuntimePerformanceValidation {
    public static evaluate(
        snapshot: WaterPerformanceSnapshot,
    ): WaterRuntimePerformanceValidationResult {
        const messages: string[] = [];

        if (snapshot.actualFps < 100) {
            messages.push(
                `Actual FPS is ${snapshot.actualFps.toFixed(1)}; target is 100+ in the reference heavy scene.`,
            );
        }

        if (
            snapshot.waterGroundInteractionAverageMilliseconds >
            4
        ) {
            messages.push(
                `Water-ground interaction is ${snapshot.waterGroundInteractionAverageMilliseconds.toFixed(2)} ms; target is <= 4.00 ms.`,
            );
        }

        if (
            snapshot.waterSimulationAverageMilliseconds >
            3
        ) {
            messages.push(
                `Water simulation is ${snapshot.waterSimulationAverageMilliseconds.toFixed(2)} ms; target is <= 3.00 ms.`,
            );
        }

        if (
            snapshot.wetGroundAverageMilliseconds >
            1.5
        ) {
            messages.push(
                `Wet-ground rendering is ${snapshot.wetGroundAverageMilliseconds.toFixed(2)} ms; target is <= 1.50 ms.`,
            );
        }

        if (
            snapshot.worldRemainderAverageMilliseconds >
            1
        ) {
            messages.push(
                `World remainder is ${snapshot.worldRemainderAverageMilliseconds.toFixed(2)} ms; profiler coverage should remain <= 1.00 ms.`,
            );
        }

        return {
            passed: messages.length === 0,
            messages,
        };
    }
}
