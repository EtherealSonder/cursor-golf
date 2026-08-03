import {
    DEFAULT_GAME_VIEWPORT_DEFINITION,
} from "./GameViewportDefinition";

/**
 * Immutable configuration for the cursor-driven
 * Camera system.
 */
export interface CameraDefinition {

    // -------------------------------------------------------
    // Logical Viewport
    // -------------------------------------------------------

    readonly viewportWidth:
    number;

    readonly viewportHeight:
    number;

    // -------------------------------------------------------
    // Initial Camera Position
    // -------------------------------------------------------

    readonly initialPositionX:
    number;

    readonly initialPositionY:
    number;

    // -------------------------------------------------------
    // Activation Boundary
    // -------------------------------------------------------

    /**
     * Activation-zone thickness as a fraction of the
     * current logical viewport dimensions.
     *
     * Each inset is applied on both opposing sides.
     *
     * Example:
     *
     * horizontalActivationInsetRatio = 0.22
     *
     * left inset  = 22%
     * right inset = 22%
     *
     * Remaining activation rectangle width:
     *
     * 100% - 22% - 22% = 56%
     */
    readonly horizontalActivationInsetRatio:
    number;

    readonly verticalActivationInsetRatio:
    number;

    /**
     * Pixel clamps keep activation-zone dimensions
     * usable on unusually small or unusually large
     * logical viewports.
     */
    readonly minimumHorizontalActivationInset:
    number;

    readonly maximumHorizontalActivationInset:
    number;

    readonly minimumVerticalActivationInset:
    number;

    readonly maximumVerticalActivationInset:
    number;

    // -------------------------------------------------------
    // Cursor Response
    // -------------------------------------------------------

    /**
     * Controls the nonlinear response applied to
     * normalized cursor penetration.
     *
     * A value of 1 preserves the smoothstep curve.
     *
     * Values below 1 make medium penetration more
     * responsive.
     *
     * Values above 1 make the response more gradual.
     */
    readonly inputResponseExponent:
    number;

    /**
     * Curved movement strengths below this value are
     * treated as zero.
     *
     * This prevents tiny pointer movements near the
     * activation boundary from producing persistent
     * Camera drift.
     */
    readonly minimumInputStrength:
    number;

    // -------------------------------------------------------
    // Camera Motion
    // -------------------------------------------------------

    /**
     * Maximum Camera translation speed.
     *
     * Units: world pixels per second.
     */
    readonly maximumPanSpeed:
    number;

    /**
     * Rate used while velocity moves toward a faster
     * target in the same direction.
     *
     * Units: world pixels per second squared.
     */
    readonly acceleration:
    number;

    /**
     * Rate used while slowing down, reversing, or
     * moving toward a lower target speed.
     *
     * Units: world pixels per second squared.
     */
    readonly deceleration:
    number;

    /**
     * When movement intent is zero and Camera speed
     * falls below this value, velocity is set exactly
     * to zero.
     *
     * Units: world pixels per second.
     */
    readonly velocityStopThreshold:
    number;

    /**
     * Maximum frame delta consumed by Camera motion.
     *
     * This prevents a suspended browser tab or large
     * frame hitch from producing a large Camera jump.
     *
     * Units: seconds.
     */
    readonly maximumDeltaTime:
    number;

    // -------------------------------------------------------
    // Debug Presentation
    // -------------------------------------------------------

    readonly debugActivationBoundaryVisible:
    boolean;
}

/**
 * Default Phase 4C.3.3 Camera-feel configuration.
 */
export const DEFAULT_CAMERA_DEFINITION:
    CameraDefinition = {

    // -------------------------------------------------------
    // Logical Viewport
    // -------------------------------------------------------

    viewportWidth:
        DEFAULT_GAME_VIEWPORT_DEFINITION
            .width,

    viewportHeight:
        DEFAULT_GAME_VIEWPORT_DEFINITION
            .height,

    // -------------------------------------------------------
    // Initial Camera Position
    // -------------------------------------------------------

    initialPositionX:
        0,

    initialPositionY:
        0,

    // -------------------------------------------------------
    // Activation Boundary
    // -------------------------------------------------------

    /*
     * 22% inset on both sides leaves a 56% wide
     * central activation rectangle.
     */
    horizontalActivationInsetRatio:
        0.22,

    /*
     * 22% inset on both sides leaves a 56% tall
     * central activation rectangle.
     */
    verticalActivationInsetRatio:
        0.22,

    minimumHorizontalActivationInset:
        90,

    maximumHorizontalActivationInset:
        300,

    minimumVerticalActivationInset:
        70,

    maximumVerticalActivationInset:
        210,

    // -------------------------------------------------------
    // Cursor Response
    // -------------------------------------------------------

    /*
     * Slightly below 1 makes the smoothstep response
     * more responsive through the middle of the
     * activation zone while preserving fine control
     * near its boundary.
     */
    inputResponseExponent:
        0.85,

    minimumInputStrength:
        0.004,

    // -------------------------------------------------------
    // Camera Motion
    // -------------------------------------------------------

    maximumPanSpeed:
        1200,

    acceleration:
        3000,

    /*
     * Deceleration is deliberately stronger than
     * acceleration.
     *
     * The Camera still eases to rest, but does not
     * drift for too long after the cursor returns to
     * the central activation rectangle.
     */
    deceleration:
        3600,

    velocityStopThreshold:
        4,

    maximumDeltaTime:
        0.05,

    // -------------------------------------------------------
    // Debug Presentation
    // -------------------------------------------------------

    debugActivationBoundaryVisible:
        true,
};