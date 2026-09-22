import type { StaticObstacleDefinition } from "../../config/ObstacleDefinition";

export interface RobotInteractionCapabilities {
    readonly navigationBlocker: boolean;
    readonly attackTarget: boolean;
    readonly visionOccluder: boolean;
}

export type RobotInteractionShape =
    | { readonly kind: "circle"; readonly radius: number }
    | { readonly kind: "rectangle"; readonly width: number; readonly height: number };

export interface RobotInteractionEntry {
    readonly id: string;
    readonly label: string;
    readonly capabilities: RobotInteractionCapabilities;
    readonly shape: RobotInteractionShape;
    readonly getX: () => number;
    readonly getY: () => number;
}

/**
 * R-4 single authority for how gameplay objects participate in robot AI.
 *
 * The three capabilities are deliberately independent. Adding a future object
 * only requires registering it here with the appropriate flags. Robot
 * navigation and vision never need instanceof chains for individual entities.
 */
export class RobotInteractionRegistry {
    private readonly entries = new Map<string, RobotInteractionEntry>();

    public register(entry: RobotInteractionEntry): () => void {
        if (this.entries.has(entry.id)) {
            throw new Error(`Robot interaction id already registered: ${entry.id}`);
        }
        this.entries.set(entry.id, entry);
        return (): void => { this.entries.delete(entry.id); };
    }

    public registerStaticObstacle(definition: StaticObstacleDefinition): () => void {
        const shape: RobotInteractionShape = definition.shape === "rectangle"
            ? { kind: "rectangle", width: definition.width, height: definition.height }
            : definition.shape === "circle"
                ? { kind: "circle", radius: definition.radius }
                : { kind: "circle", radius: Math.max(...definition.points.map((p) => Math.hypot(p.x, p.y))) };
        return this.register({
            id: definition.id,
            label: "Static obstacle",
            capabilities: { navigationBlocker: true, attackTarget: false, visionOccluder: true },
            shape,
            getX: (): number => definition.positionX,
            getY: (): number => definition.positionY,
        });
    }

    public getNavigationBlockers(): readonly RobotInteractionEntry[] {
        return this.filter((entry) => entry.capabilities.navigationBlocker);
    }

    public getAttackTargets(): readonly RobotInteractionEntry[] {
        return this.filter((entry) => entry.capabilities.attackTarget);
    }

    public getVisionOccluders(): readonly RobotInteractionEntry[] {
        return this.filter((entry) => entry.capabilities.visionOccluder);
    }

    public clear(): void { this.entries.clear(); }

    private filter(predicate: (entry: RobotInteractionEntry) => boolean): RobotInteractionEntry[] {
        const result: RobotInteractionEntry[] = [];
        for (const entry of this.entries.values()) if (predicate(entry)) result.push(entry);
        return result;
    }
}
