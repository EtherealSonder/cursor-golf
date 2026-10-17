import { RobotInteractionRegistry } from "../entities/robots/RobotInteractionRegistry";
import { Crate } from "./Crate";
import { registerCrateRobotTarget } from "./CrateRobotTargetAdapter";
import type { RuntimeObjectOfType } from "../level/LevelRuntimeDefinition";

export function runCrateRobotTargetRegression(): boolean {
    const registry = new RobotInteractionRegistry();
    const crate = new Crate({ id: "robot-test", type: "crate", x: 140, y: 240 } as RuntimeObjectOfType<"crate">);
    const unregister = registerCrateRobotTarget(registry, crate);
    const entry = registry.getAttackTargets()[0];
    const registered = !!entry && entry.label === "Crate" && entry.getX() === 140 && entry.getY() === 240
        && registry.getNavigationBlockers().length === 1 && registry.getVisionOccluders().length === 1;
    crate.translate(12, -8);
    const followsMovement = entry.getX() === 152 && entry.getY() === 232;
    unregister();
    const removed = registry.getAttackTargets().length === 0 && registry.getVisionOccluders().length === 0;
    const canIgnite = crate.ignite() && !crate.ignite() && crate.isRobotTargetable;
    crate.destroy();
    return canIgnite && registered && followsMovement && removed;
}
