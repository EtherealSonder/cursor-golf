/**
 * Presentation-only configuration for the golf Ball motion trail.
 *
 * The trail reads Ball position and speed but never participates in physics.
 */
export interface BallTrailDefinition {

    readonly bodyColor:
    number;

    readonly bodyMinimumAlpha:
    number;

    readonly bodyMaximumAlpha:
    number;

    readonly edgeColor:
    number;

    readonly edgeAlpha:
    number;

    readonly edgeWidth:
    number;

    readonly maximumWidth:
    number;

    /**
     * Minimum fraction of maximumWidth retained at low speed and at the
     * oldest end of the taper. Prevents weak trails becoming sub-pixel thin.
     */
    readonly minimumWidthRatio:
    number;

    /**
     * Trail begins to become visible above this Ball speed in world px/s.
     */
    readonly minimumVisibleSpeed:
    number;

    /**
     * Speed at which the trail reaches its configured maximum length/alpha.
     */
    readonly fullEffectSpeed:
    number;

    readonly minimumTrailLength:
    number;

    readonly maximumTrailLength:
    number;

    /**
     * Minimum world-space movement before a new historical point is stored.
     */
    readonly sampleSpacing:
    number;

    /**
     * Defensive hard cap for trajectory history.
     */
    readonly maximumSamples:
    number;

    /**
     * Maximum rate at which the retained trail length can grow.
     */
    readonly extensionSpeed:
    number;

    /**
     * Rate at which the trail contracts when Ball speed falls.
     */
    readonly contractionSpeed:
    number;
}

export const DEFAULT_BALL_TRAIL_DEFINITION:
    BallTrailDefinition = {

    /*
     * Ball-derived warm ivory. This stays readable against the green course
     * while remaining lighter and less saturated than the Sand surface.
     */
    bodyColor:
        0xfff4d6,

    bodyMinimumAlpha:
        0.27,

    bodyMaximumAlpha:
        0.66,

    /*
     * Cursor Golf Storybook Ink, intentionally very faint so the trail reads
     * as motion rather than as a heavy outlined object.
     */
    edgeColor:
        0x403442,

    edgeAlpha:
        0.16,

    edgeWidth:
        1.35,

    /*
     * The Ball diameter is 20 world px. Keeping the trail narrower than the
     * Ball preserves the Ball as the visual focal point.
     */
    maximumWidth:
        8.5,

    /*
     * Keep the tail visibly tapered without allowing it to collapse to a
     * zero-width needle. The same floor also keeps weak-shot trails readable.
     */
    minimumWidthRatio:
        0.34,

    /*
     * Current Ball physics:
     * stop threshold = 12 px/s
     * minimum launch = 120 px/s
     * maximum speed = 1200 px/s
     *
     * The trail therefore appears shortly above near-rest motion and reaches
     * full presentation well before the absolute physics speed cap.
     */
    minimumVisibleSpeed:
        20,

    fullEffectSpeed:
        750,

    minimumTrailLength:
        24,

    maximumTrailLength:
        165,

    sampleSpacing:
        4,

    maximumSamples:
        48,

    /*
     * Extension is quick enough to respond immediately to a shot. Contraction
     * is deliberately slower so a stopped Ball leaves a short-lived trajectory
     * that shrinks naturally from its oldest end.
     */
    extensionSpeed:
        720,

    contractionSpeed:
        150,
};
