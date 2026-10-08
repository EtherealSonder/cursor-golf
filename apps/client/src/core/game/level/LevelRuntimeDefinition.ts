import type {
    AuthoredTerrainType,
    LevelCourseOpeningDefinition,
    PolygonCourseOpeningDefinition,
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

export interface RuntimePolygonCourseGeometry {
    readonly type: "polygon";
    readonly vertices: readonly WorldPosition[];
    /** Edge-relative distances remain unchanged by translation. */
    readonly openings: readonly PolygonCourseOpeningDefinition[];
}

export interface RuntimeRectangleCourseGeometry {
    readonly type: "rectangle";
}

export type RuntimeCourseGeometry =
    | RuntimePolygonCourseGeometry
    | RuntimeRectangleCourseGeometry;

export interface RuntimeCourseBounds {
    readonly minimumX: number;
    readonly maximumX: number;
    readonly minimumY: number;
    readonly maximumY: number;
}

export interface RuntimeCourseBoundaryEdge {
    readonly index: number;
    readonly start: WorldPosition;
    readonly end: WorldPosition;
    readonly length: number;
    readonly angleRadians: number;
}

export interface RuntimeCourseWallSegment {
    readonly id: string;
    readonly edgeIndex: number;
    readonly start: WorldPosition;
    readonly end: WorldPosition;
    readonly center: WorldPosition;
    readonly length: number;
    readonly thickness: number;
    readonly angleRadians: number;
}

export interface GeneratedCourseGeometry {
    readonly vertices: readonly WorldPosition[];
    readonly edges: readonly RuntimeCourseBoundaryEdge[];
    readonly wallSegments: readonly RuntimeCourseWallSegment[];
    readonly bounds: RuntimeCourseBounds;
}

export interface RuntimeLevelCourseDefinition {
    /** Optional during LD-8A so the existing LD-6 loader remains compatible. */
    readonly geometry?: RuntimeCourseGeometry;
    readonly generatedGeometry?: GeneratedCourseGeometry;

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

/** staticMetalBox uses the same translated centre as other runtime objects. */
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
    ) as unknown as readonly RuntimeObjectOfType<T>[];
}
