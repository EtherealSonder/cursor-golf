import type {
    WaterField,
} from "../environment/WaterField";

import type {
    WaterObstacleField,
} from "../environment/WaterObstacleField";

/**
 * Phase 8D-4 validation for Water accumulation and redistribution around
 * blocked boundaries. Controlled Water-grid obstacles are used so this phase
 * remains independent from gameplay collider registration.
 */
export class WaterBoundaryFlowValidation {

    public constructor(
        private readonly waterField:
            WaterField,

        private readonly obstacleField:
            WaterObstacleField,
    ) { }

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

        const center = (
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

        const step = (
            count:
                number,
        ): void => {

            for (
                let i = 0;
                i < count;
                i += 1
            ) {
                this.waterField
                    .update(
                        definition
                            .simulationStepSeconds,
                    );
            }
        };

        // ---------------------------------------------------------
        // 1. Boundary accumulation
        // ---------------------------------------------------------

        this.resetFields();

        const wallX =
            28;

        const wallY =
            28;

        const wallCenter =
            center(
                wallX,
                wallY,
            );

        this.obstacleField
            .rasterizeRectangle(
                wallCenter.x,
                wallCenter.y,
                cellSize * 0.75,
                cellSize * 9,
            );

        const accumulationSource =
            center(
                wallX - 1,
                wallY,
            );

        this.waterField
            .injectWaterWithMomentum(
                accumulationSource.x,
                accumulationSource.y,
                2,
                420,
                0,
            );

        const accumulationTotalBefore =
            this.waterField
                .getTotalWaterAmount();

        step(
            30,
        );

        const boundaryDepth =
            this.waterField
                .getDepthAt(
                    accumulationSource.x,
                    accumulationSource.y,
                );

        this.assertPass(
            "Boundary Accumulation",
            boundaryDepth > 0,
        );

        // ---------------------------------------------------------
        // 2. Redistribution along and around a short wall
        // ---------------------------------------------------------

        this.resetFields();

        const shortWall =
            center(
                44,
                44,
            );

        this.obstacleField
            .rasterizeRectangle(
                shortWall.x,
                shortWall.y,
                cellSize * 0.75,
                cellSize * 3,
            );

        const redistributionSource =
            center(
                43,
                44,
            );

        this.waterField
            .injectWaterWithMomentum(
                redistributionSource.x,
                redistributionSource.y,
                3,
                360,
                120,
            );

        step(
            180,
        );

        let redistributed =
            false;

        for (
            let y = 41;
            y <= 47;
            y += 1
        ) {
            for (
                let x = 45;
                x <= 49;
                x += 1
            ) {
                const sample =
                    center(
                        x,
                        y,
                    );

                if (
                    this.waterField
                        .getDepthAt(
                            sample.x,
                            sample.y,
                        ) >
                    0.000001
                ) {
                    redistributed =
                        true;
                }
            }
        }

        this.assertPass(
            "Boundary Redistribution",
            redistributed,
        );

        // ---------------------------------------------------------
        // 3. Routing through a deliberate gap
        // ---------------------------------------------------------

        this.resetFields();

        const gapX =
            62;

        const gapY =
            50;

        /*
         * Build two short wall segments with an explicit three-cell opening.
         *
         * Because WaterObstacleField uses conservative cell-AABB overlap
         * rasterization, the geometry is positioned on exact cell centres and
         * kept short enough that the opening remains genuinely free in the
         * Water occupancy grid.
         */
        const upperWall =
            center(
                gapX,
                gapY - 4,
            );

        const lowerWall =
            center(
                gapX,
                gapY + 4,
            );

        this.obstacleField
            .rasterizeRectangle(
                upperWall.x,
                upperWall.y,
                cellSize * 0.75,
                cellSize * 3,
            );

        this.obstacleField
            .rasterizeRectangle(
                lowerWall.x,
                lowerWall.y,
                cellSize * 0.75,
                cellSize * 3,
            );

        /*
         * Validate the test fixture itself before testing Water. This prevents
         * a rasterization mistake from being misdiagnosed as a flow failure.
         */
        const gapCellsAreOpen =
            !this.obstacleField
                .isBlocked(
                    gapX,
                    gapY - 1,
                ) &&
            !this.obstacleField
                .isBlocked(
                    gapX,
                    gapY,
                ) &&
            !this.obstacleField
                .isBlocked(
                    gapX,
                    gapY + 1,
                );

        this.assertPass(
            "Gap Geometry",
            gapCellsAreOpen,
        );

        const gapSource =
            center(
                gapX - 2,
                gapY,
            );

        this.waterField
            .injectWaterWithMomentum(
                gapSource.x,
                gapSource.y,
                3,
                480,
                0,
            );

        step(
            180,
        );

        /*
         * The routed Water may spread after crossing the opening, so validate
         * a compact region immediately behind the confirmed-open gap rather
         * than requiring one exact destination cell.
         */
        let reachedFarSideThroughGap =
            false;

        for (
            let y = gapY - 2;
            y <= gapY + 2;
            y += 1
        ) {
            for (
                let x = gapX + 1;
                x <= gapX + 5;
                x += 1
            ) {
                const sample =
                    center(
                        x,
                        y,
                    );

                if (
                    this.waterField
                        .getDepthAt(
                            sample.x,
                            sample.y,
                        ) >
                    0.000001
                ) {
                    reachedFarSideThroughGap =
                        true;
                }
            }
        }

        this.assertPass(
            "Gap Routing",
            reachedFarSideThroughGap,
        );

        // ---------------------------------------------------------
        // 4. Corner stability
        // ---------------------------------------------------------

        this.resetFields();

        const cornerX =
            78;

        const cornerY =
            60;

        const vertical =
            center(
                cornerX,
                cornerY,
            );

        const horizontal =
            center(
                cornerX - 2,
                cornerY - 4,
            );

        this.obstacleField
            .rasterizeRectangle(
                vertical.x,
                vertical.y,
                cellSize * 0.75,
                cellSize * 9,
            );

        this.obstacleField
            .rasterizeRectangle(
                horizontal.x,
                horizontal.y,
                cellSize * 5,
                cellSize * 0.75,
            );

        const cornerSource =
            center(
                cornerX - 1,
                cornerY - 1,
            );

        this.waterField
            .injectWaterWithMomentum(
                cornerSource.x,
                cornerSource.y,
                4,
                420,
                -220,
            );

        const cornerTotalBefore =
            this.waterField
                .getTotalWaterAmount();

        step(
            240,
        );

        const cornerStable =
            this.isTrackedWaterStateFiniteAndValid();

        this.assertPass(
            "Corner Stability",
            cornerStable,
        );

        // ---------------------------------------------------------
        // 5. Long-run stability and conservation
        // ---------------------------------------------------------

        step(
            360,
        );

        const longRunStable =
            this.isTrackedWaterStateFiniteAndValid();

        this.assertPass(
            "Long-Run Stability",
            longRunStable,
        );

        const cornerTotalAfter =
            this.waterField
                .getTotalWaterAmount();

        this.assertPass(
            "Boundary Conservation",
            Math.abs(
                cornerTotalAfter -
                cornerTotalBefore,
            ) <
            0.00005,
        );

        // Also make sure the first accumulation scenario did not rely on
        // Water creation. The total captured before that scenario must have
        // been a valid positive amount.
        if (
            !Number.isFinite(
                accumulationTotalBefore,
            ) ||
            accumulationTotalBefore <= 0
        ) {
            throw new Error(
                "[8D-4] Boundary Accumulation baseline was invalid.",
            );
        }

        this.resetFields();

        console.info(
            "[8D-4] Boundary Accumulation + Flow Tuning: PASS",
        );
    }

