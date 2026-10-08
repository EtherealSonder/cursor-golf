import type { LevelDefinition, LevelObjectPlacement } from "../../src/core/game/level/LevelDefinition";
import type { FigmaConversionDiagnostic, FigmaExportDocument, FigmaNode } from "./FigmaNodeDefinition";
import { parseFigmaNodes } from "./FigmaNodeParser";
import { convertFigmaObjects } from "./FigmaTransformConverter";
import { convertFigmaGeometry } from "./FigmaGeometryConverter";
import { getFigmaLevelObjectHandler } from "./FigmaObjectRegistry";
import type { FigmaResolvedGeometry } from "./FigmaResolvedGeometry";

export interface FigmaGenerationResult {
    readonly level: LevelDefinition | null;
    readonly diagnostics: readonly FigmaConversionDiagnostic[];
    readonly objectCount: number;
    readonly serializedCount?: number;
    readonly sourceNames?: readonly string[];
}
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "untitled";
function rootFrame(document: unknown): FigmaNode | null {
    const source = document && typeof document === "object" && !Array.isArray(document) && "document" in document
        ? (document as { document: unknown }).document : document;
    const roots: unknown[] = Array.isArray(source) ? source : [source];
    if (roots.length !== 1) return null;
    const root = roots[0];
    if (!root || typeof root !== "object" || !("name" in root) || !("type" in root)) return null;
    return root as FigmaNode;
}
/** Pure FI-3 generator: no filesystem writes and no runtime entity creation. */
export function generateFigmaLevel(document: unknown, levelId?: string, svg?: FigmaResolvedGeometry): FigmaGenerationResult {
    const parsed = parseFigmaNodes(document);
    const diagnostics: FigmaConversionDiagnostic[] = [...parsed.diagnostics];
    const root = rootFrame(document);
    if (!root || root.type !== "FRAME" || !Number.isFinite(root.width) || !Number.isFinite(root.height)
        || (root.width ?? 0) <= 0 || (root.height ?? 0) <= 0) {
        diagnostics.push({ severity: "error", code: "INVALID_LEVEL_FRAME", path: [], message: "Expected one root FRAME with positive width and height." });
        return { level: null, diagnostics, objectCount: parsed.objects.length };
    }
    const converted = convertFigmaObjects(parsed.objects, document as FigmaExportDocument, svg);
    for (const item of converted) diagnostics.push(...item.diagnostics);
    const geometry = convertFigmaGeometry(converted, root.width!, root.height!, svg);
    diagnostics.push(...geometry.diagnostics);
    const ball = converted.filter(item => item.object.identity.kind === "ballSpawn");
    const hole = converted.filter(item => item.object.identity.kind === "hole");
    if (ball.length !== 1) diagnostics.push({ severity: "error", code: "BALL_COUNT", path: [], message: `Expected one ball spawn; found ${ball.length}.` });
    if (hole.length !== 1) diagnostics.push({ severity: "error", code: "HOLE_COUNT", path: [], message: `Expected one hole; found ${hole.length}.` });
    const objects: LevelObjectPlacement[] = [];
    for (const item of converted) {
        const kind = item.object.identity.kind;
        if (kind === "courseBoundary" || kind === "wallOpening" || kind === "ballSpawn" || kind === "hole") continue;
        const handler = getFigmaLevelObjectHandler(kind);
        if (!handler) {
            diagnostics.push({ severity: "error", code: "MISSING_OBJECT_HANDLER", path: item.object.nodePath, message: `No level handler registered for ${kind}.` });
            continue;
        }
        try { objects.push(handler(item)); }
        catch (error) { diagnostics.push({ severity: "error", code: "OBJECT_CONVERSION_FAILED", path: item.object.nodePath, message: String(error) }); }
    }
    if (!geometry.course || ball.length !== 1 || hole.length !== 1) return { level: null, diagnostics, objectCount: parsed.objects.length };
    const id = levelId ?? slug(root.name);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
        diagnostics.push({ severity: "error", code: "INVALID_GENERATED_ID", path: [], message: "Level id must contain lowercase letters, digits and hyphens." });
        return { level: null, diagnostics, objectCount: parsed.objects.length };
    }
    const level: LevelDefinition = {
        version: 1, id, name: root.name,
        course: geometry.course,
        ball: ball[0].transform.position,
        hole: hole[0].transform.position,
        terrain: [], objects,
    };
    return { level, diagnostics, objectCount: parsed.objects.length, serializedCount: objects.length + ball.length + hole.length + converted.filter(item => item.object.identity.kind === "wallOpening" || item.object.identity.kind === "courseBoundary").length, sourceNames: parsed.objects.map(item => item.name) };
}
