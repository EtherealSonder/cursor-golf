/**
 * Authoritative serialized contract for Cursor Golf handcrafted levels.
 *
 * LD-2 intentionally defines data only. Nothing in this file loads a level,
 * converts coordinates, creates entities, or changes the current World runtime.
 *
 * Coordinate convention for the serialized contract:
 * - positions are level-local coordinates;
 * - the level origin is the top-left of the rectangular course;
 * - +X points right and +Y points down;
 * - LD-3 will own conversion from level-local coordinates to world coordinates.
 *
 * Gameplay tuning remains in the existing global definitions. Level data owns
 * authored composition: geometry, placement, orientation, variants, and the few
 * spatial properties that are deliberately level-overridable.
 */

export type LevelDefinitionVersion = 1;

export interface LevelDefinition {
    readonly version: LevelDefinitionVersion;
    readonly id: string;
    readonly name: string;
    readonly course: LevelCourseDefinition;
    readonly ball: BallPlacement;
    readonly hole: HolePlacement;
    readonly terrain: readonly TerrainPlacement[];
    readonly objects: readonly LevelObjectPlacement[];
}

// -----------------------------------------------------------------------------
// Shared authored geometry
// -----------------------------------------------------------------------------

export interface LevelPoint {
    readonly x: number;
    readonly y: number;
}

export type LevelCourseSide = "left" | "right" | "top" | "bottom";

/**
 * Opening interval along one edge of the rectangular course.
 * start/end are level-local distances along that edge.
 */
export interface LevelCourseOpeningDefinition {
    readonly side: LevelCourseSide;
    readonly start: number;
    readonly end: number;
}

/** Legacy rectangular course fields remain valid for LD-6 compatibility. */
export interface RectangularLevelCourseDefinition {
    readonly type?: "rectangle";
    readonly width: number;
    readonly height: number;
    readonly baseSurface: AuthoredTerrainType;
    readonly openings: readonly LevelCourseOpeningDefinition[];
}

/** Polygon edges connect vertex i to vertex (i + 1) modulo vertex count.
 * Opening distances are measured from the edge's starting vertex.
 */
export interface PolygonCourseOpeningDefinition {
    readonly edgeIndex: number;
    readonly start: number;
    readonly end: number;
}

export interface PolygonLevelCourseDefinition {
    readonly type: "polygon";
    /** Frame extent in level-local pixels, not necessarily the playable bounds. */
    readonly width: number;
    readonly height: number;
    readonly baseSurface: AuthoredTerrainType;
    readonly vertices: readonly LevelPoint[];
    readonly openings: readonly PolygonCourseOpeningDefinition[];
}

export type LevelCourseDefinition =
    | RectangularLevelCourseDefinition
    | PolygonLevelCourseDefinition;

export interface BallPlacement extends LevelPoint {}

export interface HolePlacement extends LevelPoint {}

// -----------------------------------------------------------------------------
// Authored terrain
// -----------------------------------------------------------------------------

/**
 * Only base authored terrain belongs in a level definition.
 * Wet/scorched/moisture states are runtime simulation state and are excluded.
 */
export type AuthoredTerrainType = "grass" | "sand";

export interface RectangularTerrainPlacement extends LevelPoint {
    readonly type: "rectangle";
    readonly id: string;
    readonly surface: AuthoredTerrainType;
    readonly width: number;
    readonly height: number;
}

export type TerrainPlacement = RectangularTerrainPlacement;

// -----------------------------------------------------------------------------
// Placeable gameplay objects
// -----------------------------------------------------------------------------

export interface BaseObjectPlacement extends LevelPoint {
    readonly id: string;
}

/** Radians. Zero uses the existing Fan/Sprinkler authored +X convention. */
export interface FanPlacement extends BaseObjectPlacement {
    readonly type: "fan";
    readonly rotation: number;
}

export interface SprinklerPlacement extends BaseObjectPlacement {
    readonly type: "sprinkler";
    readonly rotation: number;
}

export interface RadialBumperPlacement extends BaseObjectPlacement {
    readonly type: "radialBumper";
}

export interface DirectionalBumperPlacement extends BaseObjectPlacement {
    readonly type: "directionalBumper";
    readonly rotation: number;
}

export type RotatingPaddleDirection = "clockwise" | "counterClockwise";

