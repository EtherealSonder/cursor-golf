import type { RuntimeLevelDefinition, RuntimeCourseBounds } from "../level/LevelRuntimeDefinition";
import type { WorldPosition } from "../level/LevelCoordinateTransform";

export interface ProceduralSandLevelContext {
    readonly levelId: string;
    readonly polygon: readonly WorldPosition[];
    readonly bounds: RuntimeCourseBounds;
    readonly playableArea: number;
    readonly spawn: WorldPosition;
    readonly hole: WorldPosition;
}

/** Read normalized world-space geometry, never Figma coordinates or level IDs. */
export function adaptProceduralSandLevel(level: RuntimeLevelDefinition): ProceduralSandLevelContext {
    const geometry = level.course.generatedGeometry;
    if (!geometry || geometry.vertices.length < 3) {
        throw new Error(`[ProceduralSand] Missing valid course geometry for ${level.id}`);
    }
    const vertices = geometry.vertices;
    let twiceSignedArea = 0;
    for (let i = 0; i < vertices.length; i++) {
        const a = vertices[i];
        const b = vertices[(i + 1) % vertices.length];
        twiceSignedArea += a.x * b.y - b.x * a.y;
    }
    const playableArea = Math.abs(twiceSignedArea) / 2;
    if (!Number.isFinite(playableArea) || playableArea <= 0) {
        throw new Error(`[ProceduralSand] Invalid course area for ${level.id}`);
    }
    return {
        levelId: level.id,
        polygon: vertices.map(vertex => ({ x: vertex.x, y: vertex.y })),
        bounds: { ...geometry.bounds },
        playableArea,
        spawn: { ...level.ball },
        hole: { ...level.hole },
    };
}
