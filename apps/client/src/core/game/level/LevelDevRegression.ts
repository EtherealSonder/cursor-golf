import { loadLevelDefinition } from "./LevelLoader";
import type { RuntimeLevelDefinition, RuntimeLevelObjectPlacement } from "./LevelLoader";

export interface LevelDevRegressionIssue {
    readonly path: string;
    readonly expected: unknown;
    readonly actual: unknown;
}

export interface LevelDevRegressionResult {
    readonly passed: boolean;
    readonly issues: readonly LevelDevRegressionIssue[];
}

const EXPECTED_WORLD_ORIGIN = { x: 100, y: -1250 } as const;
const PI = Math.PI;

const EXPECTED_OBJECTS = [
    ["radial-bumper-upper-left", "radialBumper", 300, -820],
    ["radial-bumper-middle-right", "radialBumper", 900, 80],
    ["directional-bumper-upper-right", "directionalBumper", 900, -1030, PI],
    ["directional-bumper-middle-left", "directionalBumper", 280, -170, 0],
    ["rotating-paddle-upper", "rotatingPaddle", 570, -650, "clockwise"],
    ["rotating-paddle-middle", "rotatingPaddle", 720, 260, "counterClockwise"],
    ["small-rock-101", "smallRock", 430, -1080, 12, 101],
    ["small-rock-207", "smallRock", 760, -920, 15, 207],
    ["boulder-1201", "boulder", 600, -1160, 48, 1201],
    ["small-rock-313", "smallRock", 310, -520, 13, 313],
    ["small-rock-351", "smallRock", 850, -520, 12, 351],
    ["boulder-1409", "boulder", 930, -430, 55, 1409],
    ["small-rock-419", "smallRock", 520, 20, 11, 419],
    ["small-rock-523", "smallRock", 940, 340, 14, 523],
    ["boulder-1613", "boulder", 300, 330, 59, 1613],
    ["small-rock-631", "smallRock", 470, 890, 12, 631],
    ["small-rock-739", "smallRock", 650, 960, 14, 739],
    ["small-rock-847", "smallRock", 820, 870, 16, 847],
    ["boulder-1811", "boulder", 760, 1000, 52, 1811],
    ["sprinkler-1", "sprinkler", 250, -930, 0],
    ["sprinkler-2", "sprinkler", 960, -650, PI],
    ["sprinkler-3", "sprinkler", 250, 170, 0],
    ["sprinkler-4", "sprinkler", 950, 610, PI],
    ["rock-fracture-mine-fan", "fan", 500, -430, 0],
    ["stress-fan-wind-1", "fan", 250, -690, 0],
    ["stress-fan-wind-2", "fan", 950, -120, PI],
    ["stress-fan-wind-3", "fan", 250, 620, 0],
    ["stress-fan-wind-4", "fan", 950, 980, PI],
    ["mine-rock-fracture-direct", "proximityMine", 650, 1050],
    ["mine-rock-fracture-wind", "proximityMine", 690, -430],
    ["mine-3", "proximityMine", 420, 70],
    ["mine-4", "proximityMine", 790, 610],
    ["fire-robot", "fireRobot", 390, 745, 150],
    ["water-robot-rock-acceptance", "waterRobot", 600, 710, 90],
    ["wind-robot", "windRobot", 810, 745, 150],
] as const;

const EXPECTED_OPENINGS = [
    ["left", -520, -350],
    ["left", 360, 530],
    ["right", -900, -720],
    ["right", -120, 60],
    ["right", 760, 940],
] as const;

function equalNumber(a: unknown, b: number): boolean {
    return typeof a === "number" && Math.abs(a - b) <= 1e-9;
}

/**
 * LD-5 regression check for the serialized development course.
 * Pass parsed level-00-dev.json to this function from a test/debug harness.
 * It deliberately does not change World authority. LD-6 owns that migration.
 */
