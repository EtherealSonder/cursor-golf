export interface WorldPerformanceProfileDefinition {
    readonly enabled: boolean;
    readonly overlayEnabled: boolean;
    readonly consoleReportingEnabled: boolean;
    readonly consoleReportIntervalSeconds: number;
}

// Normal development runtime keeps performance profiling and its HUD disabled.
// The profiler implementation remains available for explicit future profiling passes.
export const DEFAULT_WORLD_PERFORMANCE_PROFILE_DEFINITION:
    WorldPerformanceProfileDefinition = {
    enabled: false,
    overlayEnabled: false,
    consoleReportingEnabled: false,
    consoleReportIntervalSeconds: 2,
};

export function validateWorldPerformanceProfileDefinition(
    definition: WorldPerformanceProfileDefinition,
): void {
    if (typeof definition.enabled !== "boolean" ||
        typeof definition.overlayEnabled !== "boolean" ||
        typeof definition.consoleReportingEnabled !== "boolean") {
        throw new Error("World performance profile toggles must be boolean.");
    }

    if (!Number.isFinite(definition.consoleReportIntervalSeconds) ||
        definition.consoleReportIntervalSeconds <= 0) {
        throw new Error("World performance console interval must be greater than zero.");
    }
}
