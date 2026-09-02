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

import {
    SurfaceStateRegion,
} from "./SurfaceStateRegion";

import type {
    SurfaceZoneDefinition,
} from "./SurfaceZone";

import type {
    SurfaceStateRegionDefinition,
} from "./SurfaceStateRegion";

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
 * Base terrain comes from authored SurfaceZones or the
 * course-wide fallback surface. Runtime SurfaceStateRegions
 * may then override only the state of the same base surface
 * type.
 *
 * Example:
 *
 * fallback Grass
 * + Scorched Grass state region
 * = Scorched Grass sample
 *
 * A Grass state region never converts Sand into Grass.
 */
export class SurfaceSystem {

    private readonly defaultSurfaceType:
        SurfaceType;

    private readonly zones:
        SurfaceZone[] = [];

    private readonly stateRegions:
        SurfaceStateRegion[] = [];

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

        for (
            const region
            of this.stateRegions
        ) {
            if (
                !region.advanceStateTimer(
                    deltaTime,
                )
            ) {
                continue;
            }

            const definition =
                region.getDefinition();

            const currentStateDefinition =
                getSurfaceStateDefinition(
                    definition.surfaceType,
                    region.getCurrentState(),
                );

            const reversionState =
                definition.reversionState ??
                currentStateDefinition.reversionState;

            if (
                reversionState ===
                null
            ) {
                region.setRuntimeState(
                    region.getCurrentState(),
                    null,
                );

                continue;
            }

            this.validateStateForSurface(
                definition.surfaceType,
                reversionState,
            );

            region.setRuntimeState(
                reversionState,
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

    // ---------------------------------------------------------------------
    // Base authored zones
    // ---------------------------------------------------------------------

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

        this.zones.length =
            0;

        this.notifyChanged();
    }

    // ---------------------------------------------------------------------
    // Runtime state regions
    // ---------------------------------------------------------------------

    public addStateRegion(
        definition:
            SurfaceStateRegionDefinition,
    ): boolean {

        if (
            this.stateRegions.some(
                (
                    region:
                        SurfaceStateRegion,
                ): boolean =>
                    region
                        .getDefinition()
                        .id ===
                    definition.id,
            )
        ) {
            return false;
        }

        this.validateStateForSurface(
            definition.surfaceType,
            definition.state,
        );

        if (
            definition.reversionState !==
            null
        ) {
            this.validateStateForSurface(
                definition.surfaceType,
                definition.reversionState,
            );
        }

        if (
            definition.durationSeconds !==
            null &&
            definition.reversionState ===
            null &&
            getSurfaceStateDefinition(
                definition.surfaceType,
                definition.state,
            )
                .reversionState ===
            null
        ) {
            throw new Error(
                `Surface state region '${definition.id}' cannot use a temporary duration because its state has no reversion state.`,
            );
        }

        this.stateRegions.push(
            new SurfaceStateRegion(
                definition,
            ),
        );

        this.notifyChanged();

        return true;
    }

    public clearStateRegions():
        void {

        if (
            this.stateRegions.length ===
            0
        ) {
            return;
        }

        this.stateRegions.length =
            0;

        this.notifyChanged();
    }

    public getStateRegions():
        readonly SurfaceStateRegion[] {

        return this.stateRegions;
    }

    // ---------------------------------------------------------------------
    // Queries
    // ---------------------------------------------------------------------

    public getSurfaceAt(
        worldX:
            number,

        worldY:
            number,
    ): SurfaceSample {

        const baseSample =
            this.getBaseSurfaceAt(
                worldX,
                worldY,
            );

        for (
            let regionIndex =
                this.stateRegions.length -
                1;

            regionIndex >= 0;

            regionIndex -= 1
        ) {
            const region =
                this.stateRegions[
                regionIndex
                ];

            if (
                !region ||
                !region.containsPoint(
                    worldX,
                    worldY,
                )
            ) {
                continue;
            }

            const definition =
                region.getDefinition();

            if (
                definition.surfaceType !==
                baseSample.surfaceType
            ) {
                continue;
            }

            const currentState =
                region.getCurrentState();

            const stateDefinition =
                getSurfaceStateDefinition(
                    baseSample.surfaceType,
                    currentState,
                );

            this.validateStateDefinition(
                stateDefinition
                    .rollingResistanceMultiplier,
                baseSample.surfaceType,
                currentState,
            );

            return {
                surfaceType:
                    baseSample.surfaceType,

                surfaceState:
                    currentState,

                rollingResistanceMultiplier:
                    stateDefinition
                        .rollingResistanceMultiplier,

                zoneId:
                    baseSample.zoneId,
            };
        }

        return baseSample;
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
                this.zones.length -
                1;

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

    // ---------------------------------------------------------------------
    // Internal base terrain resolution
    // ---------------------------------------------------------------------

    private getBaseSurfaceAt(
        worldX:
            number,

        worldY:
            number,
    ): SurfaceSample {

        for (
            let zoneIndex =
                this.zones.length -
                1;

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
