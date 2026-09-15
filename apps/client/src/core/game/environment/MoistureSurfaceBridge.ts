import {
    DEFAULT_MOISTURE_SURFACE_BRIDGE_DEFINITION,
    validateMoistureSurfaceBridgeDefinition,
} from "../config/MoistureSurfaceBridgeDefinition";

import type {
    MoistureSurfaceBridgeDefinition,
    MoistureSurfaceProfile,
} from "../config/MoistureSurfaceBridgeDefinition";

import {
    SurfaceState,
} from "../surface/SurfaceState";

import type {
    SurfaceSample,
} from "../surface/SurfaceSample";

import type {
    SurfaceSystem,
} from "../surface/SurfaceSystem";

import type {
    SurfaceType,
} from "../surface/SurfaceType";

import type {
    EnvironmentField,
} from "./EnvironmentField";

const MOISTURE_DERIVED_DRY =
    0;

const MOISTURE_DERIVED_WET =
    1;

/**
 * Sparse adapter between continuous EnvironmentField moisture and the
 * categorical SurfaceSystem used by gameplay consumers such as Ball.
 *
 * It intentionally does not create SurfaceStateRegion objects for field cells.
 * The bridge registers one generic derived-state resolver with SurfaceSystem
 * and keeps only moisture-derived Wet classifications in a compact sparse set.
 *
 * Explicit SurfaceStateRegions and explicitly changed authored zone states
 * retain precedence inside SurfaceSystem. This means Scorched Grass can remain
 * categorically Scorched while EnvironmentField moisture rises underneath it.
 */
export class MoistureSurfaceBridge {
    private readonly definition:
        MoistureSurfaceBridgeDefinition;

    private readonly classification:
        Uint8Array;

    private readonly wetCellIndices:
        number[] = [];

    private readonly wetCellTracked:
        Uint8Array;

    private readonly wetCellPositions:
        Int32Array;

    private readonly profileBySurfaceType:
        ReadonlyMap<
            SurfaceType,
            MoistureSurfaceProfile
        >;

    private readonly unregisterResolver:
        () => void;

    private revision =
        0;

    public constructor(
        private readonly environmentField:
            EnvironmentField,

        private readonly surfaceSystem:
            SurfaceSystem,

        definition:
            MoistureSurfaceBridgeDefinition =
            DEFAULT_MOISTURE_SURFACE_BRIDGE_DEFINITION,
    ) {
        validateMoistureSurfaceBridgeDefinition(
            definition,
        );

        this.definition =
            definition;

        this.classification =
            new Uint8Array(
                environmentField
                    .getCellCount(),
            );

        this.wetCellTracked =
            new Uint8Array(
                environmentField
                    .getCellCount(),
            );

        this.wetCellPositions =
            new Int32Array(
                environmentField
                    .getCellCount(),
            );

        this.wetCellPositions.fill(
            -1,
        );

        this.profileBySurfaceType =
            new Map(
                definition.surfaceProfiles
                    .map(
                        (
                            profile,
                        ) => [
                            profile.surfaceType,
                            profile,
                        ] as const,
                    ),
            );

        this.unregisterResolver =
            this.surfaceSystem
                .registerDerivedStateResolver(
                    "moisture-surface-bridge",
                    (
                        worldX,
                        worldY,
                        currentSample,
                    ) =>
                        this.resolveDerivedState(
                            worldX,
                            worldY,
                            currentSample,
                        ),
                );
    }

    public update():
        void {
        if (
            !this.definition.enabled
        ) {
            return;
        }

        /*
         * Process the union of:
         * 1. EnvironmentField cells that currently have meaningful excess
         *    moisture.
         * 2. Cells already classified Wet by this bridge.
         *
         * The second group is essential. EnvironmentField can stop tracking a
         * nearly dry cell before it crosses the bridge's dry hysteresis
         * threshold, so Wet cells must remain self-tracked until they return
         * to their dry categorical state.
         */
        const candidates =
            new Set<number>(
                this.environmentField
                    .getTrackedMoistureIndices(),
            );

        for (
            const index
            of this.wetCellIndices
        ) {
            candidates.add(
                index,
            );
        }

        if (
            candidates.size ===
            0
        ) {
            return;
        }

        let changed =
            false;

        for (
            const index
            of candidates
        ) {
            const center =
                this.environmentField
                    .getWorldCenterByIndex(
                        index,
                    );

            if (!center) {
                continue;
            }

            const surfaceSample =
                this.surfaceSystem
                    .getSurfaceAt(
                        center.x,
                        center.y,
                    );

            const profile =
                this.profileBySurfaceType
                    .get(
                        surfaceSample
                            .surfaceType,
                    );

            if (!profile) {
                continue;
            }

            const moisture =
                this.environmentField
                    .getMoistureByIndex(
                        index,
                    );

            const wasWet =
                this.classification[
                    index
                ] ===
                MOISTURE_DERIVED_WET;

            let shouldBeWet =
                wasWet;

            if (
                moisture >=
                profile.wetThreshold
            ) {
                shouldBeWet =
                    true;
            }
            else if (
                moisture <=
                profile.dryThreshold
            ) {
                shouldBeWet =
                    false;
            }

            if (
                shouldBeWet ===
                wasWet
            ) {
                continue;
            }

            this.setWetClassification(
                index,
                shouldBeWet,
            );

            changed =
                true;
        }

        if (
            changed
        ) {
            this.revision +=
                1;

            this.surfaceSystem
                .notifyDerivedStateChanged();
        }
    }

