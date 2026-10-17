import { CONVEYOR_BELT_DEFINITION, CONVEYOR_CARDINAL_ROTATIONS, normalizeConveyorRotation } from "../config/ConveyorBeltDefinition";
import { validateLevelDefinition } from "./LevelValidator";
import type { LevelDefinition } from "./LevelDefinition";

export function runConveyorBeltRegression(): boolean {
    if (CONVEYOR_BELT_DEFINITION.width !== 200 || CONVEYOR_BELT_DEFINITION.height !== 89) return false;
    if (CONVEYOR_BELT_DEFINITION.platformWidth !== 61 || CONVEYOR_BELT_DEFINITION.platformHeight !== 60) return false;
    if (CONVEYOR_CARDINAL_ROTATIONS.some(angle => normalizeConveyorRotation(angle) !== angle)) return false;
    if (normalizeConveyorRotation(Math.PI / 4) !== null) return false;
    const level: LevelDefinition = {
        version: 1, id: "cb1-regression", name: "CB1", course: { width: 500, height: 500, baseSurface: "grass", openings: [] },
        ball: { x: 100, y: 100 }, hole: { x: 400, y: 400 }, terrain: [],
        objects: CONVEYOR_CARDINAL_ROTATIONS.map((rotation, i) => ({ type: "conveyorBelt" as const, id: `cb1-${i}`, x: 200, y: 200, rotation })),
    };
    if (!validateLevelDefinition(level).valid) return false;
    const bad = { ...level, objects: [{ ...level.objects[0], rotation: Math.PI / 4 }] };
    return !validateLevelDefinition(bad).valid;
}
export function assertConveyorBeltRegression(): void {
    if (!runConveyorBeltRegression()) throw new Error("CB1 conveyor configuration regression failed");
}
