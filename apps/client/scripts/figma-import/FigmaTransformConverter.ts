import type {
    FigmaAffineTransform, FigmaConversionDiagnostic, FigmaConvertedObject,
    FigmaExportDocument, FigmaNode, FigmaParsedObject, FigmaResolvedTransform,
} from "./FigmaNodeDefinition";
import { getFigmaTransformProfile } from "./FigmaObjectRegistry";
import { resolveTransformedAnchor, resolveNormalizedAnchor } from "./FigmaTransformStrategies";
import { svgAnchor } from "./FigmaCoordinateSpace";
import type { FigmaResolvedGeometry } from "./FigmaResolvedGeometry";

type Matrix = FigmaAffineTransform;
const IDENTITY: Matrix = [[1, 0, 0], [0, 1, 0]];
const mul = (a: Matrix, b: Matrix): Matrix => [
    [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1], a[0][0] * b[0][2] + a[0][1] * b[1][2] + a[0][2]],
    [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1], a[1][0] * b[0][2] + a[1][1] * b[1][2] + a[1][2]],
];
const isMatrix = (m: unknown): m is Matrix => Array.isArray(m) && m.length === 2 &&
    m.every(row => Array.isArray(row) && row.length === 3 && row.every(n => typeof n === "number" && Number.isFinite(n)));
const inverse = (m: Matrix): Matrix | null => {
    const det = m[0][0] * m[1][1] - m[0][1] * m[1][0];
    if (Math.abs(det) < 1e-9) return null;
    const a = m[1][1] / det, b = -m[0][1] / det, c = -m[1][0] / det, d = m[0][0] / det;
    return [[a, b, -a * m[0][2] - b * m[1][2]], [c, d, -c * m[0][2] - d * m[1][2]]];
};
const translation = (x: number, y: number): Matrix => [[1, 0, x], [0, 1, y]];
const rotation = (degrees: number): Matrix => {
    const r = degrees * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    return [[c, -s, 0], [s, c, 0]];
};

/**
 * Resolves the authored node's transform in root-frame-local space.
 * Pass `document` to compose parent transforms and remove the root frame's
 * placement. Without it, nested coordinates cannot be guaranteed correct.
 *
 * Rotation-only fallback assumes node x/y is the rotated rectangle's local
 * origin, not its axis-aligned bounding box. For -180 degrees or ambiguous
 * reflections, a full affine transform is required for faithful conversion.
 */