export function runLevel00DevRegression(input: unknown): LevelDevRegressionResult {
    const issues: LevelDevRegressionIssue[] = [];
    const loaded = loadLevelDefinition(input, { worldOrigin: EXPECTED_WORLD_ORIGIN });

    if (!loaded.ok) {
        return {
            passed: false,
            issues: loaded.validation.errors.map((entry) => ({
                path: entry.path ?? entry.code,
                expected: "valid level-00-dev definition",
                actual: entry.message,
            })),
        };
    }

    const level = loaded.level;
    const expect = (path: string, actual: unknown, expected: unknown): void => {
        const matches = typeof expected === "number"
            ? equalNumber(actual, expected)
            : actual === expected;
        if (!matches) issues.push({ path, expected, actual });
    };

    expect("course.width", level.course.width, 1000);
    expect("course.height", level.course.height, 2500);
    expect("course.baseSurface", level.course.baseSurface, "grass");
    expect("ball.x", level.ball.x, 600);
    expect("ball.y", level.ball.y, 1135);
    expect("hole.x", level.hole.x, 900);
    expect("hole.y", level.hole.y, 360);
    expect("terrain.length", level.terrain.length, 0);
    expect("course.openings.length", level.course.openings.length, EXPECTED_OPENINGS.length);

    EXPECTED_OPENINGS.forEach(([side, start, end], index) => {
        const opening = level.course.openings[index];
        expect(`course.openings[${index}].side`, opening?.side, side);
        expect(`course.openings[${index}].start`, opening?.start, start);
        expect(`course.openings[${index}].end`, opening?.end, end);
    });

    const byId = new Map<string, RuntimeLevelObjectPlacement>(
        level.objects.map((object) => [object.id, object]),
    );
    expect("objects.length", level.objects.length, EXPECTED_OBJECTS.length);

    for (const expected of EXPECTED_OBJECTS) {
        const [id, type, x, y, extraA, extraB] = expected;
        const object = byId.get(id);
        if (!object) {
            issues.push({ path: `objects.${id}`, expected: "present", actual: "missing" });
            continue;
        }
        expect(`objects.${id}.type`, object.type, type);
        expect(`objects.${id}.x`, object.x, x);
        expect(`objects.${id}.y`, object.y, y);

        if (type === "fan" || type === "sprinkler" || type === "directionalBumper") {
            expect(`objects.${id}.rotation`, "rotation" in object ? object.rotation : undefined, extraA);
        } else if (type === "rotatingPaddle") {
            expect(`objects.${id}.direction`, "direction" in object ? object.direction : undefined, extraA);
        } else if (type === "smallRock" || type === "boulder") {
            expect(`objects.${id}.radius`, "radius" in object ? object.radius : undefined, extraA);
            expect(`objects.${id}.seed`, "seed" in object ? object.seed : undefined, extraB);
        } else if (type === "fireRobot" || type === "waterRobot" || type === "windRobot") {
            expect(`objects.${id}.roamRadius`, "roamRadius" in object ? object.roamRadius : undefined, extraA);
        }
    }

    // LD-8D: assert the actual generated world-space wall geometry, not only authored openings.
    const geometry = level.course.generatedGeometry;
    expect("course.geometry.type", level.course.geometry?.type, "rectangle");
    expect("course.geometry.vertices.length", geometry?.vertices.length, 4);
    expect("course.geometry.edges.length", geometry?.edges.length, 4);
    expect("course.geometry.wallSegments.length", geometry?.wallSegments.length, 9);
    if (geometry) {
        const bounds = geometry.bounds;
        expect("course.geometry.bounds.minimumX", bounds.minimumX, 100);
        expect("course.geometry.bounds.maximumX", bounds.maximumX, 1100);
        expect("course.geometry.bounds.minimumY", bounds.minimumY, -1250);
        expect("course.geometry.bounds.maximumY", bounds.maximumY, 1250);
        const expectedSegments = [
            [0, 100, -1250, 1100, -1250, 600, -1264],
            [1, 1100, -1250, 1100, -900, 1114, -1075],
            [1, 1100, -720, 1100, -120, 1114, -420],
            [1, 1100, 60, 1100, 760, 1114, 410],
            [1, 1100, 940, 1100, 1250, 1114, 1095],
            [2, 1100, 1250, 100, 1250, 600, 1264],
            [3, 100, 1250, 100, 530, 86, 890],
            [3, 100, 360, 100, -350, 86, 5],
            [3, 100, -520, 100, -1250, 86, -885],
        ] as const;
        expectedSegments.forEach(([edgeIndex, ax, ay, bx, by, cx, cy], index) => {
            const segment = geometry.wallSegments[index];
            expect(`course.geometry.wallSegments[${index}].edgeIndex`, segment?.edgeIndex, edgeIndex);
            expect(`course.geometry.wallSegments[${index}].start.x`, segment?.start.x, ax);
            expect(`course.geometry.wallSegments[${index}].start.y`, segment?.start.y, ay);
            expect(`course.geometry.wallSegments[${index}].end.x`, segment?.end.x, bx);
            expect(`course.geometry.wallSegments[${index}].end.y`, segment?.end.y, by);
            expect(`course.geometry.wallSegments[${index}].center.x`, segment?.center.x, cx);
            expect(`course.geometry.wallSegments[${index}].center.y`, segment?.center.y, cy);
            expect(`course.geometry.wallSegments[${index}].thickness`, segment?.thickness, 28);
            if (segment) expect(`course.geometry.wallSegments[${index}].length`, segment.length,
                Math.hypot(bx - ax, by - ay));
        });
    }

    return { passed: issues.length === 0, issues };
}

export function assertLevel00DevRegression(input: unknown): RuntimeLevelDefinition {
    const result = runLevel00DevRegression(input);
    if (!result.passed) {
        throw new Error(
            `LD-5 level-00-dev regression failed:\n${result.issues
                .map((issue) => `${issue.path}: expected ${String(issue.expected)}, got ${String(issue.actual)}`)
                .join("\n")}`,
        );
    }

    const loaded = loadLevelDefinition(input, { worldOrigin: EXPECTED_WORLD_ORIGIN });
    if (!loaded.ok) throw new Error("LD-5 regression unexpectedly failed validation.");
    return loaded.level;
}
