import {
    getSurfaceDefinition,
    isSurfaceStateAllowed,
} from "./SurfaceDefinition";

import {
    getSurfaceStateDefinition,
} from "./SurfaceStateDefinition";

import {
    SurfaceType,
} from "./SurfaceType";

import {
    SurfaceZone,
} from "./SurfaceZone";

import type {
    SurfaceZoneDefinition,
} from "./SurfaceZone";

import type {
    SurfaceState,
} from "./SurfaceState";

import type {
    SurfaceSample,
} from "./SurfaceSample";

export type SurfaceChangeListener =
    () => void;

/**
 * Authoritative spatial surface-query and runtime-state system.
 *
 * Grass remains the course-wide fallback. Authored zones may
 * represent either a different surface type or a localized
 * runtime state such as Wet Grass or Scorched Grass.
 */
export class SurfaceSystem {

    private readonly defaultSurfaceType:
        SurfaceType;

    private readonly zones:
        SurfaceZone[] = [];

    private readonly changeListeners:
        Set<SurfaceChangeListener> =
        new Set<SurfaceChangeListener>();

    constructor(
        defaultSurfaceType:
            SurfaceType =
            SurfaceType.Grass,
    ) {

        this.defaultSurfaceType =
            defaultSurfaceType;

        const defaultSurface =
            getSurfaceDefinition(
                this.defaultSurfaceType,
            );

        this.validateStateForSurface(
            this.defaultSurfaceType,
            defaultSurface.defaultState,
        );
    }

    public update(
        deltaTime:
            number,
    ): void {

        if (
            !Number.isFinite(
                deltaTime,
            ) ||
            deltaTime <=
            0
        ) {
            return;
        }

        let stateChanged =
            false;

        for (
            const zone
            of this.zones
        ) {
            if (
                !zone.advanceStateTimer(
                    deltaTime,
                )
            ) {
                continue;
            }

            const zoneDefinition =
                zone.getDefinition();

            const stateDefinition =
                getSurfaceStateDefinition(
                    zoneDefinition.surfaceType,
                    zone.getCurrentState(),
                );

            if (
                stateDefinition.reversionState ===
                null
            ) {
                zone.setRuntimeState(
                    zone.getCurrentState(),
                    null,
                );

                continue;
            }

            this.applyStateToZone(
                zone,
                stateDefinition.reversionState,
                null,
            );

            stateChanged =
                true;
        }

        if (
            stateChanged
        ) {
            this.notifyChanged();
        }
    }

    public addZone(
        definition:
            SurfaceZoneDefinition,
    ): SurfaceZone {

        if (
            this.zones.some(
                (
                    zone:
                        SurfaceZone,
                ): boolean =>
                    zone
                        .getDefinition()
                        .id ===
                    definition.id,
            )
        ) {
            throw new Error(
                `Surface zone id '${definition.id}' is duplicated.`,
            );
        }

        const surfaceDefinition =
            getSurfaceDefinition(
                definition.surfaceType,
            );

        this.validateStateForSurface(
            definition.surfaceType,
            surfaceDefinition.defaultState,
        );

        const zone =
            new SurfaceZone(
                definition,
                surfaceDefinition.defaultState,
            );

        this.zones.push(
            zone,
        );

        this.notifyChanged();

        return zone;
    }

    public clearZones(): void {

        if (
            this.zones.length ===
            0
        ) {
            return;
        }

        this.zones.length = 0;

        this.notifyChanged();
    }

    public getSurfaceAt(
        worldX:
            number,

        worldY:
            number,
    ): SurfaceSample {

        for (
            let zoneIndex =
                this.zones.length - 1;

            zoneIndex >= 0;

            zoneIndex -= 1
        ) {
            const zone =
                this.zones[
                zoneIndex
                ];

            if (
                !zone ||
                !zone.containsPoint(
                    worldX,
                    worldY,
                )
            ) {
                continue;
            }

            return this.createSampleForZone(
                zone,
            );
        }

        const defaultDefinition =
            getSurfaceDefinition(
                this.defaultSurfaceType,
            );

        const stateDefinition =
            getSurfaceStateDefinition(
                this.defaultSurfaceType,
                defaultDefinition.defaultState,
            );

        this.validateStateDefinition(
            stateDefinition
                .rollingResistanceMultiplier,
            this.defaultSurfaceType,
            defaultDefinition.defaultState,
        );

        return {
            surfaceType:
                this.defaultSurfaceType,

            surfaceState:
                defaultDefinition.defaultState,

            rollingResistanceMultiplier:
                stateDefinition
                    .rollingResistanceMultiplier,

            zoneId:
                null,
        };
    }

