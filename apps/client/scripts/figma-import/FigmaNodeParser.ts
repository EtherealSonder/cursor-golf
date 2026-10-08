import type {
    FigmaAffineTransform, FigmaBounds, FigmaExportDocument, FigmaNode,
    FigmaParseDiagnostic, FigmaParsedObject, FigmaParseResult,
} from "./FigmaNodeDefinition";
import { identifyFigmaObject } from "./FigmaObjectRegistry";
import { frameLocalBounds } from "./FigmaCoordinateSpace";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNode(value: unknown): value is FigmaNode {
    return isRecord(value) && typeof value.name === "string" && typeof value.type === "string";
}
function validBounds(node: Partial<FigmaBounds>): FigmaBounds | null {
    const { x, y, width, height } = node;
    if (![x, y, width, height].every(v => typeof v === "number" && Number.isFinite(v))) return null;
    if (width! <= 0 || height! <= 0) return null;
    return { x: x!, y: y!, width: width!, height: height! };
}
function validTransform(value: unknown): value is FigmaAffineTransform {
    return Array.isArray(value) && value.length === 2 && value.every(row =>
        Array.isArray(row) && row.length === 3 && row.every(n => typeof n === "number" && Number.isFinite(n)));
}

/**
 * Parses both the user's array-of-frames export and a {document: node} export.
 * FI-1 does not infer mirroring from rotation or perform coordinate conversion.
 */
export function parseFigmaNodes(input: unknown): FigmaParseResult {
    const diagnostics: FigmaParseDiagnostic[] = [];
    const objects: FigmaParsedObject[] = [];
    const seen = new Set<string>();
    let visitedNodeCount = 0;
    let ignoredNodeCount = 0;
    const rawRoots: unknown = Array.isArray(input) ? input
        : isRecord(input) && "document" in input ? input.document : input;
    const roots: unknown[] = Array.isArray(rawRoots) ? rawRoots : [rawRoots];
    if (!roots.length || roots.some(root => !isNode(root))) {
        diagnostics.push({ severity: "error", code: "INVALID_ROOT", path: [],
            message: "Expected Figma node(s) or an object with a document node." });
        return { objects, diagnostics, visitedNodeCount, ignoredNodeCount };
    }

    function walk(node: FigmaNode, parentPath: readonly string[], depth: number, indexPath: readonly number[]): void {
        const path = [...parentPath, node.name];
        if (depth > 100) {
            diagnostics.push({ severity: "error", code: "MAX_DEPTH", path,
                message: "Node nesting exceeds 100 levels." });
            return;
        }
        visitedNodeCount++;
        if (node.visible === false) { ignoredNodeCount++; return; }
        const identity = identifyFigmaObject(node.name);
        if (identity) {
            const bounds = validBounds(node);
            if (!bounds) {
                diagnostics.push({ severity: "error", code: "INVALID_BOUNDS", path,
                    message: "Recognized object must have finite x, y, width, height with positive dimensions." });
            } else if (seen.has(identity.id)) {
                diagnostics.push({ severity: "error", code: "DUPLICATE_OBJECT_ID", path,
                    message: `Duplicate gameplay object ID: ${identity.id}` });
            } else {
                seen.add(identity.id);
                if (node.rotation !== undefined && !Number.isFinite(node.rotation)) {
                    diagnostics.push({ severity: "warning", code: "INVALID_ROTATION", path,
                        message: "Rotation is not finite; FI-2 must not use it." });
                }
                objects.push({
                    identity, name: node.name, type: node.type, nodePath: path, bounds: frameLocalBounds(bounds),
                    coordinateSpace: "frameLocal",
                    sourceOrder: visitedNodeCount - 1, sourceIndexPath: indexPath,
                    ...(typeof node.id === "string" ? { sourceId: node.id } : {}),
                    ...(typeof node.rotation === "number" && Number.isFinite(node.rotation)
                        ? { rotationDegrees: node.rotation } : {}),
                    ...(validTransform(node.relativeTransform)
                        ? { relativeTransform: node.relativeTransform } : {}),
                    ...(validTransform(node.absoluteTransform)
                        ? { absoluteTransform: node.absoluteTransform } : {}),
                    ...(node.absoluteBoundingBox && validBounds(node.absoluteBoundingBox)
                        ? { absoluteBoundingBox: validBounds(node.absoluteBoundingBox)! } : {}),
                    sourceNode: node,
                });
            }
            // Component instance owns its descendants; nested art is not a new game object.
            return;
        }
        ignoredNodeCount++;
        if (Array.isArray(node.children)) {
            for (const [childIndex, child] of node.children.entries()) {
                if (!isNode(child)) {
                    diagnostics.push({ severity: "warning", code: "INVALID_CHILD", path,
                        message: "Skipped child without a valid name/type." });
                    continue;
                }
                walk(child, path, depth + 1, [...indexPath, childIndex]);
            }
        }
    }
    for (const [rootIndex, root] of (roots as FigmaNode[]).entries()) walk(root, [], 0, [rootIndex]);
    return { objects, diagnostics, visitedNodeCount, ignoredNodeCount };
}

/** Convenience entry for JSON text, without Node.js dependencies. */
export function parseFigmaJson(json: string): FigmaParseResult {
    return parseFigmaNodes(JSON.parse(json) as FigmaExportDocument);
}
