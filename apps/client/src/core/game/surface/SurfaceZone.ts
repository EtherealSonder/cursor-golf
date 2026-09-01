import type {
    SurfaceType,
} from "./SurfaceType";

import type {
    SurfaceState,
} from "./SurfaceState";

export interface SurfaceZoneDefinition {

    readonly id:
    string;

    readonly surfaceType:
    SurfaceType;

    /**
     * World-space top-left position.
     */
    readonly x:
    number;

    readonly y:
    number;

    readonly width:
    number;

    readonly height:
    number;
}

/**
 * Rectangular world-space surface region.
 *
 * Geometry and surface identity are immutable. Runtime state
 * and its optional expiry timer are intentionally mutable.
 */
export class SurfaceZone {

    private readonly definition:
        SurfaceZoneDefinition;

    private currentState:
        SurfaceState;

    private remainingStateDuration:
        number | null = null;

    constructor(
        definition:
            SurfaceZoneDefinition,

        initialState:
            SurfaceState,
    ) {

        this.validateDefinition(
            definition,
        );

        this.definition = {
            ...definition,
        };

        this.currentState =
            initialState;
    }

    public containsPoint(
        worldX:
            number,

        worldY:
            number,
    ): boolean {

        if (
            !Number.isFinite(
                worldX,
            ) ||
            !Number.isFinite(
                worldY,
            )
        ) {
            return false;
        }

        return (
            worldX >=
            this.definition.x &&
            worldX <=
            this.definition.x +
            this.definition.width &&
            worldY >=
            this.definition.y &&
            worldY <=
            this.definition.y +
            this.definition.height
        );
    }

    public getDefinition():
        SurfaceZoneDefinition {

        return this.definition;
    }

    public getCurrentState():
        SurfaceState {

        return this.currentState;
    }

    public getRemainingStateDuration():
        number | null {

        return this.remainingStateDuration;
    }

    public setRuntimeState(
        state:
            SurfaceState,

        durationSeconds:
            number | null,
    ): void {

        if (
            durationSeconds !== null &&
            (
                !Number.isFinite(
                    durationSeconds,
                ) ||
                durationSeconds <=
                0
            )
        ) {
            throw new Error(
                `Surface zone '${this.definition.id}' state duration must be null or a finite number greater than zero.`,
            );
        }

        this.currentState =
            state;

        this.remainingStateDuration =
            durationSeconds;
    }

    public advanceStateTimer(
        deltaTime:
            number,
    ): boolean {

        if (
            this.remainingStateDuration ===
            null ||
            deltaTime <=
            0
        ) {
            return false;
        }

        this.remainingStateDuration =
            Math.max(
                0,
                this.remainingStateDuration -
                deltaTime,
            );

        return (
            this.remainingStateDuration <=
            0
        );
    }

    private validateDefinition(
        definition:
            SurfaceZoneDefinition,
    ): void {

        if (
            definition.id
                .trim()
                .length ===
            0
        ) {
            throw new Error(
                "Surface zone id cannot be empty.",
            );
        }

        if (
            !Number.isFinite(
                definition.x,
            ) ||
            !Number.isFinite(
                definition.y,
            )
        ) {
            throw new Error(
                `Surface zone '${definition.id}' position values must be finite.`,
            );
        }

        if (
            !Number.isFinite(
                definition.width,
            ) ||
            definition.width <=
            0 ||
            !Number.isFinite(
                definition.height,
            ) ||
            definition.height <=
            0
        ) {
            throw new Error(
                `Surface zone '${definition.id}' dimensions must be finite values greater than zero.`,
            );
        }
    }
}
