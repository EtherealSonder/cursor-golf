import type { RobotInteractionEntry, RobotInteractionRegistry } from "../entities/robots/RobotInteractionRegistry";
import type { Crate } from "./Crate";

/** Expose a moving crate to the shared robot vision, navigation and attack registry. */
export function createCrateRobotTargetEntry(crate: Crate): RobotInteractionEntry {
    const collider = crate.getDefinition();
    return {
        id: `crate-target-${crate.id}`,
        label: "Crate",
        capabilities: { navigationBlocker: true, attackTarget: true, visionOccluder: true },
        shape: { kind: "rectangle", width: collider.width, height: collider.height },
        getX: () => crate.x,
        getY: () => crate.y,
    };
}

export function registerCrateRobotTarget(registry: RobotInteractionRegistry, crate: Crate): () => void {
    return registry.register(createCrateRobotTargetEntry(crate));
}
