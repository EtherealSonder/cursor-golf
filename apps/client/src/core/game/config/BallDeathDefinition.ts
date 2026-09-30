export interface BallDeathDefinition {
    readonly startingLives: number;
    readonly maximumLives: number;
    readonly dyingDurationSeconds: number;
    readonly continueRetryAtZeroLives: boolean;
}

export const DEFAULT_BALL_DEATH_DEFINITION: BallDeathDefinition = {
    startingLives: 5,
    maximumLives: 5,
    dyingDurationSeconds: 0.35,
    continueRetryAtZeroLives: true,
};
