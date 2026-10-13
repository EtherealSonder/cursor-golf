export interface WorldPerformanceProfileDefinition {
    readonly enabled: boolean;
    readonly overlayEnabled: boolean;
    readonly consoleReportingEnabled: boolean;
    readonly consoleReportIntervalSeconds: number;
}

export const PASS_A_PROFILE_SECTIONS = ["robotAI","entities","dynamicCollisions","waterSimulation","airborneWater","waterGroundInteraction","fireSimulation","fireVfxUpdate","localWindForces","windPresentation","sprinklerWaterVfx","hoseWaterVfx","waterVfxCore"] as const;

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

/** Pass A measurements are observation-only; authoritative simulations remain active. */
export const PASS_A_DIAGNOSTIC_SECTIONS=["world","pixiRender","waterVfx","fireVfx","windVfx","waterGround","fireSimulation","windForces","dynamicCollisions"] as const;

export const PASS_B_DIAGNOSTIC_SECTIONS=["fireSpread","fireSources","waterTransport","waterEvolution","windForces","robotUpdates","dynamicCollisions","spatialQueries"] as const;

/** P0 categories match published WaterPerformanceSnapshot fields; do not sum overlapping values. */
export const P0_DIAGNOSTIC_SECTIONS=["world","pixiRender","robotAI","entities","dynamicCollisions","waterAirborne","waterFlow","waterGround","waterVfx","fireSimulation","fireVfx","windForces","windSuction","windVfx","surface"] as const;
