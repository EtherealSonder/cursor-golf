export interface GroundFireVfxDefinition {
    readonly enabled: boolean;

    /**
     * Base emission rate for one fully-intense authoritative FireCell.
     *
     * Actual emission is multiplied by the cell's current intensity in
     * GroundFireEmitter.
     */
    readonly particlesPerSecondPerCell: number;

    /**
     * Cells below this normalized intensity do not emit presentation
     * particles.
     */
    readonly minimumIntensity: number;

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

    /*
     * Previous dense-fire baseline was 36 particles/sec/cell.
     *
     * 46 is a controlled ~28% increase. It improves overlap without
     * multiplying the Sprite load aggressively.
     */
    particlesPerSecondPerCell:
        46,

    minimumIntensity:
        0.05,

    /*
     * Slightly broader horizontal overlap helps neighbouring cells visually
     * merge into one Fire body without exposing the 48 px Fire grid.
     */
    spawnHalfWidthMultiplier:
        0.64,

    spawnHalfHeightMultiplier:
        0.38,

    spawnOverscanX:
        6,

    spawnOverscanY:
        5,

    /*
     * Keep this conservative. Density should come from the sustained
     * particlesPerSecondPerCell rate, not large frame-recovery bursts.
     */
    maximumSpawnsPerCellPerFrame:
        4,
};