export function convertFigmaObject(object: FigmaParsedObject, document?: FigmaExportDocument, svg?: FigmaResolvedGeometry): FigmaConvertedObject {
    const diagnostics: FigmaConversionDiagnostic[] = [];
    const warn = (code: string, message: string, severity: "warning" | "error" = "warning") =>
        diagnostics.push({ severity, code, message, path: object.nodePath });
    const profile = getFigmaTransformProfile(object.identity.kind);
    const matched = svg?.shapes.get(object.identity.id);
    let matrix: Matrix | null = matched?.matrix ?? null;
    let frameOrigin: Matrix = IDENTITY;
    if (!matrix && document) {
        const roots = Array.isArray(document) ? document : "document" in document ? [document.document] : [document];
        const root = roots.find(r => r.name === object.nodePath[0]);
        if (root) {
            // Resolve path by names. Duplicate names in a single group are ambiguous.
            let cursor: FigmaNode | undefined = root;
            let parent: Matrix = IDENTITY;
            for (let i = 0; i < object.nodePath.length && cursor; i++) {
                if (i > 0) {
                    const matches: FigmaNode[] = (cursor.children ?? []).filter(n => n.name === object.nodePath[i]);
                    if (matches.length !== 1) { warn("AMBIGUOUS_NODE_PATH", "Cannot uniquely resolve nested node path.", "error"); cursor = undefined; break; }
                    cursor = matches[0];
                }
                const local = isMatrix(cursor.relativeTransform) ? cursor.relativeTransform : null;
                const absolute = isMatrix(cursor.absoluteTransform) ? cursor.absoluteTransform : null;
                const resolved = absolute ?? (local ? mul(parent, local) : mul(parent,
                    mul(translation(cursor.x ?? 0, cursor.y ?? 0), rotation(cursor.rotation ?? 0))));
                if (!absolute && !local && cursor.rotation && i === object.nodePath.length - 1) {
                    warn("ROTATION_FALLBACK", "No affine transform supplied; rotated x/y may refer to transformed bounds rather than local origin.");
                    if (Math.abs(Math.abs(cursor.rotation) - 180) < 0.01) {
                        warn("AMBIGUOUS_180_TRANSFORM", "Cannot distinguish 180-degree rotation from reflection; export a full transform matrix.", "error");
                    }
                }
                if (i === 0) frameOrigin = resolved;
                parent = resolved;
                if (i === object.nodePath.length - 1) matrix = resolved;
            }
        }
    }
    if (!matrix && isMatrix(object.absoluteTransform)) matrix = object.absoluteTransform;
    if (!matrix && isMatrix(object.relativeTransform) && object.nodePath.length <= 2) matrix = object.relativeTransform;
    if (!matrix) {
        if (object.nodePath.length > 2) warn("MISSING_PARENT_TRANSFORM", "Nested node has no resolvable parent transform; coordinates may be incorrect.", "error");
        const angle = object.rotationDegrees ?? 0;
        matrix = mul(translation(object.bounds.x, object.bounds.y), rotation(angle));
        if (Math.abs(Math.abs(angle) - 180) < 0.01) warn("AMBIGUOUS_180_TRANSFORM", "180-degree rotation cannot distinguish mirroring; export an affine matrix.");
        if (angle !== 0) warn("ROTATION_FALLBACK", "Rotation-only export assumes x/y represent the local origin; verify against SVG.");
    }
    const invRoot = matched ? IDENTITY : inverse(frameOrigin);
    if (!invRoot) warn("SINGULAR_ROOT_TRANSFORM", "Root frame transform is singular.", "error");
    const local = invRoot ? mul(invRoot, matrix) : matrix;
    const position = matched
        ? svgAnchor(matched.geometry, resolveNormalizedAnchor(profile))
        : resolveTransformedAnchor(object.bounds, profile, local);
    const det = local[0][0] * local[1][1] - local[0][1] * local[1][0];
    const scaleX = Math.hypot(local[0][0], local[1][0]);
    const scaleY = Math.hypot(local[0][1], local[1][1]);
    const mirrored = det < 0;
    const rotationRadians = Math.atan2(local[1][0], local[0][0]);
    if (mirrored && !profile.allowMirroring) warn("MIRROR_UNSUPPORTED", "This object type does not support mirrored placement.", "error");
    if (Math.abs(rotationRadians) > 1e-6 && !profile.allowRotation) warn("ROTATION_UNSUPPORTED", "This object type does not support rotation.", "error");
    if (Math.abs(local[0][0] * local[0][1] + local[1][0] * local[1][1]) > 1e-4) warn("SHEAR_UNSUPPORTED", "Skewed objects cannot be represented by the current level schema.", "error");
    if (Math.abs(scaleX - 1) > 1e-3 || Math.abs(scaleY - 1) > 1e-3) warn("NON_UNIT_SCALE", "Non-unit scaling must be validated against object sizing policy.");
    const transform: FigmaResolvedTransform = { matrix: local, position, rotationRadians, mirrored, determinant: det, scaleX, scaleY };
    return { object, transform, diagnostics };
}

export function convertFigmaObjects(objects: readonly FigmaParsedObject[], document?: FigmaExportDocument, svg?: FigmaResolvedGeometry): readonly FigmaConvertedObject[] {
    return objects.map(object => convertFigmaObject(object, document, svg));
}
