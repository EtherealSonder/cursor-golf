export interface GroundFireVfxDefinition {
    readonly enabled: boolean;

    /**
     * Base emission rate for one fully-energized authoritative FireCell.
     */
    readonly particlesPerSecondPerCell: number;

    /**
     * Cells below this normalized authoritative intensity do not emit.
     */
    readonly minimumIntensity: number;

    /**
     * FIRE-VFX-3B presentation mapping.
     *
     * FireManager remains authoritative. GroundFireEmitter combines:
     *
     * - FireCell intensity
     * - FireCell age
     *
     * into one normalized visualEnergy value.
     *
     * The current FireManager already folds fuel/moisture combustion response
     * into FireCell intensity, so the VFX layer deliberately does not query or
     * mutate EnvironmentField independently.
     */
    readonly visualEnergy: {
        /**
         * Fraction of Fire lifetime used for the quick ignition/build-up ramp.
         */
        readonly ignitionRampLifetimeFraction: number;

        /**
         * Shapes authoritative intensity before it contributes to visualEnergy.
         * Values below 1 keep medium-strength Fire visually readable.
         */
        readonly intensityExponent: number;

        /**
         * Response ranges from weak Fire -> fully energized Fire.
         */
        readonly minimumEmissionMultiplier: number;
        readonly maximumEmissionMultiplier: number;

        readonly minimumScaleMultiplier: number;
        readonly maximumScaleMultiplier: number;

        readonly minimumAlphaMultiplier: number;
        readonly maximumAlphaMultiplier: number;

        readonly minimumSpeedMultiplier: number;
        readonly maximumSpeedMultiplier: number;
    };

    /**
     * FIRE-VFX-3C deterministic emitter-state safety limits.
     */
    readonly emitterState: {
        readonly maximumTrackedStates: number;
        readonly maximumCarryParticles: number;
    };

    /**
     * GroundFireEmitter samples an elliptical spawn region around the
     * FireCell centre. These multipliers are relative to Fire cellSize.
     */
    readonly spawnHalfWidthMultiplier: number;
    readonly spawnHalfHeightMultiplier: number;

    /**
     * Small extra world-space spread beyond the cell-relative ellipse.
     */
    readonly spawnOverscanX: number;
    readonly spawnOverscanY: number;

    /**
     * Safety cap preventing a slow frame from producing a large catch-up
     * burst from every active FireCell.
     */
    readonly maximumSpawnsPerCellPerFrame: number;
}

export const DEFAULT_GROUND_FIRE_VFX_DEFINITION:
    GroundFireVfxDefinition = {

    enabled:
        true,

    particlesPerSecondPerCell:
        46,

    minimumIntensity:
        0.05,

    visualEnergy: {
        /*
         * Fire should establish quickly rather than popping at full size on
         * the first frame. With the current short Fire lifetime this remains
         * a brief presentation ramp, not a slow "breathing" animation.
         */
        ignitionRampLifetimeFraction:
            0.12,

        /*
         * Slightly sub-linear response preserves visible flame body while
         * authoritative intensity is beginning to fall.
         */
        intensityExponent:
            0.82,

        /*
         * Low-energy Fire remains visible but becomes clearly thinner.
         * Full-energy values preserve the FIRE-VFX-3A density baseline.
         */
        minimumEmissionMultiplier:
            0.28,

        maximumEmissionMultiplier:
            1.0,

        minimumScaleMultiplier:
            0.66,

        maximumScaleMultiplier:
            1.0,

        minimumAlphaMultiplier:
            0.48,

        maximumAlphaMultiplier:
            1.0,

        minimumSpeedMultiplier:
            0.74,

        maximumSpeedMultiplier:
            1.0,
    },

    emitterState: {
        /*
         * FireManager currently caps active FireCells at 128. This leaves
         * bounded headroom without allowing VFX bookkeeping to grow freely.
         */
        maximumTrackedStates:
            192,

        /*
         * Prevent long catch-up bursts after a slow frame.
         */
        maximumCarryParticles:
            1.5,
    },

    spawnHalfWidthMultiplier:
        0.64,

    spawnHalfHeightMultiplier:
        0.38,

    spawnOverscanX:
        6,

    spawnOverscanY:
        5,

    maximumSpawnsPerCellPerFrame:
        4,
};
