import { BUSH_FIRE } from "./BushFireDefinition";
/** Shared B2 bush defaults. Geometry is derived from the actual bush.png alpha. */
export const BUSH_DEFINITION = {
    size: 136,
    fire: BUSH_FIRE,
    alphaThreshold: 96 / 255,
    traversalInset: 0,
    concealmentInset: 6,
    concealmentActivationCoverage: 0.7,
    ballCoverageSamples: 9,
    concealmentReleaseCoverage: 0.55,
    robotNavigationRadius: 55,
    /** B3 movement tuning lives in BushMovementDefinition.ts. */
} as const;
