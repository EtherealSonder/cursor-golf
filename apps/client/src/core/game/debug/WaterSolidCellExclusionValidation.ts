import type {
    WaterField,
} from "../environment/WaterField";

import type {
    WaterObstacleField,
} from "../environment/WaterObstacleField";

/**
 * Phase 8D-2 deterministic validation for authoritative Water injection.
 *
 * This test does not exercise WaterFlowSolver. Phase 8D-3 owns transport
 * exclusion. Here we prove only that new Water cannot be created in blocked
 * cells and that redirected deposits conserve accepted Water.
 */
export class WaterSolidCellExclusionValidation {

    public constructor(
        private readonly waterField:
            WaterField,

        private readonly obstacleField:
            WaterObstacleField,
    ) {}

    public run():
        void {

        const definition =
            this.waterField
                .getDefinition();

        const cellSize =
            definition.cellSize;

        const originX =
            this.waterField
                .getMinimumWorldX();

        const originY =
            this.waterField
                .getMinimumWorldY();

        const worldCenter = (
            gridX: number,
            gridY: number,
        ): {
            readonly x: number;
            readonly y: number;
        } => ({
            x:
                originX +
                (gridX + 0.5) *
                cellSize,

            y:
                originY +
                (gridY + 0.5) *
                cellSize,
        });

        this.waterField.reset();
        this.obstacleField.clear();

        const free =
            worldCenter(
                10,
                10,
            );

        const freeAccepted =
            this.waterField
                .injectWater(
                    free.x,
                    free.y,
                    0.25,
                );

        this.assertPass(
            "Free Cell Injection",
            freeAccepted > 0 &&
            this.waterField
                .getDepthAt(
                    free.x,
                    free.y,
                ) > 0,
        );

        this.waterField.reset();
        this.obstacleField.clear();

        const blocked =
            worldCenter(
                20,
                20,
            );

        this.obstacleField
            .rasterizeRectangle(
                blocked.x,
                blocked.y,
                cellSize * 0.75,
                cellSize * 0.75,
            );

        const beforeTotal =
            this.waterField
                .getTotalWaterAmount();

        const accepted =
            this.waterField
                .injectWater(
                    blocked.x,
                    blocked.y,
                    0.4,
                );

        const blockedDepth =
            this.waterField
                .getDepthAt(
                    blocked.x,
                    blocked.y,
                );

        this.assertPass(
            "Blocked Cell Exclusion",
            blockedDepth === 0,
        );

        this.assertPass(
            "Redirected Deposit",
            accepted > 0 &&
            this.waterField
                .getNonEmptyCellCount() >
            0,
        );

        this.assertPass(
            "Water Conservation",
            Math.abs(
                (
                    this.waterField
                        .getTotalWaterAmount() -
                    beforeTotal
                ) -
                accepted,
            ) <
            0.000001,
        );

        this.waterField.reset();

        const momentumAccepted =
            this.waterField
                .injectWaterWithMomentum(
                    blocked.x,
                    blocked.y,
                    0.3,
                    240,
                    -120,
                );

        let redirectedMomentumFound =
            false;

        this.waterField
            .forEachTrackedWaterCell(
                (
                    cell,
                ): void => {

                    if (
                        cell.depth > 0 &&
                        (
                            Math.abs(
                                cell.velocityX,
                            ) > 0 ||
                            Math.abs(
                                cell.velocityY,
                            ) > 0
                        )
                    ) {
                        redirectedMomentumFound =
                            true;
                    }
                },
            );

        this.assertPass(
            "Momentum Deposit",
            momentumAccepted > 0 &&
            redirectedMomentumFound,
        );

        this.waterField.reset();
        this.obstacleField.clear();

        const enclosed =
            worldCenter(
                30,
                30,
            );

        this.obstacleField
            .rasterizeRectangle(
                enclosed.x,
                enclosed.y,
                cellSize * 19,
                cellSize * 19,
            );

        const rejected =
            this.waterField
                .injectWater(
                    enclosed.x,
                    enclosed.y,
                    0.2,
                );

        this.assertPass(
            "Enclosed Deposit Safety",
            rejected === 0 &&
            this.waterField
                .getTotalWaterAmount() ===
            0,
        );

        this.waterField.reset();
        this.obstacleField.clear();

        console.info(
            "[8D-2] Ground-Water Solid Cell Exclusion: PASS",
        );
    }

    private assertPass(
        name:
            string,

        condition:
            boolean,
    ): void {

        if (!condition) {
            throw new Error(
                `[8D-2] ${name}: FAIL`,
            );
        }

        console.info(
            `[8D-2] ${name}: PASS`,
        );
    }
}