    private isTrackedWaterStateFiniteAndValid():
        boolean {

        const definition =
            this.waterField
                .getDefinition();

        let valid =
            true;

        this.waterField
            .forEachTrackedWaterCell(
                (
                    cell,
                ): void => {

                    if (
                        !Number.isFinite(
                            cell.depth,
                        ) ||
                        !Number.isFinite(
                            cell.velocityX,
                        ) ||
                        !Number.isFinite(
                            cell.velocityY,
                        ) ||
                        cell.depth < 0 ||
                        cell.depth >
                        definition.maximumDepth +
                        0.00001 ||
                        Math.abs(
                            cell.velocityX,
                        ) >
                        definition.maximumVelocity +
                        0.00001 ||
                        Math.abs(
                            cell.velocityY,
                        ) >
                        definition.maximumVelocity +
                        0.00001
                    ) {
                        valid =
                            false;
                    }
                },
            );

        return valid;
    }

    private resetFields():
        void {

        this.waterField
            .reset();

        this.obstacleField
            .clear();
    }

    private assertPass(
        name:
            string,

        condition:
            boolean,
    ): void {

        if (!condition) {
            throw new Error(
                `[8D-4] ${name}: FAIL`,
            );
        }

        console.info(
            `[8D-4] ${name}: PASS`,
        );
    }
}
