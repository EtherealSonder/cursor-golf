import type { FigmaAnchor, FigmaBounds, FigmaTransformProfile } from "./FigmaNodeDefinition";

/** Anchor is normalized to the object's untransformed local rectangle. */
export function resolveNormalizedAnchor(profile: FigmaTransformProfile): FigmaAnchor {
    switch (profile.strategy) {
        case "topLeft": return { x: 0, y: 0 };
        case "center": return { x: 0.5, y: 0.5 };
        case "mechanicalPivot":
        case "customNormalized":
            if (!profile.anchor || !Number.isFinite(profile.anchor.x) || !Number.isFinite(profile.anchor.y)) {
                throw new Error(`Missing/invalid anchor for ${profile.strategy}`);
            }
            return profile.anchor;
    }
}
export function resolveAnchorOffset(bounds: FigmaBounds, profile: FigmaTransformProfile): { x: number; y: number } {
    const anchor = resolveNormalizedAnchor(profile);
    return { x: bounds.width * anchor.x, y: bounds.height * anchor.y };
}

/** Apply the complete affine transform to a local pivot, preserving reflections. */
export function resolveTransformedAnchor(
    bounds: FigmaBounds,
    profile: FigmaTransformProfile,
    matrix: import('./FigmaNodeDefinition').FigmaAffineTransform,
): { x: number; y: number } {
    const local = resolveAnchorOffset(bounds, profile);
    return { x: matrix[0][0] * local.x + matrix[0][1] * local.y + matrix[0][2],
        y: matrix[1][0] * local.x + matrix[1][1] * local.y + matrix[1][2] };
}
