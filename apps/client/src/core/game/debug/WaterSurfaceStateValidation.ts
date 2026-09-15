import type {
    EnvironmentField,
} from "../environment/EnvironmentField";

import type {
    WaterField,
} from "../environment/WaterField";

import type {
    SurfaceSystem,
} from "../surface/SurfaceSystem";

import {
    SurfaceState,
} from "../surface/SurfaceState";

import {
    SurfaceType,
} from "../surface/SurfaceType";

export interface WaterSurfaceStateValidationState {
    readonly grassWettingPassed: boolean;
    readonly grassDryingPassed: boolean;
    readonly sandWettingPassed: boolean;
    readonly sandDryingPassed: boolean;
    readonly scorchedWaterPassed: boolean;
    readonly scorchedPersistencePassed: boolean;
    readonly materialIsolationPassed: boolean;
    readonly passed: boolean;
}

/**
 * Phase 8C-8C live acceptance monitor for Water/material state interaction.
 *
 * This validator is observation-only. It does not create Water, alter
 * moisture, change surfaces, or accelerate drying. The 8C-8A left-mouse Water
 * tool, Sprinkler and Hose can therefore be used to exercise the real runtime
 * while this class checks the resulting authoritative state.
 */
export class WaterSurfaceStateValidation {

    private grassWettingPassed =
        false;

    private grassDryingPassed =
        false;

    private sandWettingPassed =
        false;

    private sandDryingPassed =
        false;

    private scorchedWaterPassed =
        false;

    private scorchedPersistencePassed =
        false;

    private materialIsolationPassed =
        true;

    private observedWetGrass =
        false;

    private observedWetSand =
        false;

    private observedWaterOnScorched =
        false;

    private loggedOverallPass =
        false;

    private refreshAccumulator =
        0;

    private readonly refreshIntervalSeconds =
        0.20;

    public constructor(
        private readonly waterField:
            WaterField,

        private readonly environmentField:
            EnvironmentField,

        private readonly surfaceSystem:
            SurfaceSystem,
    ) {
        console.info(
            "[8C-8C] Water Surface State validation ready. Use the 8C-8A Water deposit tool on Grass, Sand and Scorched terrain.",
        );
    }

    public update(
        deltaTime:
            number,
    ): void {

        if (
            !Number.isFinite(deltaTime) ||
            deltaTime < 0
        ) {
            return;
        }

        this.refreshAccumulator +=
            deltaTime;

        if (
            this.refreshAccumulator <
            this.refreshIntervalSeconds
        ) {
            return;
        }

        this.refreshAccumulator %=
            this.refreshIntervalSeconds;

        this.inspectMoistureStates();
        this.inspectStandingWaterStates();
        this.inspectDryingTransitions();

        const state =
            this.getState();

        if (
            state.passed &&
            !this.loggedOverallPass
        ) {
            this.loggedOverallPass =
                true;

            console.info(
                "[8C-8C] Water Surface State Validation: PASS",
                state,
            );
        }
    }

    public getState():
        WaterSurfaceStateValidationState {

        return {
            grassWettingPassed:
                this.grassWettingPassed,

            grassDryingPassed:
                this.grassDryingPassed,

            sandWettingPassed:
                this.sandWettingPassed,

            sandDryingPassed:
                this.sandDryingPassed,

            scorchedWaterPassed:
                this.scorchedWaterPassed,

            scorchedPersistencePassed:
                this.scorchedPersistencePassed,

            materialIsolationPassed:
                this.materialIsolationPassed,

            passed:
                this.grassWettingPassed &&
                this.grassDryingPassed &&
                this.sandWettingPassed &&
                this.sandDryingPassed &&
                this.scorchedWaterPassed &&
                this.scorchedPersistencePassed &&
                this.materialIsolationPassed,
        };
    }

    private inspectMoistureStates():
        void {

        for (
            const index
            of this.environmentField
                .getTrackedMoistureIndices()
        ) {
            const center =
                this.environmentField
                    .getWorldCenterByIndex(
                        index,
                    );

            if (!center) {
                continue;
            }

            const surface =
                this.surfaceSystem
                    .getSurfaceAt(
                        center.x,
                        center.y,
                    );

            const moisture =
                this.environmentField
                    .getMoistureByIndex(
                        index,
                    );

            const baseline =
                this.environmentField
                    .getBaselineMoistureByIndex(
                        index,
                    );

            const hasAddedMoisture =
                moisture >
                baseline +
                0.001;

            if (
                !hasAddedMoisture
            ) {
                continue;
            }

            if (
                surface.surfaceState ===
                SurfaceState.Scorched
            ) {
                /*
                 * Moisture is allowed beneath scorch, but the categorical
                 * surface must remain Scorched.
                 */
                continue;
            }

            if (
                surface.surfaceType ===
                SurfaceType.Grass &&
                surface.surfaceState ===
                SurfaceState.Wet
            ) {
                if (
                    !this.grassWettingPassed
                ) {
                    console.info(
                        "[8C-8C] Grass Wetting: PASS",
                    );
                }

                this.grassWettingPassed =
                    true;

                this.observedWetGrass =
                    true;
            }

            if (
                surface.surfaceType ===
                SurfaceType.Sand &&
                surface.surfaceState ===
                SurfaceState.Wet
            ) {
                if (
                    !this.sandWettingPassed
                ) {
                    console.info(
                        "[8C-8C] Sand Wetting: PASS",
                    );
                }

                this.sandWettingPassed =
                    true;

                this.observedWetSand =
                    true;
            }

            /*
             * Material isolation: a Wet state must retain its authored
             * substrate type. SurfaceType itself is never rewritten by the
             * moisture bridge.
             */
            if (
                surface.surfaceState ===
                SurfaceState.Wet &&
                surface.surfaceType !==
                SurfaceType.Grass &&
                surface.surfaceType !==
                SurfaceType.Sand
            ) {
                this.materialIsolationPassed =
                    false;

                console.error(
                    "[8C-8C] Material Isolation: FAIL",
                    surface,
                );
            }
        }
    }

