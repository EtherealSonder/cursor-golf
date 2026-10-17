import type { RobotInteractionEntry, RobotInteractionRegistry } from "./RobotInteractionRegistry";

export class RobotTargetQuery {
    public constructor(
        private readonly registry: RobotInteractionRegistry,
        private readonly isConcealed: (id: string) => boolean = () => false,
    ) {}

    public getEligibleTargets(excludedId?: string): readonly RobotInteractionEntry[] {
        return this.registry.getAttackTargets().filter((entry) => entry.id !== excludedId && !this.isConcealed(entry.id));
    }
}
