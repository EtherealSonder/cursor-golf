import type { StaticObstacleDefinition } from "../../config/ObstacleDefinition";

export interface RobotInteractionCapabilities {
    readonly navigationBlocker: boolean;
    readonly attackTarget: boolean;
    readonly visionOccluder: boolean;
}

export type RobotInteractionShape =
    | { readonly kind: "circle"; readonly radius: number }
    | { readonly kind: "rectangle"; readonly width: number; readonly height: number }
    | { readonly kind: "orientedRectangle"; readonly width: number; readonly height: number; readonly rotation: number }
    | { readonly kind: "capsule"; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number; readonly radius: number };

export interface RobotInteractionEntry {
    readonly id: string;
    readonly label: string;
    /** True for fixed blockers used by RN-1. Omitted entries are dynamic unless recognized as fixed geometry. */
    readonly navigationStatic?: boolean;
    readonly capabilities: RobotInteractionCapabilities;
    readonly shape: RobotInteractionShape;
    /** Optional live geometry for moving and rotating compound obstacles. */
    readonly getShape?: () => RobotInteractionShape;
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
            navigationStatic: true,
            capabilities: { navigationBlocker: true, attackTarget: false, visionOccluder: true },
            shape,
            getX: (): number => definition.positionX,
            getY: (): number => definition.positionY,
        });
    }

    public registerCircularEntity(
        id: string, label: string, radius: number, getX: () => number, getY: () => number,
        capabilities: RobotInteractionCapabilities = { navigationBlocker: true, attackTarget: true, visionOccluder: true },
    ): () => void {
        return this.register({ id, label, capabilities, shape: { kind: "circle", radius }, getX, getY });
    }

    public registerRock(
        id: string,
        label: "Small Rock" | "Boulder",
        radius: number,
        getX: () => number,
        getY: () => number,
    ): () => void {
        return this.registerCircularEntity(
            id,
            label,
            radius,
            getX,
            getY,
            { navigationBlocker: true, attackTarget: false, visionOccluder: true },
        );
    }

    /** Fixed-world obstacles only. Dynamic objects must not permanently block the RN-1 raster. */
    public getStaticNavigationBlockers(): readonly RobotInteractionEntry[] {
        const fixedLabels = new Set([
            "Static obstacle", "Bush", "Radial Bumper", "Directional Bumper", "Fan",
            "Conveyor belt", "Rotating paddle center", "Portal handle", "Portal housing",
        ]);
        return this.filter((entry) => entry.capabilities.navigationBlocker &&
            (entry.navigationStatic === true || (entry.navigationStatic !== false && fixedLabels.has(entry.label))));
    }

    /** Moving blockers are evaluated separately from the static RN-1 raster. */
    public getDynamicNavigationBlockers(): readonly RobotInteractionEntry[] {
        const staticIds = new Set(this.getStaticNavigationBlockers().map(entry => entry.id));
        return this.filter(entry => entry.capabilities.navigationBlocker && !staticIds.has(entry.id));
    }

    /** Stable identity of static entries; detects destruction/unregistration without tracking moving coordinates. */
    public getStaticNavigationSignature(): string {
        return this.getStaticNavigationBlockers().map(entry => entry.id).sort().join('|');
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

    /** Live entries, filtered once per presentation update; callers can snapshot geometry. */
    public getActiveVisionOccluders(excludedId?: string): readonly RobotInteractionEntry[] {
        return this.filter((entry) => entry.capabilities.visionOccluder && entry.id !== excludedId);
    }

    public clear(): void { this.entries.clear(); }

    private filter(predicate: (entry: RobotInteractionEntry) => boolean): RobotInteractionEntry[] {
        const result: RobotInteractionEntry[] = [];
        for (const entry of this.entries.values()) if (predicate(entry)) result.push(entry);
        return result;
    }
}
