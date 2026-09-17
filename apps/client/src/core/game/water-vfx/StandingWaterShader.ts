/**
 * Phase 8I-1E standing-Water scalar presentation helpers.
 *
 * The authoritative WaterField diagnostic showed that the real standing-Water
 * footprint is substantially larger than the previously visible blue region.
 * Production presentation must therefore preserve shallow tracked Water cells
 * instead of requiring them to approach gameplay "full effect" depth before
 * becoming readable.
 *
 * This code is presentation-only. It never writes to WaterField.
 */

export function getStandingWaterAlpha(
    depth:
        number,

    minimumVisibleDepth:
        number,

    edgeTransitionDepth:
        number,

    fullScaleDepth:
        number,

    shallowAlpha:
        number,

    baseAlpha:
        number,

    deepAlpha:
        number,
): number {
    if (
        !Number.isFinite(depth) ||
        depth <= minimumVisibleDepth
    ) {
        return 0;
    }

    const minimum =
        Math.max(
            0,
            minimumVisibleDepth,
        );

    const shallowDepth =
        Math.max(
            minimum + 1e-6,
            edgeTransitionDepth,
        );

    const fullDepth =
        Math.max(
            shallowDepth + 1e-6,
            fullScaleDepth,
        );

    const shallow =
        clamp01(
            shallowAlpha,
        );

    const base =
        clamp01(
            baseAlpha,
        );

    const deep =
        clamp01(
            deepAlpha,
        );

    /*
     * Shallow tracked Water becomes readable quickly. The narrow transition
     * above minimumVisibleDepth prevents a hard numerical on/off edge, while
     * avoiding the previous behaviour where most of the authoritative puddle
     * was almost transparent.
     */
    if (depth < shallowDepth) {
        const t =
            smooth01(
                (
                    depth -
                    minimum
                ) /
                (
                    shallowDepth -
                    minimum
                ),
            );

        return shallow * t;
    }

    /*
     * Once Water reaches shallowDepth it is already a clearly visible puddle.
     * Additional depth changes opacity gently rather than controlling whether
     * the puddle exists visually at all.
     */
    const depthT =
        smooth01(
            (
                depth -
                shallowDepth
            ) /
            (
                fullDepth -
                shallowDepth
            ),
        );

    if (depthT <= 0.5) {
        return (
            shallow +
            (
                base -
                shallow
            ) *
            (
                depthT *
                2
            )
        );
    }

    return (
        base +
        (
            deep -
            base
        ) *
        (
            (
                depthT -
                0.5
            ) *
            2
        )
    );
}

function smooth01(
    value:
        number,
): number {
    const t =
        clamp01(
            value,
        );

    return (
        t *
        t *
        (
            3 -
            2 *
            t
        )
    );
}

function clamp01(
    value:
        number,
): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(
        0,
        Math.min(
            1,
            value,
        ),
    );
}
