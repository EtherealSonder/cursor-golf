/** Presentation-only diagnostic overrides. Gameplay simulation remains authoritative. */
export type VfxKind = "fire" | "water" | "wind";
export interface PerformanceDiagnosticConfiguration {
    readonly fire: boolean;
    readonly water: boolean;
    readonly wind: boolean;
}
export const DEFAULT_DIAGNOSTIC_CONFIGURATION: PerformanceDiagnosticConfiguration =
    { fire: true, water: true, wind: true };
export const DIAGNOSTIC_PRESETS: ReadonlyArray<{ label: string; value: PerformanceDiagnosticConfiguration }> = [
    { label: "ALL ENABLED", value: { fire: true, water: true, wind: true } },
    { label: "FIRE OFF", value: { fire: false, water: true, wind: true } },
    { label: "WATER OFF", value: { fire: true, water: false, wind: true } },
    { label: "WIND OFF", value: { fire: true, water: true, wind: false } },
    { label: "ALL VFX OFF", value: { fire: false, water: false, wind: false } },
    { label: "FIRE ONLY", value: {fire:true,water:false,wind:false} },
    { label: "WATER ONLY", value: {fire:false,water:true,wind:false} },
    { label: "WIND ONLY", value: {fire:false,water:false,wind:true} },
];
export function diagnosticLabel(config: PerformanceDiagnosticConfiguration): string {
    return DIAGNOSTIC_PRESETS.find(p => p.value.fire === config.fire &&
        p.value.water === config.water && p.value.wind === config.wind)?.label ??
        `CUSTOM F:${config.fire ? "ON" : "OFF"} W:${config.water ? "ON" : "OFF"} WIND:${config.wind ? "ON" : "OFF"}`;
}

/** Pass B presets are defined separately to preserve all Pass A configurations. */
export { PASS_B_PRESETS } from "./PerformanceSimulationDiagnosticConfiguration";

export {P0_SCENARIOS,P0_BENCHMARK_SETTINGS} from "./PerformanceBenchmarkScenario";
