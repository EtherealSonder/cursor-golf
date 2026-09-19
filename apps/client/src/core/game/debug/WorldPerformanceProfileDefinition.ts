export interface WorldPerformanceProfileDefinition {
    readonly enabled: boolean;
    readonly overlayEnabled: boolean;
    readonly consoleReportingEnabled: boolean;
    readonly consoleReportIntervalSeconds: number;
}

export const DEFAULT_WORLD_PERFORMANCE_PROFILE_DEFINITION:
    WorldPerformanceProfileDefinition = {
    enabled: true,
    overlayEnabled: true,
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
