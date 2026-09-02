import type {
    SurfaceState,
} from "./SurfaceState";

import type {
    SurfaceType,
} from "./SurfaceType";

export interface SurfaceStateRegionDefinition {
    readonly id: string;

    /**
     * Surface identity this runtime state is allowed to
     * modify.
     *
     * A Grass state region never converts Sand into Grass.
     * It only applies when the resolved base surface type at
     * the queried point is already Grass.
     */
    readonly surfaceType: SurfaceType;

    readonly state: SurfaceState;

    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;

    readonly durationSeconds: number | null;

    readonly reversionState: SurfaceState | null;
}

/**
 * Runtime surface-state stamp layered above authored terrain.
 *
 * Geometry and target surface identity are immutable. The
 * state may change when a temporary duration expires.
 */
export class SurfaceStateRegion {
    private currentState: SurfaceState;

    private remainingStateDuration: number | null;

    constructor(
        private readonly definition: SurfaceStateRegionDefinition,
    ) {
        this.validateDefinition(definition);

        this.currentState =
            definition.state;

        this.remainingStateDuration =
            definition.durationSeconds;
    }

    public containsPoint(
        worldX: number,
        worldY: number,
    ): boolean {
        if (
            !Number.isFinite(worldX) ||
            !Number.isFinite(worldY)
        ) {
            return false;
        }

        return (
            worldX >= this.definition.x &&
            worldX <= this.definition.x + this.definition.width &&
            worldY >= this.definition.y &&
            worldY <= this.definition.y + this.definition.height
        );
    }

    public getDefinition(): SurfaceStateRegionDefinition {
        return this.definition;
    }

    public getCurrentState(): SurfaceState {
        return this.currentState;
    }

    public getRemainingStateDuration(): number | null {
        return this.remainingStateDuration;
    }

    public setRuntimeState(
        state: SurfaceState,
        durationSeconds: number | null,
    ): void {
        if (
            durationSeconds !== null &&
            (
                !Number.isFinite(durationSeconds) ||
                durationSeconds <= 0
            )
        ) {
            throw new Error(
                `Surface state region '${this.definition.id}' duration must be null or a finite number greater than zero.`,
            );
        }

        this.currentState =
            state;

        this.remainingStateDuration =
            durationSeconds;
    }

    public advanceStateTimer(deltaTime: number): boolean {
        if (
            this.remainingStateDuration === null ||
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            return false;
        }

        this.remainingStateDuration =
            Math.max(
                0,
                this.remainingStateDuration - deltaTime,
            );

        return this.remainingStateDuration <= 0;
    }

    private validateDefinition(
        definition: SurfaceStateRegionDefinition,
    ): void {
        if (definition.id.trim().length === 0) {
            throw new Error(
                "Surface state region id cannot be empty.",
            );
        }

        if (
            !Number.isFinite(definition.x) ||
            !Number.isFinite(definition.y)
        ) {
            throw new Error(
                `Surface state region '${definition.id}' position must be finite.`,
            );
        }

        if (
            !Number.isFinite(definition.width) ||
            definition.width <= 0 ||
            !Number.isFinite(definition.height) ||
            definition.height <= 0
        ) {
            throw new Error(
                `Surface state region '${definition.id}' dimensions must be finite values greater than zero.`,
            );
        }

        if (
            definition.durationSeconds !== null &&
            (
                !Number.isFinite(definition.durationSeconds) ||
                definition.durationSeconds <= 0
            )
        ) {
            throw new Error(
                `Surface state region '${definition.id}' duration must be null or a finite number greater than zero.`,
            );
        }
    }
}
