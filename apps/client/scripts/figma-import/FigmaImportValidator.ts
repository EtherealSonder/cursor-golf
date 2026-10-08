import { validateLevelDefinition } from "../../src/core/game/level/LevelValidator";
import type { FigmaConversionDiagnostic } from "./FigmaNodeDefinition";
import type { FigmaGenerationResult } from "./FigmaLevelGenerator";

export interface FigmaImportValidation {
    readonly valid: boolean;
    readonly diagnostics: readonly FigmaConversionDiagnostic[];
}
/** Fail closed on ambiguous placement, missing paths, and incomplete openings. */
export function validateFigmaImport(result: FigmaGenerationResult, strict = true): FigmaImportValidation {
    const diagnostics: FigmaConversionDiagnostic[] = [...result.diagnostics];
    if (result.objectCount < 1) diagnostics.push({ severity: "error", code: "EMPTY_IMPORT", path: [], message: "No gameplay objects recognized." });
    if (result.level && result.serializedCount !== undefined && result.serializedCount !== result.objectCount) {
        diagnostics.push({ severity: 'error', code: 'INCOMPLETE_SERIALIZATION', path: [],
            message: `Serialized ${result.serializedCount}/${result.objectCount} recognized Figma objects.` });
    }
    if (result.level) {
        const validation = validateLevelDefinition(result.level);
        for (const issue of [...validation.errors, ...validation.warnings]) {
            diagnostics.push({ severity: issue.severity, code: `LEVEL_${issue.code}`,
                path: issue.path ? [issue.path] : [], message: issue.message });
        }
    } else {
        diagnostics.push({ severity: "error", code: "NO_LEVEL", path: [], message: "Generation did not produce a level." });
    }
    // The FI-2 geometry converter currently approximates VECTOR bounds when
    // polygon paths are missing. Never write that approximation in strict mode.
    if (strict) {
        const blockingWarnings = new Set([
            "MISSING_VECTOR_PATH", "ROTATION_FALLBACK", "AMBIGUOUS_180_TRANSFORM",
            "NON_UNIT_SCALE", "MISSING_PARENT_TRANSFORM", "MIRROR_UNSUPPORTED",
        ]);
        for (const diagnostic of [...diagnostics]) {
            if (diagnostic.severity === "warning" && blockingWarnings.has(diagnostic.code)) {
                diagnostics.push({ ...diagnostic, severity: "error", code: `STRICT_${diagnostic.code}` });
            }
        }
    }
    return { valid: !!result.level && !diagnostics.some(d => d.severity === "error"), diagnostics };
}
