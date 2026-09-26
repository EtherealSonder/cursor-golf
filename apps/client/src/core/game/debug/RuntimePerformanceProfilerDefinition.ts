export interface RuntimePerformanceProfilerDefinition {
    readonly enabled: boolean;
    readonly sampleWindowFrames: number;
    readonly overlayRefreshSeconds: number;
    readonly slowSectionWarningMilliseconds: number;
    readonly frameBudgetMilliseconds: number;
    readonly consoleReportingEnabled: boolean;
    readonly consoleReportIntervalSeconds: number;
    readonly maximumDisplayedSections: number;
}

export const DEFAULT_RUNTIME_PERFORMANCE_PROFILER_DEFINITION:
    RuntimePerformanceProfilerDefinition = {
    enabled: true,
    sampleWindowFrames: 120,
    overlayRefreshSeconds: 0.25,
    slowSectionWarningMilliseconds: 4,
    frameBudgetMilliseconds: 16.67,
    consoleReportingEnabled: true,
    consoleReportIntervalSeconds: 2,
    maximumDisplayedSections: 12,
};

export function validateRuntimePerformanceProfilerDefinition(
    definition: RuntimePerformanceProfilerDefinition,
): void {
    if (typeof definition.enabled !== "boolean" || typeof definition.consoleReportingEnabled !== "boolean") {
        throw new Error("Runtime performance profiler toggles must be boolean.");
    }
    if (!Number.isInteger(definition.sampleWindowFrames) || definition.sampleWindowFrames <= 0) {
        throw new Error("Runtime performance profiler sampleWindowFrames must be a positive integer.");
    }
    for (const [name, value] of [
        ["overlayRefreshSeconds", definition.overlayRefreshSeconds],
        ["frameBudgetMilliseconds", definition.frameBudgetMilliseconds],
        ["consoleReportIntervalSeconds", definition.consoleReportIntervalSeconds],
    ] as const) {
        if (!Number.isFinite(value) || value <= 0) throw new Error(`Runtime performance profiler ${name} must be finite and greater than zero.`);
    }
    if (!Number.isFinite(definition.slowSectionWarningMilliseconds) || definition.slowSectionWarningMilliseconds < 0) {
        throw new Error("Runtime performance profiler slowSectionWarningMilliseconds must be finite and non-negative.");
    }
    if (!Number.isInteger(definition.maximumDisplayedSections) || definition.maximumDisplayedSections <= 0) {
        throw new Error("Runtime performance profiler maximumDisplayedSections must be a positive integer.");
    }
}
