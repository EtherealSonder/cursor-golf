/** Global wind applied to already-moving dynamic world objects. */
export interface GlobalWindDynamicForceDefinition {
    /** Bodies below this linear speed are not started by global wind. */
    readonly minimumMovingSpeed: number;
    /** Reference mass used to convert environmental acceleration to impulse. */
    readonly referenceMass: number;
    /** Multiplier for global wind acceleration on dynamic objects. */
    readonly accelerationMultiplier: number;
    /** Safety cap on the impulse delivered in a single update. */
    readonly maximumImpulsePerStep: number;
    /** Prevent unusually large impulses after a paused or delayed frame. */
    readonly maximumDeltaTime: number;
}

export const DEFAULT_GLOBAL_WIND_DYNAMIC_FORCE_DEFINITION: GlobalWindDynamicForceDefinition = {
    minimumMovingSpeed: 2,
    referenceMass: 1,
    accelerationMultiplier: 1,
    maximumImpulsePerStep: 20,
    maximumDeltaTime: 1 / 30,
};
