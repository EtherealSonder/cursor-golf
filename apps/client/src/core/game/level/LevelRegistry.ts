import type { LevelDefinition } from "./LevelDefinition";

/**
 * Vite eagerly bundles authored JSON levels at build time.
 * Adding a JSON file requires a Vite refresh/rebuild, not a World.ts edit.
 */
const modules = import.meta.glob("../levels/*.json", { eager: true, import: "default" }) as Record<string, unknown>;
const levels = new Map<string, LevelDefinition>();

for (const [path, data] of Object.entries(modules).sort(([a], [b]) => a.localeCompare(b))) {
    if (data === null || typeof data !== "object" || Array.isArray(data)) {
        throw new Error(`[LevelRegistry] ${path}: expected a level JSON object.`);
    }
    const candidate = data as Record<string, unknown>;
    if (typeof candidate.id !== "string" || !candidate.id.trim()) {
        throw new Error(`[LevelRegistry] ${path}: missing nonempty string 'id'.`);
    }
    if (levels.has(candidate.id)) {
        throw new Error(`[LevelRegistry] Duplicate level id "${candidate.id}" in ${path}.`);
    }
    // Full schema validation remains the responsibility of LevelLoader.
    levels.set(candidate.id, data as LevelDefinition);
}

/** Deterministic list of authored level IDs. */
export function getAvailableLevels(): readonly string[] {
    return [...levels.keys()].sort();
}

/** Returns undefined for an unknown level ID. */
export function getLevelById(id: string): LevelDefinition | undefined {
    return levels.get(id);
}

/** Look up an authored level or fail with actionable available IDs. */
export function requireLevelById(id: string): LevelDefinition {
    const level = getLevelById(id);
    if (!level) {
        throw new Error(`[LevelRegistry] Unknown level "${id}". Available: ${getAvailableLevels().join(", ") || "(none)"}.`);
    }
    return level;
}
