export interface BallFireHeatDefinition {
    /** Seconds of full-intensity Fire exposure required to reach lethal heat. */
    readonly fullExposureHeatPerSecond: number;
    /** Heat removed per second while the Ball is no longer meaningfully exposed. */
    readonly coolingPerSecond: number;
    /** Exposure below this value is treated as zero to avoid tiny fringe flicker. */
    readonly minimumExposure: number;
    readonly deathThreshold: number;
    readonly overlayColor: number;
    readonly overlayMaximumAlpha: number;
}

export const DEFAULT_BALL_FIRE_HEAT_DEFINITION: BallFireHeatDefinition = {
    fullExposureHeatPerSecond: 0.34,
    coolingPerSecond: 0.22,
    minimumExposure: 0.06,
    deathThreshold: 1,
    overlayColor: 0xff3f4f,
    overlayMaximumAlpha: 0.48,
};
