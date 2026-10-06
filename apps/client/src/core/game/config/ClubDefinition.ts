/**
 * Smallest full-power drag distance that any club definition may use.
 */
export const MINIMUM_CLUB_DRAG_DISTANCE = 80;

/**
 * Largest full-power drag distance that any club definition may use.
 */
export const MAXIMUM_CLUB_DRAG_DISTANCE = 360;

/**
 * Sprite-space configuration for the current club artwork.
 *
 * contactAnchorX/contactAnchorY identify the point on the source texture
 * that should coincide with the gameplay cursor and Ball interaction point.
 *
 * Keeping these values in configuration prevents asset-specific geometry
 * from being buried inside Club.ts.
 */
export interface ClubVisualDefinition {

    readonly renderScale: number;

    readonly contactAnchorX: number;

    readonly contactAnchorY: number;

    /**
     * Visual spacing between the Ball edge and the club contact point
     * while the shot is being prepared.
     */
    readonly headOffset: number;
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
    // Visuals
    // -------------------------------------------------------------------------

    readonly visual:
    ClubVisualDefinition;

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

    /*
     * The current golf_club.png is an 800 x 800 upright source sprite.
     *
     * The contact anchor is positioned on the broad striking-face region
     * of the club head rather than at the centre of the complete texture.
     * This makes the visible head follow the gameplay cursor instead of
     * inheriting the old diagonal-club anchor.
     */
    visual: {

        renderScale:
            0.10,

        contactAnchorX:
            0.33,

        contactAnchorY:
            0.86,

        headOffset:
            10,
    },

    maximumDragDistance:
        360,

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

};
