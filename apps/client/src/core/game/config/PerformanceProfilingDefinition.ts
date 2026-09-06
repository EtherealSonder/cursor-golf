export type PerformanceProfilingPhase =
    | "idle"
    | "warmup"
    | "measuring"
    | "complete";

export interface PerformanceProfilingDefinition {
    readonly warmupSeconds: number;
    readonly measurementSeconds: number;
    readonly frameSpikeThresholdMilliseconds: number;
}

/**
 * Formal Phase G profiling window.
 *
 * The warm-up interval is intentionally excluded from recorded metrics so
 * scene construction, pool filling and initial shader/texture work do not
 * contaminate the repeatable measurement window.
 */
export const DEFAULT_PERFORMANCE_PROFILING_DEFINITION:
    PerformanceProfilingDefinition = {
    warmupSeconds: 5,
    measurementSeconds: 30,
    frameSpikeThresholdMilliseconds: 16.67,
};

export function validatePerformanceProfilingDefinition(
    definition: PerformanceProfilingDefinition,
): void {
    if (
        !Number.isFinite(definition.warmupSeconds) ||
        !Number.isFinite(definition.measurementSeconds) ||
        !Number.isFinite(definition.frameSpikeThresholdMilliseconds) ||
        definition.warmupSeconds < 0 ||
        definition.measurementSeconds <= 0 ||
        definition.frameSpikeThresholdMilliseconds <= 0
    ) {
        throw new Error(
            "Performance profiling durations and spike threshold must be finite and valid.",
        );
    }
}
