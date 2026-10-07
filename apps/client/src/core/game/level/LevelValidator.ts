import {
    isAuthoredTerrainType,
    isLevelCourseSide,
    isLevelObjectType,
    isRotatingPaddleDirection,
    isSupportedLevelDefinitionVersion,
    isTerrainPlacementType,
    type LevelDefinition,
} from "./LevelDefinition";

export type LevelValidationSeverity = "error" | "warning";

export interface LevelValidationIssue {
    readonly severity: LevelValidationSeverity;
    readonly code: string;
    readonly message: string;
    readonly path?: string;
    readonly objectId?: string;
}

export interface LevelValidationResult {
    readonly valid: boolean;
    readonly errors: readonly LevelValidationIssue[];
    readonly warnings: readonly LevelValidationIssue[];
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value);

const nonEmptyString = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;

export function validateLevelDefinition(input: unknown): LevelValidationResult {
    const errors: LevelValidationIssue[] = [];
    const warnings: LevelValidationIssue[] = [];

    const error = (
        code: string,
        message: string,
        path?: string,
        objectId?: string,
    ): void => {
        errors.push({ severity: "error", code, message, path, objectId });
    };

    const warning = (
        code: string,
        message: string,
        path?: string,
        objectId?: string,
    ): void => {
        warnings.push({ severity: "warning", code, message, path, objectId });
    };

    if (!isRecord(input)) {
        error("LEVEL_NOT_OBJECT", "Level definition must be an object.");
        return { valid: false, errors, warnings };
    }

    if (!isSupportedLevelDefinitionVersion(input.version)) {
        error(
            "UNSUPPORTED_VERSION",
            `Unsupported level schema version: ${String(input.version)}.`,
            "version",
        );
    }

    if (!nonEmptyString(input.id)) {
        error("INVALID_LEVEL_ID", "Level id must be a non-empty string.", "id");
    }

    if (!nonEmptyString(input.name)) {
        error("INVALID_LEVEL_NAME", "Level name must be a non-empty string.", "name");
    }

    if (!isRecord(input.course)) {
        error("INVALID_COURSE", "course must be an object.", "course");
        return { valid: false, errors, warnings };
    }

    const course = input.course;
    const width = course.width;
    const height = course.height;

    if (!isFiniteNumber(width) || width <= 0) {
        error(
            "INVALID_COURSE_WIDTH",
            "Course width must be a finite number greater than zero.",
            "course.width",
        );
    }

    if (!isFiniteNumber(height) || height <= 0) {
        error(
            "INVALID_COURSE_HEIGHT",
            "Course height must be a finite number greater than zero.",
            "course.height",
        );
    }

    const courseDimensionsValid =
        isFiniteNumber(width) && width > 0 && isFiniteNumber(height) && height > 0;

    if (!isAuthoredTerrainType(course.baseSurface)) {
        error(
            "INVALID_BASE_SURFACE",
            "course.baseSurface must be a supported authored terrain surface.",
            "course.baseSurface",
        );
    }

    if (!Array.isArray(course.openings)) {
        error(
            "INVALID_COURSE_OPENINGS",
            "course.openings must be an array.",
            "course.openings",
        );
    } else {
        course.openings.forEach((opening, index) => {
            const path = `course.openings[${index}]`;
            if (!isRecord(opening)) {
                error("INVALID_COURSE_OPENING", "Course opening must be an object.", path);
                return;
            }

            if (!isLevelCourseSide(opening.side)) {
                error("INVALID_COURSE_SIDE", "Course opening has an unknown side.", `${path}.side`);
            }
            if (!isFiniteNumber(opening.start) || !isFiniteNumber(opening.end)) {
                error(
                    "INVALID_COURSE_OPENING_RANGE",
                    "Course opening start/end must be finite numbers.",
                    path,
                );
                return;
            }
            if (opening.start >= opening.end) {
                error(
                    "INVALID_COURSE_OPENING_RANGE",
                    "Course opening start must be less than end.",
                    path,
                );
            }

            if (courseDimensionsValid && isLevelCourseSide(opening.side)) {
                const edgeLength =
                    opening.side === "left" || opening.side === "right" ? height : width;
                if (opening.start < 0 || opening.end > edgeLength) {
                    error(
                        "COURSE_OPENING_OUTSIDE_EDGE",
                        `Course opening must remain within 0..${edgeLength} on its edge.`,
                        path,
                    );
                }
            }
        });
    }

    const validatePoint = (
        value: unknown,
        path: string,
        codePrefix: string,
    ): void => {
        if (!isRecord(value)) {
            error(`${codePrefix}_MISSING`, `${path} must be an object.`, path);
            return;
        }
        if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y)) {
            error(
                `${codePrefix}_INVALID_POSITION`,
                `${path} x/y must be finite numbers.`,
                path,
            );
            return;
        }
        if (
            courseDimensionsValid &&
            (value.x < 0 || value.x > width || value.y < 0 || value.y > height)
        ) {
            error(
                `${codePrefix}_OUTSIDE_COURSE`,
                `${path} position (${value.x}, ${value.y}) is outside the ${width} x ${height} course.`,
                path,
            );
        }
    };

    validatePoint(input.ball, "ball", "BALL");
    validatePoint(input.hole, "hole", "HOLE");

    const usedIds = new Map<string, string>();
    const registerId = (id: unknown, path: string, objectId?: string): void => {
        if (!nonEmptyString(id)) {
            error("INVALID_OBJECT_ID", "Authored id must be a non-empty string.", `${path}.id`, objectId);
            return;
        }
        const previous = usedIds.get(id);
        if (previous) {
            error(
                "DUPLICATE_OBJECT_ID",
                `Authored id "${id}" is already used at ${previous}.`,
                `${path}.id`,
                id,
            );
        } else {
            usedIds.set(id, path);
        }
    };

    if (!Array.isArray(input.terrain)) {
        error("INVALID_TERRAIN", "terrain must be an array.", "terrain");
    } else {
        input.terrain.forEach((terrain, index) => {
            const path = `terrain[${index}]`;
            if (!isRecord(terrain)) {
                error("INVALID_TERRAIN_ENTRY", "Terrain placement must be an object.", path);
                return;
            }
            registerId(terrain.id, path, nonEmptyString(terrain.id) ? terrain.id : undefined);
            if (!isTerrainPlacementType(terrain.type)) {
                error("UNKNOWN_TERRAIN_TYPE", "Unknown terrain placement type.", `${path}.type`);
            }
            if (!isAuthoredTerrainType(terrain.surface)) {
                error("UNKNOWN_TERRAIN_SURFACE", "Unknown authored terrain surface.", `${path}.surface`);
            }
            if (
                !isFiniteNumber(terrain.x) ||
                !isFiniteNumber(terrain.y) ||
                !isFiniteNumber(terrain.width) ||
                !isFiniteNumber(terrain.height)
            ) {
                error("INVALID_TERRAIN_GEOMETRY", "Terrain x/y/width/height must be finite numbers.", path);
                return;
            }
            if (terrain.width <= 0 || terrain.height <= 0) {
                error("INVALID_TERRAIN_SIZE", "Terrain width/height must be greater than zero.", path);
            }
            if (
                courseDimensionsValid &&
                (terrain.x < 0 ||
                    terrain.y < 0 ||
                    terrain.x + terrain.width > width ||
                    terrain.y + terrain.height > height)
            ) {
                error("TERRAIN_OUTSIDE_COURSE", "Terrain rectangle extends outside the course.", path);
            }
        });
    }

    if (!Array.isArray(input.objects)) {
        error("INVALID_OBJECTS", "objects must be an array.", "objects");
    } else {
        input.objects.forEach((object, index) => {
            const path = `objects[${index}]`;
            if (!isRecord(object)) {
                error("INVALID_OBJECT", "Object placement must be an object.", path);
                return;
            }

            const objectId = nonEmptyString(object.id) ? object.id : undefined;
            registerId(object.id, path, objectId);

            if (!isLevelObjectType(object.type)) {
                error("UNKNOWN_OBJECT_TYPE", "Unknown level object type.", `${path}.type`, objectId);
                return;
            }

            if (!isFiniteNumber(object.x) || !isFiniteNumber(object.y)) {
                error("INVALID_OBJECT_POSITION", "Object x/y must be finite numbers.", path, objectId);
            } else if (
                courseDimensionsValid &&
                (object.x < 0 || object.x > width || object.y < 0 || object.y > height)
            ) {
                error(
                    "OBJECT_OUTSIDE_COURSE",
                    `Object position (${object.x}, ${object.y}) is outside the ${width} x ${height} course.`,
                    path,
                    objectId,
                );
            }

            switch (object.type) {
                case "fan":
                case "sprinkler":
                case "directionalBumper":
                    if (!isFiniteNumber(object.rotation)) {
                        error("INVALID_ROTATION", "rotation must be a finite number in radians.", `${path}.rotation`, objectId);
                    }
                    break;

                case "rotatingPaddle":
                    if (!isRotatingPaddleDirection(object.direction)) {
                        error("INVALID_PADDLE_DIRECTION", "Unknown rotating paddle direction.", `${path}.direction`, objectId);
                    }
                    break;

                case "smallRock":
                case "boulder":
                    if (!isFiniteNumber(object.radius) || object.radius <= 0) {
                        error("INVALID_ROCK_RADIUS", "Rock radius must be a finite number greater than zero.", `${path}.radius`, objectId);
                    }
                    if (!isFiniteNumber(object.seed)) {
                        error("INVALID_ROCK_SEED", "Rock seed must be a finite number.", `${path}.seed`, objectId);
                    }
                    break;

                case "fireRobot":
                case "waterRobot":
                case "windRobot":
                    if (
                        object.roamRadius !== undefined &&
                        (!isFiniteNumber(object.roamRadius) || object.roamRadius <= 0)
                    ) {
                        error("INVALID_ROBOT_ROAM_RADIUS", "Robot roamRadius must be a finite number greater than zero.", `${path}.roamRadius`, objectId);
                    }
                    break;

                case "radialBumper":
                case "proximityMine":
                    break;
            }
        });
    }

    // Intentionally conservative warning layer for LD-4. Geometry-overlap warnings
    // wait until authoritative collider footprints are available.
    if (courseDimensionsValid && width < 100) {
        warning("VERY_NARROW_COURSE", "Course width is unusually small.", "course.width");
    }
    if (courseDimensionsValid && height < 100) {
        warning("VERY_SHORT_COURSE", "Course height is unusually small.", "course.height");
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Type assertion helper for trusted use after validation.
 * JSON remains unknown until validateLevelDefinition has succeeded.
 */
export function isValidLevelDefinition(input: unknown): input is LevelDefinition {
    return validateLevelDefinition(input).valid;
}