    public setZoneState(
        zoneId:
            string,

        state:
            SurfaceState,

        durationSeconds?:
            number | null,
    ): boolean {

        const zone =
            this.zones.find(
                (
                    candidate:
                        SurfaceZone,
                ): boolean =>
                    candidate
                        .getDefinition()
                        .id ===
                    zoneId,
            );

        if (
            !zone
        ) {
            return false;
        }

        this.applyStateToZone(
            zone,
            state,
            durationSeconds,
        );

        this.notifyChanged();

        return true;
    }

    public setSurfaceStateAt(
        worldX:
            number,

        worldY:
            number,

        state:
            SurfaceState,

        durationSeconds?:
            number | null,
    ): boolean {

        for (
            let zoneIndex =
                this.zones.length - 1;

            zoneIndex >= 0;

            zoneIndex -= 1
        ) {
            const zone =
                this.zones[
                zoneIndex
                ];

            if (
                !zone ||
                !zone.containsPoint(
                    worldX,
                    worldY,
                )
            ) {
                continue;
            }

            this.applyStateToZone(
                zone,
                state,
                durationSeconds,
            );

            this.notifyChanged();

            return true;
        }

        return false;
    }

    public subscribeToChanges(
        listener:
            SurfaceChangeListener,
    ): () => void {

        this.changeListeners.add(
            listener,
        );

        let unsubscribed =
            false;

        return (): void => {

            if (
                unsubscribed
            ) {
                return;
            }

            unsubscribed =
                true;

            this.changeListeners.delete(
                listener,
            );
        };
    }

    public getZones():
        readonly SurfaceZone[] {

        return this.zones;
    }

    public getDefaultSurface():
        SurfaceSample {

        const definition =
            getSurfaceDefinition(
                this.defaultSurfaceType,
            );

        const stateDefinition =
            getSurfaceStateDefinition(
                this.defaultSurfaceType,
                definition.defaultState,
            );

        return {
            surfaceType:
                this.defaultSurfaceType,

            surfaceState:
                definition.defaultState,

            rollingResistanceMultiplier:
                stateDefinition
                    .rollingResistanceMultiplier,

            zoneId:
                null,
        };
    }

    private createSampleForZone(
        zone:
            SurfaceZone,
    ): SurfaceSample {

        const zoneDefinition =
            zone.getDefinition();

        const currentState =
            zone.getCurrentState();

        const stateDefinition =
            getSurfaceStateDefinition(
                zoneDefinition.surfaceType,
                currentState,
            );

        this.validateStateDefinition(
            stateDefinition
                .rollingResistanceMultiplier,
            zoneDefinition.surfaceType,
            currentState,
        );

        return {
            surfaceType:
                zoneDefinition.surfaceType,

            surfaceState:
                currentState,

            rollingResistanceMultiplier:
                stateDefinition
                    .rollingResistanceMultiplier,

            zoneId:
                zoneDefinition.id,
        };
    }

    private applyStateToZone(
        zone:
            SurfaceZone,

        state:
            SurfaceState,

        durationSeconds?:
            number | null,
    ): void {

        const zoneDefinition =
            zone.getDefinition();

        this.validateStateForSurface(
            zoneDefinition.surfaceType,
            state,
        );

        const stateDefinition =
            getSurfaceStateDefinition(
                zoneDefinition.surfaceType,
                state,
            );

        const resolvedDuration =
            durationSeconds ===
                undefined
                ? stateDefinition
                    .durationSeconds
                : durationSeconds;

        if (
            resolvedDuration !== null &&
            stateDefinition.reversionState ===
            null
        ) {
            throw new Error(
                `Surface '${zoneDefinition.surfaceType}' state '${state}' cannot use a temporary duration because it has no reversion state.`,
            );
        }

        zone.setRuntimeState(
            state,
            resolvedDuration,
        );
    }

    private validateStateForSurface(
        surfaceType:
            SurfaceType,

        state:
            SurfaceState,
    ): void {

        if (
            !isSurfaceStateAllowed(
                surfaceType,
                state,
            )
        ) {
            throw new Error(
                `Surface '${surfaceType}' does not allow state '${state}'.`,
            );
        }

        const definition =
            getSurfaceStateDefinition(
                surfaceType,
                state,
            );

        this.validateStateDefinition(
            definition
                .rollingResistanceMultiplier,
            surfaceType,
            state,
        );
    }

    private validateStateDefinition(
        rollingResistanceMultiplier:
            number,

        surfaceType:
            SurfaceType,

        state:
            SurfaceState,
    ): void {

        if (
            !Number.isFinite(
                rollingResistanceMultiplier,
            ) ||
            rollingResistanceMultiplier <=
            0
        ) {
            throw new Error(
                `Surface '${surfaceType}' state '${state}' rollingResistanceMultiplier must be a finite number greater than zero.`,
            );
        }
    }

    private notifyChanged():
        void {

        this.changeListeners.forEach(
            (
                listener:
                    SurfaceChangeListener,
            ): void => {

                listener();
            },
        );
    }
}
