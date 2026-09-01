/**
 * Smallest full-power drag distance that any club definition may use.
 */
export const MINIMUM_CLUB_DRAG_DISTANCE = 80;

/**
 * Largest full-power drag distance that any club definition may use.
 */
export const MAXIMUM_CLUB_DRAG_DISTANCE = 150;

/**
 * Simple visual configuration for the dotted aim guide.
 *
 * The guide communicates current aim direction and approximate
 * power through dot count. It does not display trajectory prediction,
 * accuracy colour, fading, pulses, tapering, or endpoint markers.
 */
export interface AimGuideDefinition {

    /**
     * Empty distance between the Ball centre and the first dot centre.
     */
    readonly startDistance: number;

    /**
     * Constant centre-to-centre spacing between neighbouring dots.
     */
    readonly dotSpacing: number;

    /**
     * Constant radius used by every guide dot.
     */
    readonly dotRadius: number;

    /**
     * Number of dots displayed at zero or minimum power.
     */
    readonly minimumDots: number;

    /**
     * Number of dots displayed at full power.
     */
    readonly maximumDots: number;

    /**
     * Constant colour used by every guide dot.
     */
    readonly dotColor: number;

    /**
     * Constant opacity used by every guide dot.
     */
    readonly dotAlpha: number;
}

/**
 * Defines all club-specific gameplay and aiming characteristics.
 */
export interface ClubDefinition {

    // -------------------------------------------------------------------------
    // Identity
    // -------------------------------------------------------------------------

    readonly id: string;
    readonly name: string;

    // -------------------------------------------------------------------------
    // Shot Power
    // -------------------------------------------------------------------------

    /**
     * Mouse drag distance that represents full normalized shot power.
     */
    readonly maximumDragDistance: number;

    // -------------------------------------------------------------------------
    // Accuracy Oscillation
    // -------------------------------------------------------------------------

    /**
     * Whether the club's aim direction oscillates while preparing a shot.
     *
     * Disabled for normal gameplay for now. The existing oscillation
     * system can later be reused by negative debuffs or special modifiers.
     */
    readonly oscillationEnabled: boolean;

    /**
     * Maximum angular offset from the player's base aim direction.
     */
    readonly oscillationAngle: number;

    /**
     * Percentage of the maximum oscillation angle treated as optimal.
     */
    readonly optimalAccuracyRatio: number;

    /**
     * Oscillation phase speed at minimum shot power.
     */
    readonly minimumOscillationSpeed: number;

    /**
     * Oscillation phase speed at maximum shot power.
     */
    readonly maximumOscillationSpeed: number;

    /**
     * Redistributes oscillation movement across its arc.
     */
    readonly oscillationCurveStrength: number;

    // -------------------------------------------------------------------------
    // Aim Guide
    // -------------------------------------------------------------------------

    readonly aimGuide:
    AimGuideDefinition;
}

/**
 * Definition used by the currently equipped temporary club.
 */
export const BASIC_CLUB_DEFINITION:
    ClubDefinition = {

    id:
        "basic-club",

    name:
        "Basic Club",

    maximumDragDistance:
        150,

    oscillationEnabled:
        false,

    /*
     * Math.PI / 4 equals 45 degrees.
     */
    oscillationAngle:
        Math.PI /
        4,

    /*
     * Fifteen percent of 45 degrees creates an optimal tolerance
     * of approximately plus or minus 6.75 degrees.
     */
    optimalAccuracyRatio:
        0.15,

    minimumOscillationSpeed:
        3.0,

    maximumOscillationSpeed:
        8.0,

    oscillationCurveStrength:
        0.20,

    aimGuide: {

        startDistance:
            28,

        dotSpacing:
            13,

        dotRadius:
            3,

        /*
         * Guide length grows intuitively with power.
         */
        minimumDots:
            8,

        maximumDots:
            20,

        dotColor:
            0xffffff,

        dotAlpha:
            0.92,
    },
};
