/**
 * Phase 4B-6C tuning for the directional Fire jet.
 *
 * FireSourceDefinition owns the authored source schema. This file owns
 * the jet implementation/test tuning.
 */
export interface DirectionalFireSourceTuning {
    readonly length: number;
    readonly halfWidth: number;
    readonly heatPerSecond: number;
    readonly endHeatMultiplier: number;
    readonly sampleSpacing: number;
    readonly sampleRadius: number;
    readonly heatDensityReferenceSpacing: number;
    readonly visualSegmentSpacing: number;
    readonly visualOuterWidthMultiplier: number;
    readonly visualCoreWidthMultiplier: number;
    readonly visualFlickerAmount: number;
    readonly visualFlickerSpeed: number;
}

export const DEFAULT_DIRECTIONAL_FIRE_SOURCE_DEFINITION:
    DirectionalFireSourceTuning = {

    length: 320,
    halfWidth: 14,

    /*
     * Local stream heat density. This is not divided across the full
     * jet length, so a longer jet does not become weaker everywhere.
     */
    heatPerSecond: 0.72,
    endHeatMultiplier: 0.58,

    /*
     * Fine sampling stays close to EnvironmentField resolution.
     */
    sampleSpacing: 8,
    sampleRadius: 11,
    heatDensityReferenceSpacing: 8,

    /*
     * Temporary procedural Fire-stream presentation.
     */
    visualSegmentSpacing: 18,
    visualOuterWidthMultiplier: 1.65,
    visualCoreWidthMultiplier: 0.72,
    visualFlickerAmount: 0.22,
    visualFlickerSpeed: 7.5,
};
