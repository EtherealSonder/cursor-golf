import type {
    EnvironmentField,
} from "../environment/EnvironmentField";

import type {
    MoistureSurfaceBridge,
} from "../environment/MoistureSurfaceBridge";

import type {
    WaterField,
} from "../environment/WaterField";

import type {
    WaterGroundInteractionSystem,
} from "../environment/WaterGroundInteractionSystem";

export interface WetFootprintLifecycleValidationState {
    readonly contactWettingPassed:
        boolean;

    readonly retreatRevealPassed:
        boolean;

    readonly slowDryingPassed:
        boolean;

    readonly maximumPuddleCellCount:
        number;

    readonly maximumWetCellCount:
        number;

    readonly wetCellsAfterPuddleRemoval:
        number;

    readonly wetCellsAfterShortDrying:
        number;

    readonly passed:
        boolean;
}

/**
 * Phase 8C-6B focused lifecycle validation.
 *
 * It verifies the design contract:
 * Water footprint grows -> ground beneath becomes Wet -> Water retreats ->
 * former puddle footprint remains Wet -> Wet footprint dries later.
 */
export class WetFootprintLifecycleValidation {
    private state:
        WetFootprintLifecycleValidationState | null =
        null;

    public constructor(
        private readonly interactionSystem:
            WaterGroundInteractionSystem,

        private readonly waterField:
            WaterField,

        private readonly environmentField:
            EnvironmentField,

        private readonly bridge:
            MoistureSurfaceBridge,
    ) { }

    public run():
        WetFootprintLifecycleValidationState {
        const previousContactState =
            this.interactionSystem
                .isContactWettingEnabled();

        this.resetAll();

        this.interactionSystem
            .setContactWettingEnabledForValidation(
                true,
            );

        const centerIndex =
            this.getCenterIndex();

        const columns =
            this.waterField
                .getColumnCount();

        const rows =
            this.waterField
                .getRowCount();

        const centerX =
            centerIndex %
            columns;

        const centerY =
            Math.floor(
                centerIndex /
                columns,
            );

        /*
         * Controlled 5x5 disk. Each occupied cell is comfortably above the
         * contact threshold so the expected footprint is unambiguous.
         */
        for (
            let offsetY = -2;
            offsetY <= 2;
            offsetY += 1
        ) {
            for (
                let offsetX = -2;
                offsetX <= 2;
                offsetX += 1
            ) {
                if (
                    offsetX * offsetX +
                    offsetY * offsetY >
                    4
                ) {
                    continue;
                }

                const gridX =
                    centerX +
                    offsetX;

                const gridY =
                    centerY +
                    offsetY;

                if (
                    gridX < 0 ||
                    gridY < 0 ||
                    gridX >= columns ||
                    gridY >= rows
                ) {
                    continue;
                }

                const index =
                    gridY *
                    columns +
                    gridX;

                const center =
                    this.waterField
                        .getWorldCenterByIndex(
                            index,
                        );

                if (!center) {
                    continue;
                }

                this.waterField
                    .injectWater(
                        center.x,
                        center.y,
                        0.12,
                    );
            }
        }

        const maximumPuddleCellCount =
            this.countMeaningfulPuddleCells();

        this.interactionSystem
            .update(
                1 / 60,
            );

        this.bridge
            .update();

        const maximumWetCellCount =
            this.bridge
                .getWetCellCount();

        const contactWettingPassed =
            maximumPuddleCellCount > 0 &&
            maximumWetCellCount >=
                maximumPuddleCellCount;

        /*
         * Remove standing Water directly to isolate the reveal contract from
         * WaterFlowSolver timing. Ground moisture must remain.
         */
        const waterIndices:
            number[] = [];

        this.waterField
            .forEachTrackedWaterCell(
                (cell): void => {
                    if (
                        cell.depth > 0
                    ) {
                        waterIndices.push(
                            cell.index,
                        );
                    }
                },
            );

        for (
            const index
            of waterIndices
        ) {
            const center =
                this.waterField
                    .getWorldCenterByIndex(
                        index,
                    );

            if (!center) {
                continue;
            }

            const depth =
                this.waterField
                    .sampleAt(
                        center.x,
                        center.y,
                    )?.depth ?? 0;

            if (depth > 0) {
                this.waterField
                    .removeWaterByIndex(
                        index,
                        depth,
                    );
            }
        }

        this.bridge
            .update();

        const wetCellsAfterPuddleRemoval =
            this.bridge
                .getWetCellCount();

        const retreatRevealPassed =
            this.countMeaningfulPuddleCells() ===
                0 &&
            wetCellsAfterPuddleRemoval >=
                Math.max(
                    1,
                    Math.floor(
                        maximumWetCellCount *
                        0.9,
                    ),
                );

        /*
         * One second is intentionally short compared with ground drying.
         * The Wet footprint should still be substantially present.
         */
        for (
            let frame = 0;
            frame < 60;
            frame += 1
        ) {
            this.interactionSystem
                .update(
                    1 / 60,
                );

            this.bridge
                .update();
        }

        const wetCellsAfterShortDrying =
            this.bridge
                .getWetCellCount();

        const slowDryingPassed =
            wetCellsAfterShortDrying >=
                Math.max(
                    1,
                    Math.floor(
                        wetCellsAfterPuddleRemoval *
                        0.75,
                    ),
                );

        const passed =
            contactWettingPassed &&
            retreatRevealPassed &&
            slowDryingPassed;

        this.state = {
            contactWettingPassed,
            retreatRevealPassed,
            slowDryingPassed,
            maximumPuddleCellCount,
            maximumWetCellCount,
            wetCellsAfterPuddleRemoval,
            wetCellsAfterShortDrying,
            passed,
        };

        console.group(
            "Phase 8C-6B Wet Footprint Lifecycle validation",
        );

        console.log(
            "Water Contact Wetting",
            {
                maximumPuddleCellCount,
                maximumWetCellCount,
                passed:
                    contactWettingPassed,
            },
        );

        console.log(
            "Puddle Retreat / Wet Reveal",
            {
                wetCellsAfterPuddleRemoval,
                passed:
                    retreatRevealPassed,
            },
        );

        console.log(
            "Slow Wet-Ground Drying",
            {
                wetCellsAfterShortDrying,
                passed:
                    slowDryingPassed,
            },
        );

        console.log(
            "RESULT:",
            passed
                ? "PASS"
                : "FAIL",
        );

        console.groupEnd();

        this.resetAll();

        this.interactionSystem
            .setContactWettingEnabledForValidation(
                previousContactState,
            );

        return this.state;
    }

    public getState():
        WetFootprintLifecycleValidationState | null {
        return this.state;
    }

    private countMeaningfulPuddleCells():
        number {
        const threshold =
            this.interactionSystem
                .getDefinition()
                .minimumContactWettingDepth;

        let count =
            0;

        this.waterField
            .forEachTrackedWaterCell(
                (cell): void => {
                    if (
                        cell.depth >=
                        threshold
                    ) {
                        count +=
                            1;
                    }
                },
            );

        return count;
    }

    private getCenterIndex():
        number {
        const x =
            Math.min(
                24,
                this.waterField
                    .getColumnCount() -
                    1,
            );

        const y =
            Math.min(
                24,
                this.waterField
                    .getRowCount() -
                    1,
            );

        return (
            y *
            this.waterField
                .getColumnCount() +
            x
        );
    }

    private resetAll():
        void {
        this.waterField
            .reset();

        this.environmentField
            .reset();

        this.interactionSystem
            .reset();

        this.bridge
            .reset();
    }
}
