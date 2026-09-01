import {
    DEFAULT_GAME_VIEWPORT_DEFINITION,
} from "./GameViewportDefinition";

/**
 * Immutable configuration for the current arcade-friendly
 * Hole detection and capture implementation.
 */
export interface HoleDefinition {

    // -------------------------------------------------------------------------
    // World Placement
    // -------------------------------------------------------------------------

    readonly positionX: number;
    readonly positionY: number;

    // -------------------------------------------------------------------------
    // Hole Geometry and Capture Assistance
    // -------------------------------------------------------------------------

    /**
     * Visible radius of the Hole placeholder.
     */
    readonly visualRadius: number;

    /**
     * Invisible radial assistance added around the visible Hole.
     *
     * effectiveCaptureRadius =
     * visualRadius + captureAssistMargin
     */
    readonly captureAssistMargin: number;

    /**
     * Minimum normalized Ball entry required before capture is allowed.
     *
     * Entry ratio is measured from radial penetration divided by the
     * Ball diameter.
     *
     * A value of 0.2 means approximately twenty percent of the Ball
     * diameter must enter the effective capture region.
     */
    readonly minimumEntryRatio: number;

    /**
     * Allowed speed at the minimum accepted entry ratio.
     *
     * Measured in world pixels per second.
     */
    readonly minimumCaptureSpeed: number;

    /**
     * Allowed speed for a deep or central Hole entry.
     *
     * Measured in world pixels per second.
     */
    readonly maximumCaptureSpeed: number;

    /**
     * Shapes how quickly the allowed speed rises as entry depth improves.
     *
     * Values greater than one preserve stricter shallow-edge behaviour while
     * still becoming generous for accurate central entries.
     */
    readonly captureSpeedCurveExponent: number;

    // -------------------------------------------------------------------------
    // Capture Animation
    // -------------------------------------------------------------------------

    /**
     * Duration of the controlled Ball-to-Hole-centre movement and shrink.
     */
    readonly captureDuration: number;

    /**
     * Final Ball visual scale after capture.
     */
    readonly capturedBallScale: number;

    // -------------------------------------------------------------------------
    // Placeholder Visuals
    // -------------------------------------------------------------------------

    readonly fillColor: number;
    readonly fillAlpha: number;

    readonly outlineColor: number;
    readonly outlineAlpha: number;
    readonly outlineWidth: number;

    readonly tooFastOutlineColor: number;
    readonly validEntryOutlineColor: number;

    // -------------------------------------------------------------------------
    // Debug Presentation
    // -------------------------------------------------------------------------

    readonly showDebugCaptureRadius: boolean;
    readonly debugCaptureRadiusColor: number;
    readonly debugCaptureRadiusAlpha: number;
    readonly debugCaptureRadiusWidth: number;
}

/**
 * Temporary test Hole placed inside the initial logical viewport.
 */
export const DEFAULT_HOLE_DEFINITION:
    HoleDefinition = {

    positionX:
        DEFAULT_GAME_VIEWPORT_DEFINITION
            .width *
        0.75,

    positionY:
        DEFAULT_GAME_VIEWPORT_DEFINITION
            .height *
        0.5,

    visualRadius: 18,

    /*
     * Four pixels of invisible assistance keeps the visible Hole believable.
     *
     * With a Ball radius of ten pixels and a minimum entry ratio of 0.2,
     * the accepted shallow-entry distance is approximately equal to the
     * visible Hole radius plus the Ball radius.
     */
    captureAssistMargin: 4,

    minimumEntryRatio: 0.2,

    /*
     * A shallow but valid edge entry accepts a moderate rolling speed.
     * A deep or central entry can be travelling considerably faster.
     */
    minimumCaptureSpeed: 200,
    maximumCaptureSpeed: 360,
    captureSpeedCurveExponent: 1.35,

    captureDuration: 0.3,
    capturedBallScale: 0,

    fillColor: 0x111111,
    fillAlpha: 0.95,

    outlineColor: 0xd8d8d8,
    outlineAlpha: 0.85,
    outlineWidth: 2,

    tooFastOutlineColor: 0xff5b5b,
    validEntryOutlineColor: 0x6dff8b,

    showDebugCaptureRadius: true,
    debugCaptureRadiusColor: 0xffd166,
    debugCaptureRadiusAlpha: 0.65,
    debugCaptureRadiusWidth: 1,
};
