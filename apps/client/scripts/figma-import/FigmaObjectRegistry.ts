import type { FigmaObjectIdentity, FigmaGameplayObjectKind, FigmaTransformProfile } from "./FigmaNodeDefinition";

/**
 * Explicit, case-insensitive gameplay naming contract for FI-1.
 * Only whole-name matches are recognized. Nested component artwork is not
 * interpreted as a second gameplay instance by the parser.
 */
import { resolveFigmaName } from './FigmaObjectNaming';
export function identifyFigmaObject(name: string): FigmaObjectIdentity | null {
    return resolveFigmaName(name);
}

/** FI-2 placement metadata. New types register a profile, not converter branches. */
const CENTER: FigmaTransformProfile = {
    strategy: "center", allowRotation: true, allowMirroring: false, sizing: "fixed",
};
const GEOMETRY: FigmaTransformProfile = {
    strategy: "topLeft", allowRotation: true, allowMirroring: true, sizing: "authored",
};
const DIRECTIONAL: FigmaTransformProfile = {
    strategy: "mechanicalPivot",
    // Authoritative sprite anchor from DirectionalBumperDefinition.ts.
    anchor: { x: 284 / 1452, y: 283 / 567 },
    allowRotation: true, allowMirroring: true, sizing: "fixed",
};
const PROFILES: Readonly<Record<FigmaGameplayObjectKind, FigmaTransformProfile>> = {
    courseBoundary: GEOMETRY,
    wallOpening: GEOMETRY,
    ballSpawn: CENTER,
    hole: CENTER,
    metalBox: { ...CENTER, sizing: "authored" },
    radialBumper: CENTER,
    directionalBumper: DIRECTIONAL,
    rotatingPaddle: CENTER,
    fan: CENTER, waterSprinkler: CENTER, proximityMine: CENTER,
    fireRobot: CENTER, waterRobot: CENTER, windRobot: CENTER,
    smallRock: CENTER, boulder: CENTER,
};
export function getFigmaTransformProfile(kind: FigmaGameplayObjectKind): FigmaTransformProfile {
    return PROFILES[kind];
}

// FI-3: Registry-driven serialization. Handler implementations are small and
// intentionally separate from parsing and affine transform resolution.
import type { FigmaConvertedObject } from "./FigmaNodeDefinition";
import type { LevelObjectPlacement } from "../../src/core/game/level/LevelDefinition";

export type FigmaLevelObjectHandler = (entry: FigmaConvertedObject) => LevelObjectPlacement;
const base = (entry: FigmaConvertedObject) => ({
    id: entry.object.identity.id,
    x: entry.transform.position.x,
    y: entry.transform.position.y,
});
const handlers: Partial<Record<FigmaGameplayObjectKind, FigmaLevelObjectHandler>> = {
    fan: entry => ({ ...base(entry), type: 'fan', rotation: entry.transform.rotationRadians }),
    waterSprinkler: entry => ({ ...base(entry), type: 'sprinkler', rotation: entry.transform.rotationRadians }),
    proximityMine: entry => ({ ...base(entry), type: 'proximityMine' }),
    fireRobot: entry => ({ ...base(entry), type: 'fireRobot' }),
    waterRobot: entry => ({ ...base(entry), type: 'waterRobot' }),
    windRobot: entry => ({ ...base(entry), type: 'windRobot' }),
    smallRock: entry => ({ ...base(entry), type: 'smallRock', radius: Math.min(entry.object.bounds.width, entry.object.bounds.height) / 2, seed: entry.object.identity.index ?? 1 }),
    boulder: entry => ({ ...base(entry), type: 'boulder', radius: Math.min(entry.object.bounds.width, entry.object.bounds.height) / 2, seed: entry.object.identity.index ?? 1 }),
    radialBumper: entry => ({ ...base(entry), type: "radialBumper" }),
    directionalBumper: entry => {
        // The level schema only serializes a rotation, not a reflection. A
        // reflected sprite cannot be represented faithfully by rotation alone.
        if (entry.transform.mirrored) {
            throw new Error(`Mirrored directional bumper ${entry.object.identity.id} cannot be represented by the current level schema.`);
        }
        return { ...base(entry), type: "directionalBumper", rotation: entry.transform.rotationRadians };
    },
    rotatingPaddle: entry => ({
        ...base(entry), type: "rotatingPaddle",
        direction: entry.object.identity.direction === "anticlockwise"
            ? "counterClockwise" : "clockwise",
    }),
    metalBox: entry => ({
        ...base(entry), type: "staticMetalBox",
        width: entry.object.bounds.width * entry.transform.scaleX,
        height: entry.object.bounds.height * entry.transform.scaleY,
        rotation: entry.transform.rotationRadians,
    }),
};
export function getFigmaLevelObjectHandler(kind: FigmaGameplayObjectKind): FigmaLevelObjectHandler | undefined {
    return handlers[kind];
}
/** Future gameplay types can be added here without modifying the generator. */
export function registerFigmaLevelObjectHandler(
    kind: FigmaGameplayObjectKind,
    handler: FigmaLevelObjectHandler,
): void {
    if (kind in handlers) throw new Error(`Handler already registered for ${kind}.`);
    handlers[kind] = handler;
}

/** FI-5B: resolved SVG geometry is authoritative when supplied to converters. */
export function getFigmaResolvedTransformProfile(kind: FigmaGameplayObjectKind): FigmaTransformProfile {
    return getFigmaTransformProfile(kind);
}
