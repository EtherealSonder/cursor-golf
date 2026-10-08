import type { FigmaAffineTransform, FigmaConversionDiagnostic, FigmaParsedObject, FigmaVector2, FigmaBounds } from './FigmaNodeDefinition';
import type { FigmaSvgMatchResult } from './FigmaSvgNodeMatcher';
import type { SvgGeometry } from './FigmaSvgGeometryExtractor';

/** Geometry in the root SVG viewBox coordinate system (before any game-world translation). */
export interface FigmaResolvedShape {
    readonly object: FigmaParsedObject;
    readonly geometry: SvgGeometry;
    readonly matrix: FigmaAffineTransform;
    readonly vertices: readonly FigmaVector2[];
    readonly bounds: FigmaBounds;
    readonly mirrored: boolean;
}
export interface FigmaResolvedGeometry {
    readonly shapes: ReadonlyMap<string, FigmaResolvedShape>;
    readonly diagnostics: readonly FigmaConversionDiagnostic[];
}
export interface FigmaResolvedOpening {
    readonly id: string;
    readonly edgeIndex: number;
    readonly start: number;
    readonly end: number;
}
export interface FigmaResolvedBumper {
    readonly id: string;
    readonly pivot: FigmaVector2;
    readonly rotationRadians: number;
    readonly mirrored: boolean;
}
/** Reject duplicate object IDs; unmatched objects remain errors rather than guessed geometry. */
export function resolveFigmaMatchedGeometry(result: FigmaSvgMatchResult): FigmaResolvedGeometry {
    const shapes = new Map<string, FigmaResolvedShape>();
    const diagnostics: FigmaConversionDiagnostic[] = [...result.diagnostics];
    for (const {object, geometry} of result.matches) {
        if (shapes.has(object.identity.id)) {
            diagnostics.push({severity:'error',code:'DUPLICATE_MATCH_ID',path:object.nodePath,message:`Duplicate gameplay ID ${object.identity.id}`});
            continue;
        }
        shapes.set(object.identity.id, {object,geometry,matrix:geometry.matrix,vertices:geometry.vertices,bounds:geometry.bounds,mirrored:geometry.mirrored});
    }
    return {shapes,diagnostics};
}
