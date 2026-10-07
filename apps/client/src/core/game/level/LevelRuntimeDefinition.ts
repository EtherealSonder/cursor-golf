import type {
    AuthoredTerrainType,
    LevelCourseOpeningDefinition,
    LevelDefinition,
    LevelObjectPlacement,
    TerrainPlacement,
} from "./LevelDefinition";
import type { LevelWorldOrigin, WorldPosition } from "./LevelCoordinateTransform";

export interface RuntimeLevelCourseOpeningDefinition extends LevelCourseOpeningDefinition {
    /** World-space interval along the corresponding course edge. */
    readonly start: number;
    readonly end: number;
}

export interface RuntimeLevelCourseDefinition {
    readonly minimumX: number;
    readonly maximumX: number;
    readonly minimumY: number;
    readonly maximumY: number;
    readonly width: number;
    readonly height: number;
    readonly baseSurface: AuthoredTerrainType;
    readonly openings: readonly RuntimeLevelCourseOpeningDefinition[];
}

export interface RuntimeTerrainPlacement extends Omit<TerrainPlacement, "x" | "y"> {
    readonly x: number;
    readonly y: number;
}

export type RuntimeLevelObjectPlacement =
    LevelObjectPlacement extends infer Placement
        ? Placement extends LevelObjectPlacement
            ? Omit<Placement, "x" | "y"> & WorldPosition
            : never
        : never;

export type RuntimeObjectOfType<T extends RuntimeLevelObjectPlacement["type"]> =
    Extract<RuntimeLevelObjectPlacement, { readonly type: T }>;

export interface RuntimeLevelDefinition {
    readonly version: LevelDefinition["version"];
    readonly id: string;
    readonly name: string;
    readonly worldOrigin: LevelWorldOrigin;
    readonly course: RuntimeLevelCourseDefinition;
    readonly ball: WorldPosition;
    readonly hole: WorldPosition;
    readonly terrain: readonly RuntimeTerrainPlacement[];
    readonly objects: readonly RuntimeLevelObjectPlacement[];
}

export function runtimeObjectsOfType<T extends RuntimeLevelObjectPlacement["type"]>(
    level: RuntimeLevelDefinition,
    type: T,
): readonly RuntimeObjectOfType<T>[] {
    return level.objects.filter(
        (placement) => placement.type === type,
    ) as readonly RuntimeObjectOfType<T>[];
}
