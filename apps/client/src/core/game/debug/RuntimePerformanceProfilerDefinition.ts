export interface RuntimePerformanceProfilerDefinition {
    readonly enabled: boolean;
    readonly sampleWindowFrames: number;
    readonly overlayRefreshSeconds: number;
    readonly slowSectionWarningMilliseconds: number;
}

export const DEFAULT_RUNTIME_PERFORMANCE_PROFILER_DEFINITION:
    RuntimePerformanceProfilerDefinition = {
    enabled: true,
    sampleWindowFrames: 120,
    overlayRefreshSeconds: 0.25,
    slowSectionWarningMilliseconds: 4,
};

export function validateRuntimePerformanceProfilerDefinition(
    definition: RuntimePerformanceProfilerDefinition,
): void {
    if (typeof definition.enabled !== "boolean") {
        throw new Error(
            "Runtime performance profiler enabled must be a boolean.",
        );
    }

    if (
        !Number.isInteger(definition.sampleWindowFrames) ||
        definition.sampleWindowFrames <= 0
    ) {
        throw new Error(
            "Runtime performance profiler sampleWindowFrames must be a positive integer.",
        );
    }

    if (
        !Number.isFinite(definition.overlayRefreshSeconds) ||
        definition.overlayRefreshSeconds <= 0
    ) {
        throw new Error(
            "Runtime performance profiler overlayRefreshSeconds must be finite and greater than zero.",
        );
    }

    if (
        !Number.isFinite(definition.slowSectionWarningMilliseconds) ||
        definition.slowSectionWarningMilliseconds < 0
    ) {
        throw new Error(
            "Runtime performance profiler slowSectionWarningMilliseconds must be finite and non-negative.",
        );
    }
}
