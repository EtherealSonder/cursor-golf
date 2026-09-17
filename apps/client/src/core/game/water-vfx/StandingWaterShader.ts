/**
 * Phase 8I-2 standing-Water presentation helpers.
 *
 * The authoritative WaterField is never modified here. The illustrated Water
 * body becomes opaque very quickly after the narrow silhouette transition.
 * Depth therefore stops behaving like transparency and is free to drive the
 * restrained colour hierarchy in StandingWaterRenderer.
 */

export function getStandingWaterAlpha(
    depth: number,
    minimumVisibleDepth: number,
    edgeTransitionDepth: number,
    fullScaleDepth: number,
    shallowAlpha: number,
    baseAlpha: number,
    deepAlpha: number,
): number {
    if (!Number.isFinite(depth) || depth <= minimumVisibleDepth) {
        return 0;
    }

    const minimum = Math.max(0, minimumVisibleDepth);
    const bodyStartDepth = Math.max(minimum + 1e-6, edgeTransitionDepth);
    const fullDepth = Math.max(bodyStartDepth + 1e-6, fullScaleDepth);

    const shallow = clamp01(shallowAlpha);
    const base = clamp01(baseAlpha);
    const deep = clamp01(deepAlpha);

    // Only the very narrow reconstructed boundary uses meaningful translucency.
    if (depth < bodyStartDepth) {
        const t = smooth01(
            (depth - minimum) /
            (bodyStartDepth - minimum),
        );

        return shallow * t;
    }

    // The actual puddle body is already near opaque. Extra depth only makes
    // the final approach to full opacity subtle.
    const depthT = smooth01(
        (depth - bodyStartDepth) /
        (fullDepth - bodyStartDepth),
    );

    if (depthT <= 0.5) {
        return shallow + (base - shallow) * (depthT * 2);
    }

    return base + (deep - base) * ((depthT - 0.5) * 2);
}

/**
 * Presentation-only depth normalization used for restrained Water colour.
 */
export function getStandingWaterDepthFactor(
    depth: number,
    minimumVisibleDepth: number,
    fullScaleDepth: number,
): number {
    if (!Number.isFinite(depth) || depth <= minimumVisibleDepth) {
        return 0;
    }

    const minimum = Math.max(0, minimumVisibleDepth);
    const full = Math.max(minimum + 1e-6, fullScaleDepth);

    return smooth01(
        (depth - minimum) /
        (full - minimum),
    );
}

function smooth01(value: number): number {
    const t = clamp01(value);
    return t * t * (3 - 2 * t);
}

function clamp01(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.max(0, Math.min(1, value));
}
