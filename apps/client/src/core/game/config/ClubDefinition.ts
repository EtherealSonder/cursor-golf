/**
 * Smallest full-power drag distance that
 * any club definition is allowed to use.
 *
 * This does not impose a minimum player drag.
 * The player can still drag from zero pixels.
 */
export const MINIMUM_CLUB_DRAG_DISTANCE = 80;

/**
 * Largest full-power drag distance that
 * any club definition is allowed to use.
 */
export const MAXIMUM_CLUB_DRAG_DISTANCE = 150;

/**
 * Visual configuration for the dotted
 * aim guide displayed while preparing a shot.
 */
export interface AimGuideDefinition {

    /**
     * Empty distance between the ball centre
     * and the centre of the first visible dot.
     */
    readonly startDistance: number;

    /**
     * Centre-to-centre spacing between
     * neighbouring guide dots.
     */
    readonly dotSpacing: number;

    /**
     * Radius of the first and largest dot,
     * positioned closest to the ball.
     */
    readonly maximumDotRadius: number;

    /**
     * Radius of the final and smallest dot,
     * positioned farthest from the ball.
     */
    readonly minimumDotRadius: number;

    /**
     * Maximum number of visible dots
     * at minimum shot power.
     */
    readonly maximumDots: number;

    /**
     * Minimum number of visible dots
     * at maximum shot power.
     */
    readonly minimumDots: number;

    // -------------------------------------------------------
    // Accuracy Appearance
    // -------------------------------------------------------

    /**
     * Dot colour used while the oscillation
     * offset remains inside the optimal range.
     */
    readonly optimalColor: number;

    /**
     * Dot colour used at the outer edge of the
     * club's maximum oscillation range.
     */
    readonly edgeColor: number;

    /**
     * Dot opacity while the oscillation offset
     * remains inside the optimal range.
     */
    readonly optimalAlpha: number;

    /**
     * Dot opacity at the outer edge of the
     * maximum oscillation range.
     */
    readonly edgeAlpha: number;
}

/**
 * Defines all club-specific gameplay
 * and aiming characteristics.
 *
 * Multiple club definitions can later use the
 * same Club, ShotPreparation, and AimIndicator
 * implementations with different values.
 */
export interface ClubDefinition {

    // -------------------------------------------------------
    // Identity
    // -------------------------------------------------------

    /**
     * Stable machine-readable identifier.
     */
    readonly id: string;

    /**
     * Human-readable name shown in debug
     * output and future club-selection UI.
     */
    readonly name: string;

    // -------------------------------------------------------
    // Shot Power
    // -------------------------------------------------------

    /**
     * Mouse drag distance that represents
     * full normalized shot power.
     *
     * This value also controls the maximum
     * visible distance between the club
     * and the ball while dragging.
     */
    readonly maximumDragDistance: number;

    // -------------------------------------------------------
    // Accuracy Oscillation
    // -------------------------------------------------------

    /**
     * Maximum angular offset from the
     * player's base aim direction.
     *
     * Stored in radians.
     */
    readonly oscillationAngle: number;

    /**
     * Percentage of the maximum oscillation
     * angle treated as the optimal release zone.
     *
     * Example:
     *
     * oscillationAngle = 45 degrees
     * optimalAccuracyRatio = 0.15
     *
     * optimal tolerance = ±6.75 degrees
     */
    readonly optimalAccuracyRatio: number;

    /**
     * Oscillation phase speed at
     * minimum shot power.
     */
    readonly minimumOscillationSpeed: number;

    /**
     * Oscillation phase speed at
     * maximum shot power.
     */
    readonly maximumOscillationSpeed: number;

    /**
     * Controls how strongly the oscillation
     * movement is redistributed across its arc.
     */
    readonly oscillationCurveStrength: number;

    // -------------------------------------------------------
    // Aim Guide
    // -------------------------------------------------------

    readonly aimGuide: AimGuideDefinition;
}

/**
 * Definition used by the currently equipped
 * temporary club.
 */
export const BASIC_CLUB_DEFINITION: ClubDefinition = {
    id: "basic-club",
    name: "Basic Club",

    maximumDragDistance: 80,

    /*
     * Math.PI / 4 equals 45 degrees.
     */
    oscillationAngle: Math.PI / 4,

    /*
     * Fifteen percent of 45 degrees creates
     * an optimal tolerance of ±6.75 degrees.
     */
    optimalAccuracyRatio: 0.15,

    minimumOscillationSpeed: 3.0,
    maximumOscillationSpeed: 8.0,

    oscillationCurveStrength: 0.20,

    aimGuide: {
        /*
         * The first dot begins slightly farther
         * from the ball than before, creating a
         * cleaner visual gap around the ball.
         */
        startDistance: 28,

        /*
         * Increased centre-to-centre spacing gives
         * the guide more visible reach without
         * making the dots feel tightly packed.
         */
        dotSpacing: 13,

        maximumDotRadius: 4,
        minimumDotRadius: 1.5,

        /*
         * Low-power guide:
         *
         * 24 dots
         * Approximate end distance:
         *
         * 28 + (23 × 13) + 1.5
         * = 328.5 pixels
         */
        maximumDots: 24,

        /*
         * Maximum-power guide:
         *
         * 12 dots
         * Approximate end distance:
         *
         * 28 + (11 × 13) + 1.5
         * = 172.5 pixels
         */
        minimumDots: 12,

        /*
         * The guide remains bright white inside
         * the optimal accuracy tolerance.
         */
        optimalColor: 0xffffff,
        optimalAlpha: 1,

        /*
         * The guide remains white even at the outer
         * oscillation edges. Only opacity changes.
         */
        edgeColor: 0xffffff,
        edgeAlpha: 0.5,
    },
};