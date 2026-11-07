/** Presentation-only rock rocking. Does not modify collision geometry. */
export interface RockMotionPresentationDefinition {
    readonly minimumImpactImpulse: number;
    readonly impactWobbleGain: number;
    readonly maximumWobbleRadians: number;
    readonly wobbleFrequency: number;
    readonly wobbleDamping: number;
    readonly minimumVisibleWobble: number;
}
export const DEFAULT_ROCK_MOTION_PRESENTATION_DEFINITION: RockMotionPresentationDefinition = {
    minimumImpactImpulse: 0.7,
    impactWobbleGain: 0.003,
    maximumWobbleRadians: 0.13,
    wobbleFrequency: 17,
    wobbleDamping: 11,
    minimumVisibleWobble: 0.0005,
};
