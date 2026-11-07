/** HE-1: Ground-water exclusion around the golf cup. */
export interface HoleWaterExclusionDefinition {
    readonly clearance: number;
    readonly cellEdgeTolerance: number;
    readonly redirectDeposits: boolean;
}

export const DEFAULT_HOLE_WATER_EXCLUSION_DEFINITION: HoleWaterExclusionDefinition = {
    clearance: 4,
    cellEdgeTolerance: 0,
    redirectDeposits: true,
};
