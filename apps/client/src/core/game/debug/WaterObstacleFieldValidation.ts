import type {
    WaterField,
} from "../environment/WaterField";

import {
    WaterObstacleField,
} from "../environment/WaterObstacleField";

/**
 * Phase 8D-1 deterministic acceptance checks.
 *
 * Uses controlled shapes only. Actual procedural/gameplay collider
 * registration is intentionally deferred to later 8D integration work.
 */
export class WaterObstacleFieldValidation {

    public constructor(
        private readonly waterField:
            WaterField,

        private readonly obstacleField:
            WaterObstacleField,
    ) {}

    public run():
        void {

        this.obstacleField.clear();

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

        const centerX =
            originX +
            12.5 *
            cellSize;

        const centerY =
            originY +
            12.5 *
            cellSize;

        this.obstacleField
            .rasterizeRectangle(
                centerX,
                centerY,
                cellSize * 3,
                cellSize * 2,
            );

        const rectanglePass =
            this.obstacleField
                .isBlocked(
                    12,
                    12,
                ) &&
            this.obstacleField
                .canOccupy(
                    7,
                    7,
                );

        this.assertPass(
            "Rectangle Occupancy",
            rectanglePass,
        );

        this.obstacleField.clear();

        this.obstacleField
            .rasterizeCircle(
                centerX,
                centerY,
                cellSize * 1.5,
            );

        const circlePass =
            this.obstacleField
                .isBlocked(
                    12,
                    12,
                ) &&
            this.obstacleField
                .canOccupy(
                    7,
                    7,
                );

        this.assertPass(
            "Circle Occupancy",
            circlePass,
        );

        const centerIndex =
            12 *
            this.waterField
                .getColumnCount() +
            12;

        const freeIndex =
            7 *
            this.waterField
                .getColumnCount() +
            7;

        this.assertPass(
            "Free Cell Query",
            !this.obstacleField
                .isBlockedByIndex(
                    freeIndex,
                ),
        );

        this.assertPass(
            "Flow Query Contract",
            !this.obstacleField
                .canFlowBetween(
                    freeIndex,
                    centerIndex,
                ) &&
            this.obstacleField
                .canFlowBetween(
                    freeIndex,
                    freeIndex,
                ),
        );

        this.obstacleField.clear();

        this.assertPass(
            "Reset",
            this.obstacleField
                .getBlockedCellCount() ===
            0,
        );

        console.info(
            "[8D-1] Water Obstacle Occupancy Foundation: PASS",
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
                `[8D-1] ${name}: FAIL`,
            );
        }

        console.info(
            `[8D-1] ${name}: PASS`,
        );
    }
}