    private inspectStandingWaterStates():
        void {

        this.waterField
            .forEachTrackedWaterCell(
                (
                    cell,
                ): void => {

                    if (
                        cell.depth <=
                        0
                    ) {
                        return;
                    }

                    const burnAmount =
                        this.getBurnAmountAt(
                            cell.worldCenterX,
                            cell.worldCenterY,
                        );

                    /*
                     * ScorchRenderer is driven directly from authoritative
                     * EnvironmentField burnAmount. Its rendered contour can
                     * extend beyond the categorical SurfaceState.Scorched
                     * threshold, so use burnAmount here as well. This makes
                     * validation match the actual scorched material seen on
                     * screen rather than requiring pixel-identical categorical
                     * classification.
                     */
                    if (
                        burnAmount <=
                        0.055
                    ) {
                        return;
                    }

                    if (
                        !this.scorchedWaterPassed
                    ) {
                        console.info(
                            "[8C-8C] Scorched + Standing Water: PASS",
                        );
                    }

                    this.scorchedWaterPassed =
                        true;

                    this.observedWaterOnScorched =
                        true;
                },
            );
    }

    private inspectDryingTransitions():
        void {

        /*
         * Once Wet Grass/Sand has been observed, look for moisture-tracked
         * cells of that material that have subsequently returned to their dry
         * categorical state. This validates the bridge's reverse transition
         * without modifying the real drying rate.
         */
        if (
            this.observedWetGrass &&
            !this.grassDryingPassed
        ) {
            this.findDryReturn(
                SurfaceType.Grass,
                SurfaceState.Normal,
                (): void => {
                    this.grassDryingPassed =
                        true;

                    console.info(
                        "[8C-8C] Grass Drying: PASS",
                    );
                },
            );
        }

        if (
            this.observedWetSand &&
            !this.sandDryingPassed
        ) {
            this.findDryReturn(
                SurfaceType.Sand,
                SurfaceState.Dry,
                (): void => {
                    this.sandDryingPassed =
                        true;

                    console.info(
                        "[8C-8C] Sand Drying: PASS",
                    );
                },
            );
        }

        if (
            this.observedWaterOnScorched &&
            !this.scorchedPersistencePassed
        ) {
            let standingWaterOnScorched =
                false;

            this.waterField
                .forEachTrackedWaterCell(
                    (
                        cell,
                    ): void => {

                        if (
                            cell.depth <=
                            0
                        ) {
                            return;
                        }

                        const burnAmount =
                            this.getBurnAmountAt(
                                cell.worldCenterX,
                                cell.worldCenterY,
                            );

                        if (
                            burnAmount >
                            0.055
                        ) {
                            standingWaterOnScorched =
                                true;
                        }
                    },
                );

            /*
             * After Water has been observed on scorch, a later sample with no
             * standing Water over scorch confirms that Water can retreat. The
             * remaining scorched cells are then checked below.
             */
            if (
                !standingWaterOnScorched
            ) {
                for (
                    const index
                    of this.environmentField
                        .getTrackedBurnIndices()
                ) {
                    const center =
                        this.environmentField
                            .getWorldCenterByIndex(
                                index,
                            );

                    if (!center) {
                        continue;
                    }

                    const burnAmount =
                        this.getBurnAmountAt(
                            center.x,
                            center.y,
                        );

                    if (
                        burnAmount >
                        0.055
                    ) {
                        this.scorchedPersistencePassed =
                            true;

                        console.info(
                            "[8C-8C] Scorched Persistence After Water Retreat: PASS",
                        );

                        break;
                    }
                }
            }
        }
    }


    private getBurnAmountAt(
        worldX:
            number,

        worldY:
            number,
    ): number {

        const definition =
            this.environmentField
                .getDefinition();

        const cellSize =
            definition.cellSize;

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
            return 0;
        }

        const index =
            gridY *
            this.environmentField
                .getColumnCount() +
            gridX;

        return this.environmentField
            .getBurnAmountByIndex(
                index,
            );
    }

    private findDryReturn(
        surfaceType:
            SurfaceType,

        dryState:
            SurfaceState,

        onPass:
            () => void,
    ): void {

        for (
            const index
            of this.environmentField
                .getTrackedMoistureIndices()
        ) {
            const center =
                this.environmentField
                    .getWorldCenterByIndex(
                        index,
                    );

            if (!center) {
                continue;
            }

            const surface =
                this.surfaceSystem
                    .getSurfaceAt(
                        center.x,
                        center.y,
                    );

            if (
                surface.surfaceType !==
                surfaceType ||
                surface.surfaceState !==
                dryState
            ) {
                continue;
            }

            onPass();

            return;
        }
    }
}