    public reset():
        void {
        if (
            this.wetCellIndices.length ===
            0
        ) {
            this.classification.fill(
                MOISTURE_DERIVED_DRY,
            );

            return;
        }

        this.classification.fill(
            MOISTURE_DERIVED_DRY,
        );

        this.wetCellTracked.fill(
            0,
        );

        this.wetCellPositions.fill(
            -1,
        );

        this.wetCellIndices.length =
            0;

        this.revision +=
            1;

        this.surfaceSystem
            .notifyDerivedStateChanged();
    }

    public destroy():
        void {
        this.reset();

        this.unregisterResolver();
    }

    public getDefinition():
        MoistureSurfaceBridgeDefinition {
        return this.definition;
    }

    public getWetCellIndices():
        readonly number[] {
        return this.wetCellIndices;
    }

    public getWetCellCount():
        number {
        return this.wetCellIndices
            .length;
    }

    public getRevision():
        number {
        return this.revision;
    }

    public isWetByIndex(
        index:
            number,
    ): boolean {
        if (
            !Number.isInteger(
                index,
            ) ||
            index < 0 ||
            index >=
                this.classification
                    .length
        ) {
            return false;
        }

        return this.classification[
            index
        ] ===
            MOISTURE_DERIVED_WET;
    }

    public getProfileForSurfaceType(
        surfaceType:
            SurfaceType,
    ): MoistureSurfaceProfile | null {
        return this.profileBySurfaceType
            .get(
                surfaceType,
            ) ??
            null;
    }

    private resolveDerivedState(
        worldX:
            number,

        worldY:
            number,

        currentSample:
            SurfaceSample,
    ): SurfaceState | null {
        if (
            !this.definition.enabled
        ) {
            return null;
        }

        const index =
            this.getEnvironmentIndexAtWorld(
                worldX,
                worldY,
            );

        if (
            index ===
            null
        ) {
            return null;
        }

        const profile =
            this.profileBySurfaceType
                .get(
                    currentSample
                        .surfaceType,
                );

        if (!profile) {
            return null;
        }

        if (
            this.classification[
                index
            ] ===
            MOISTURE_DERIVED_WET
        ) {
            return profile.wetState;
        }

        /*
         * Returning null while dry deliberately leaves the underlying base
         * terrain untouched. SurfaceSystem's authored/default dry state is
         * already correct for Grass and Sand.
         */
        return null;
    }

    /**
     * Maps world space to EnvironmentField index without touching lazy field
     * initialization.
     *
     * This is important because EnvironmentField initialization itself samples
     * SurfaceSystem. Calling EnvironmentField.getCellAtWorld() from a
     * SurfaceSystem derived resolver would therefore recurse.
     */
    private getEnvironmentIndexAtWorld(
        worldX:
            number,

        worldY:
            number,
    ): number | null {
        if (
            !Number.isFinite(
                worldX,
            ) ||
            !Number.isFinite(
                worldY,
            )
        ) {
            return null;
        }

        const cellSize =
            this.environmentField
                .getDefinition()
                .cellSize;

        const gridX =
            Math.floor(
                (
                    worldX -
                    this.environmentField
                        .getMinimumWorldX()
                ) /
                cellSize,
            );

        const gridY =
            Math.floor(
                (
                    worldY -
                    this.environmentField
                        .getMinimumWorldY()
                ) /
                cellSize,
            );

        if (
            gridX < 0 ||
            gridY < 0 ||
            gridX >=
                this.environmentField
                    .getColumnCount() ||
            gridY >=
                this.environmentField
                    .getRowCount()
        ) {
            return null;
        }

        return (
            gridY *
            this.environmentField
                .getColumnCount() +
            gridX
        );
    }

    private setWetClassification(
        index:
            number,

        wet:
            boolean,
    ): void {
        if (
            wet
        ) {
            if (
                this.wetCellTracked[
                    index
                ] !==
                0
            ) {
                this.classification[
                    index
                ] =
                    MOISTURE_DERIVED_WET;

                return;
            }

            this.classification[
                index
            ] =
                MOISTURE_DERIVED_WET;

            this.wetCellTracked[
                index
            ] =
                1;

            this.wetCellPositions[
                index
            ] =
                this.wetCellIndices
                    .length;

            this.wetCellIndices.push(
                index,
            );

            return;
        }

        this.classification[
            index
        ] =
            MOISTURE_DERIVED_DRY;

        if (
            this.wetCellTracked[
                index
            ] ===
            0
        ) {
            return;
        }

        const position =
            this.wetCellPositions[
                index
            ];

        const lastPosition =
            this.wetCellIndices
                .length -
            1;

        const lastIndex =
            this.wetCellIndices[
                lastPosition
            ];

        if (
            position >= 0 &&
            position !==
                lastPosition &&
            lastIndex !==
                undefined
        ) {
            this.wetCellIndices[
                position
            ] =
                lastIndex;

            this.wetCellPositions[
                lastIndex
            ] =
                position;
        }

        this.wetCellIndices.pop();

        this.wetCellTracked[
            index
        ] =
            0;

        this.wetCellPositions[
            index
        ] =
            -1;
    }
}