export interface RotatingPaddlePlacement extends BaseObjectPlacement {
    readonly type: "rotatingPaddle";
    readonly direction: RotatingPaddleDirection;
}

/** Immovable authored metal obstacle; centre-based dimensions in level pixels. */
export interface StaticMetalBoxPlacement extends BaseObjectPlacement {
    readonly type: "staticMetalBox";
    readonly width: number;
    readonly height: number;
    readonly rotation: number;
}

export interface ProximityMinePlacement extends BaseObjectPlacement {
    readonly type: "proximityMine";
}

/**
 * Radius changes the physical/navigation footprint and is therefore authored.
 * seed preserves deterministic procedural rock presentation across reloads.
 */
export interface SmallRockPlacement extends BaseObjectPlacement {
    readonly type: "smallRock";
    readonly radius: number;
    readonly seed: number;
}

export interface BoulderPlacement extends BaseObjectPlacement {
    readonly type: "boulder";
    readonly radius: number;
    readonly seed: number;
}

export interface BaseRobotPlacement extends BaseObjectPlacement {
    /**
     * Optional spatial override. When omitted, the corresponding global Robot
     * definition supplies its normal roam radius.
     */
    readonly roamRadius?: number;
}

export interface FireRobotPlacement extends BaseRobotPlacement {
    readonly type: "fireRobot";
}

export interface WaterRobotPlacement extends BaseRobotPlacement {
    readonly type: "waterRobot";
}

export interface WindRobotPlacement extends BaseRobotPlacement {
    readonly type: "windRobot";
}

/**
 * Discriminated union consumed by the future LevelLoader.
 *
 * Deliberately absent: force strengths, physics materials, AI timing, attack
 * rules, simulation constants, VFX settings, and runtime-generated state.
 */
export type LevelObjectPlacement =
    | FanPlacement
    | SprinklerPlacement
    | RadialBumperPlacement
    | DirectionalBumperPlacement
    | RotatingPaddlePlacement
    | ProximityMinePlacement
    | StaticMetalBoxPlacement
    | SmallRockPlacement
    | BoulderPlacement
    | FireRobotPlacement
    | WaterRobotPlacement
    | WindRobotPlacement;

// -----------------------------------------------------------------------------
// Authoritative serialized discriminator vocabularies
// -----------------------------------------------------------------------------

export const LEVEL_DEFINITION_VERSIONS = [1] as const;
export const LEVEL_COURSE_GEOMETRY_TYPES = ["rectangle", "polygon"] as const;
export const LEVEL_COURSE_SIDES = ["left", "right", "top", "bottom"] as const;
export const AUTHORED_TERRAIN_TYPES = ["grass", "sand"] as const;
export const TERRAIN_PLACEMENT_TYPES = ["rectangle"] as const;
export const ROTATING_PADDLE_DIRECTIONS = [
    "clockwise",
    "counterClockwise",
] as const;
export const LEVEL_OBJECT_TYPES = [
    "fan",
    "sprinkler",
    "radialBumper",
    "directionalBumper",
    "rotatingPaddle",
    "proximityMine",
    "staticMetalBox",
    "smallRock",
    "boulder",
    "fireRobot",
    "waterRobot",
    "windRobot",
] as const;

function includesString(values: readonly string[], value: unknown): value is string {
    return typeof value === "string" && values.includes(value);
}

export function isSupportedLevelDefinitionVersion(
    value: unknown,
): value is LevelDefinitionVersion {
    return typeof value === "number"
        && (LEVEL_DEFINITION_VERSIONS as readonly number[]).includes(value);
}

export function isLevelCourseSide(value: unknown): value is LevelCourseSide {
    return includesString(LEVEL_COURSE_SIDES, value);
}

export function isAuthoredTerrainType(
    value: unknown,
): value is AuthoredTerrainType {
    return includesString(AUTHORED_TERRAIN_TYPES, value);
}

export function isTerrainPlacementType(value: unknown): value is "rectangle" {
    return includesString(TERRAIN_PLACEMENT_TYPES, value);
}

export function isRotatingPaddleDirection(
    value: unknown,
): value is RotatingPaddleDirection {
    return includesString(ROTATING_PADDLE_DIRECTIONS, value);
}

export function isLevelObjectType(
    value: unknown,
): value is LevelObjectPlacement["type"] {
    return includesString(LEVEL_OBJECT_TYPES, value);
}
