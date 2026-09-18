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
    _fullScaleDepth: number,
    shallowAlpha: number,
    baseAlpha: number,
    deepAlpha: number,
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

    const edgeEnd =
        Math.max(
            minimum + 1e-6,
            edgeTransitionDepth,
        );

    /*
     * 8I-8B illustrated puddle body.
     *
     * Depth no longer drives a long transparency ramp. Only the very narrow
     * visibility transition is antialiased. Once Water is established, the
     * body immediately settles to one stable near-opaque alpha.
     */
    const bodyAlpha =
        clamp01(
            (
                clamp01(shallowAlpha) +
                clamp01(baseAlpha) +
                clamp01(deepAlpha)
            ) /
            3,
        );

    if (depth >= edgeEnd) {
        return bodyAlpha;
    }

    const coverage =
        smooth01(
            (depth - minimum) /
            (edgeEnd - minimum),
        );

    return bodyAlpha *
        coverage;
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

/**
 * Returns a deterministic illustrated highlight strength for one Water texel.
 *
 * Highlights are anchored to WaterField grid/world space, so camera movement
 * cannot make them swim across the puddle. Each large spacing tile contributes
 * at most one tiny 2-3-cell dash/oval. The depth gate keeps marks away from the
 * translucent fringe and prevents tiny shallow puddles from becoming noisy.
 *
 * This is presentation only. It performs no Water queries beyond data already
 * being traversed by StandingWaterRenderer and creates no Pixi display objects.
 */
export function getStandingWaterHighlightStrength(
    index: number,
    columnCount: number,
    depthFactor: number,
    minimumDepthFactor: number,
    spacingCellsX: number,
    spacingCellsY: number,
): number {
    if (
        !Number.isInteger(index) ||
        index < 0 ||
        !Number.isInteger(columnCount) ||
        columnCount <= 0 ||
        depthFactor < clamp01(minimumDepthFactor)
    ) {
        return 0;
    }

    const spacingX = Math.max(6, Math.floor(spacingCellsX));
    const spacingY = Math.max(6, Math.floor(spacingCellsY));

    const gridX = index % columnCount;
    const gridY = Math.floor(index / columnCount);

    const tileX = Math.floor(gridX / spacingX);
    const tileY = Math.floor(gridY / spacingY);

    // Stable integer hash. Only used to choose an authored-looking offset and
    // whether this tile receives a mark at all.
    const hash = hash2d(tileX, tileY);

    // Roughly three quarters of tiles receive no mark. This keeps the surface
    // deliberately sparse even on very large connected Water bodies.
    if ((hash & 3) !== 0) {
        return 0;
    }

    const usableX = Math.max(1, spacingX - 6);
    const usableY = Math.max(1, spacingY - 6);

    const originX =
        tileX * spacingX +
        2 +
        ((hash >>> 3) % usableX);

    const originY =
        tileY * spacingY +
        2 +
        ((hash >>> 11) % usableY);

    const dx = gridX - originX;
    const dy = gridY - originY;

    // A tiny asymmetric 3-cell glint. Linear texture filtering softens the
    // cells into a compact oval/dash instead of a hard pixel pattern.
    if (dy === 0 && (dx === 0 || dx === 1)) {
        return 1;
    }

    if (dx === 0 && dy === 1) {
        return 0.55;
    }

    return 0;
}

function hash2d(x: number, y: number): number {
    let value =
        Math.imul(x + 1, 0x1f123bb5) ^
        Math.imul(y + 1, 0x5f356495);

    value ^= value >>> 16;
    value = Math.imul(value, 0x45d9f3b);
    value ^= value >>> 16;

    return value >>> 0;
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
