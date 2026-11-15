/** LCT-1 cinematic timing. The black hold is released by LCT-2. */
export const LEVEL_COMPLETION_TRANSITION = {
    fallbackHoleSoundSeconds: 1.1,
    maximumHoleSoundWaitSeconds: 3.5,
    holeEntrySeconds: 1.65,
    hudShrinkSeconds: 0.45,
    cinematicHoleZoom: 10,
    blackFadeStart: 0.68,
    newHoleRevealSeconds: 2.0,
    newHoleWideZoom: 0.85,
    revealBlackFadeFraction: 0.36,
    flyoverSeconds: 2.2,
    flyoverWaypointSeconds: 1.0,
    normalGameplayZoom: 1.25,
} as const;
