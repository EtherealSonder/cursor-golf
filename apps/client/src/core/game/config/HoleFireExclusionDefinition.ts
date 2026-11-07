/** HE-2: ground-fire-only protection around the golf cup. */
export interface HoleFireExclusionDefinition {
    readonly clearance: number;
    /** Extra tolerance for fire geometry and particle origins. */
    readonly visualClearance: number;
}

export const DEFAULT_HOLE_FIRE_EXCLUSION_DEFINITION: HoleFireExclusionDefinition = {
    clearance: 4,
    visualClearance: 5,
};
