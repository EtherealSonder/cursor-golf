import type { RobotInteractionEntry, RobotInteractionRegistry } from "./RobotInteractionRegistry";

export class RobotTargetQuery {
    public constructor(private readonly registry: RobotInteractionRegistry) {}

    public getEligibleTargets(excludedId?: string): readonly RobotInteractionEntry[] {
        return this.registry.getAttackTargets().filter((entry) => entry.id !== excludedId);
    }
}
