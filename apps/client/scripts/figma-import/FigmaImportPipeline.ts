import { parseFigmaNodes } from "./FigmaNodeParser";
import { parseFigmaSvg } from "./FigmaSvgParser";
import { extractFigmaSvgGeometry } from "./FigmaSvgGeometryExtractor";
import { matchFigmaSvgNodes } from "./FigmaSvgNodeMatcher";
import { resolveFigmaMatchedGeometry } from "./FigmaResolvedGeometry";
import { generateFigmaLevel, type FigmaGenerationResult } from "./FigmaLevelGenerator";
import { validateFigmaImport, type FigmaImportValidation } from "./FigmaImportValidator";
import type { FigmaConversionDiagnostic } from "./FigmaNodeDefinition";
import { registeredFigmaPrefixes } from './FigmaObjectNaming';
import { identifyFigmaObject } from './FigmaObjectRegistry';

export interface FigmaImportPipelineResult {
    readonly generation: FigmaGenerationResult;
    readonly validation: FigmaImportValidation;
    readonly matchedCount: number;
}
/** Side-effect-free importer; file creation is deliberately delegated to the CLI. */
export function runFigmaImportPipeline(json: unknown, svg: string, levelId: string): FigmaImportPipelineResult {
    // Prefix registration is shared by parsing, matching and generation.
    registeredFigmaPrefixes();

    const parsed = parseFigmaNodes(json);
    const svgDocument = parseFigmaSvg(svg);
    const geometry = extractFigmaSvgGeometry(svgDocument);
    const matching = matchFigmaSvgNodes(parsed.objects, geometry);
    const resolved = resolveFigmaMatchedGeometry(matching);
    const additional: FigmaConversionDiagnostic[] = [...resolved.diagnostics];
    // Top-level unrecognized visible layers are rejected rather than silently dropped.
    // Nested artwork inside component instances is intentionally not inspected.
    const source = Array.isArray(json) ? json : json && typeof json === 'object' && 'document' in json
        ? [(json as { document: unknown }).document] : [json];
    if (source.length === 1 && source[0] && typeof source[0] === 'object') {
        const frame = source[0] as { name?: string; children?: readonly { name: string; visible?: boolean }[] };
        for (const node of frame.children ?? []) {
            if (node.visible !== false && !identifyFigmaObject(node.name)) {
                additional.push({ severity: 'error', code: 'UNSUPPORTED_FIGMA_LAYER',
                    path: [frame.name ?? 'FRAME', node.name],
                    message: `Unrecognized top-level layer "${node.name}". Register its gameplay prefix or explicitly remove it from the gameplay export.` });
            }
        }
    }
    if (resolved.shapes.size !== parsed.objects.length) {
        additional.push({ severity: "error", code: "SVG_MATCH_COUNT", path: [],
            message: `Matched ${resolved.shapes.size}/${parsed.objects.length} gameplay objects.` });
    }
    const generated = generateFigmaLevel(json, levelId, resolved);
    const generation: FigmaGenerationResult = {
        ...generated, diagnostics: [...generated.diagnostics, ...additional],
    };
    return { generation, validation: validateFigmaImport(generation, true), matchedCount: resolved.shapes.size };
}
