import type { LevelDefinition } from "./LevelDefinition";
import {
    levelToWorldPosition,
    type LevelWorldOrigin,
    type WorldPosition,
} from "./LevelCoordinateTransform";
import type {
    RuntimeLevelCourseOpeningDefinition,
    RuntimeLevelDefinition,
    RuntimeLevelObjectPlacement,
    RuntimeTerrainPlacement,
} from "./LevelRuntimeDefinition";
import {
    validateLevelDefinition,
    type LevelValidationResult,
} from "./LevelValidator";

export interface LevelLoadSuccess {
    readonly ok: true;
    readonly level: RuntimeLevelDefinition;
    readonly validation: LevelValidationResult;
}

export interface LevelLoadFailure {
    readonly ok: false;
    readonly validation: LevelValidationResult;
}

export type LevelLoadResult = LevelLoadSuccess | LevelLoadFailure;

export interface LevelLoadOptions {
    /** Runtime world-space point corresponding to authored level-local (0, 0). */
    readonly worldOrigin: LevelWorldOrigin;
}

/**
 * Validates authored data and resolves all authored spatial data into the
 * world-space runtime contract consumed by World.
 *
 * This remains a data boundary only. It deliberately knows nothing about Pixi,
 * PhysicsWorld, entity construction, Water/Wind/Fire systems, or registration.
 */
export function loadLevelDefinition(
    input: unknown,
    options: LevelLoadOptions,
): LevelLoadResult {
    const validation = validateLevelDefinition(input);
    if (!validation.valid) return { ok: false, validation };

    const definition = input as LevelDefinition;
    const toWorld = (x: number, y: number): WorldPosition =>
        levelToWorldPosition({ x, y }, options.worldOrigin);

    const terrain: RuntimeTerrainPlacement[] = definition.terrain.map((entry) => {
        const position = toWorld(entry.x, entry.y);
        return { ...entry, x: position.x, y: position.y };
    });

    const objects: RuntimeLevelObjectPlacement[] = definition.objects.map((entry) => {
        const position = toWorld(entry.x, entry.y);
        return { ...entry, x: position.x, y: position.y } as RuntimeLevelObjectPlacement;
    });

    const openings: RuntimeLevelCourseOpeningDefinition[] = definition.course.openings.map(
        (opening) => ({
            ...opening,
            start: opening.start + (
                opening.side === "left" || opening.side === "right"
                    ? options.worldOrigin.y
                    : options.worldOrigin.x
            ),
            end: opening.end + (
                opening.side === "left" || opening.side === "right"
                    ? options.worldOrigin.y
                    : options.worldOrigin.x
            ),
        }),
    );

    return {
        ok: true,
        validation,
        level: {
            version: definition.version,
            id: definition.id,
            name: definition.name,
            worldOrigin: options.worldOrigin,
            course: {
                minimumX: options.worldOrigin.x,
                maximumX: options.worldOrigin.x + definition.course.width,
                minimumY: options.worldOrigin.y,
                maximumY: options.worldOrigin.y + definition.course.height,
                width: definition.course.width,
                height: definition.course.height,
                baseSurface: definition.course.baseSurface,
                openings,
            },
            ball: toWorld(definition.ball.x, definition.ball.y),
            hole: toWorld(definition.hole.x, definition.hole.y),
            terrain,
            objects,
        },
    };
}
