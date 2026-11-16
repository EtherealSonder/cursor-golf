/** P-1 tuning. Distance is measured under baseline rolling deceleration. */
export const HIGH_POWER_BALL = Object.freeze({
    travelDistanceMultiplier: 1.5,
    /** Keep precision shots identical to the normal ball up to this drag fraction. */
    precisionDragFraction: 0.35,
    /** Separate capture assistance for high-speed approaches. */
    holeMinimumCaptureSpeed: 450,
    holeMaximumCaptureSpeed: 750,
    holeCaptureAssistMargin: 18,
    holeAttractionRadius: 130,
    maximumBaselineShotDistance: 2000,
    maximumLaunchSpeed: 1600,
    maximumMovementSpeed: 1500,
    aimLengthMultiplier: 1.5,
    fireDangerRateMultiplier: 0.5,
    waterDangerRateMultiplier: 0.5,
    trailBodyColor: 0xf58fa2,
    trailEdgeColor: 0xffb3c0,
    pulseCycleSeconds: 1.2,
    pulseMinimumAlpha: 0.55,
});
