import {
    AirborneWaterSystem,
} from "../environment/AirborneWaterSystem";

import type {
    AirborneWaterCollisionField,
} from "../environment/AirborneWaterCollisionField";

import type {
    WaterField,
} from "../environment/WaterField";

import type {
    WaterEmissionRequest,
} from "../environment/WaterSourceSystem";

import type {
    WaterObstacleField,
} from "../environment/WaterObstacleField";

import {
    WaterSourceType,
} from "../config/WaterSourceDefinition";

/**
 * Phase 8D-6 deterministic acceptance checks for obstacle impact deposition.
 */
export class AirborneWaterImpactDepositionValidation {
    public constructor(
        private readonly waterField: WaterField,
        private readonly obstacleField: WaterObstacleField,
        private readonly collisionField: AirborneWaterCollisionField,
    ) { }

    public run(): void {
        const cellSize =
            this.waterField
                .getDefinition()
                .cellSize;

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

        const stepSystem = (
            system: AirborneWaterSystem,
            steps: number,
        ): void => {
            for (
                let index = 0;
                index < steps;
                index += 1
            ) {
                system.update(
                    1 / 60,
                );
            }
        };

        const makeRequest = (
            sourceId: string,
            positionX: number,
            positionY: number,
            directionRadians: number,
            waterAmount: number,
        ): WaterEmissionRequest => ({
            sourceId,
            sourceType: WaterSourceType.DirectionalJet,
            sequence: 1,
            positionX,
            positionY,
            directionRadians,
            launchSpeed: 900,
            launchElevationRadians: 25 * Math.PI / 180,
            waterAmount,
            windResponse: 0,
            impactMomentumRetention: 0.9,
        });

        // -------------------------------------------------
        // Rectangle impact deposition
        // -------------------------------------------------

        this.resetFields();

        const rectangleCenter =
            center(
                50,
                40,
            );

        this.obstacleField
            .rasterizeRectangle(
                rectangleCenter.x,
                rectangleCenter.y,
                cellSize * 2,
                cellSize * 6,
            );

        this.collisionField
            .addRectangle(
                rectangleCenter.x,
                rectangleCenter.y,
                cellSize * 2,
                cellSize * 6,
            );

        const rectangleSystem =
            new AirborneWaterSystem(
                this.waterField,
                undefined,
                null,
                null,
                this.collisionField,
            );

        const rectangleSource =
            center(
                44,
                40,
            );

        rectangleSystem
            .consumeEmissionRequests([
                makeRequest(
                    "8d6-rectangle",
                    rectangleSource.x,
                    rectangleSource.y,
                    0,
                    0.4,
                ),
            ]);

        stepSystem(
            rectangleSystem,
            20,
        );

        const rectangleCollisionCount =
            rectangleSystem
                .getTotalStaticCollisionCount();

        const rectangleRequestedAmount =
            rectangleSystem
                .getTotalRequestedWaterAmount();

        const rectangleDepositedAmount =
            rectangleSystem
                .getTotalDepositedWaterAmount();

        const rectangleRejectedAmount =
            rectangleSystem
                .getTotalRejectedWaterAmount();

        const rectangleStandingWater =
            this.waterField
                .getTotalWaterAmount();

        console.info(
            "[8D-6 Diagnostic] Rectangle Impact",
            {
                collisionCount:
                    rectangleCollisionCount,
                requestedAmount:
                    rectangleRequestedAmount,
                depositedAmount:
                    rectangleDepositedAmount,
                rejectedAmount:
                    rectangleRejectedAmount,
                standingWater:
                    rectangleStandingWater,
                activePackets:
                    rectangleSystem
                        .getActivePacketCount(),
                source:
                    rectangleSource,
                obstacleCenter:
                    rectangleCenter,
                obstacleWidth:
                    cellSize * 2,
                obstacleHeight:
                    cellSize * 6,
            },
        );

        this.assertPass(
            "Rectangle Impact Deposition",
            rectangleCollisionCount ===
            1 &&
            rectangleDepositedAmount >
            0,
        );

        const rectangleDepositIsOutside =
            this.hasTrackedWaterOutsideObstacle();

        this.assertPass(
            "Deposit Outside Solid",
            rectangleDepositIsOutside,
        );

        const rectangleConservationError =
            Math.abs(
                rectangleSystem
                    .getTotalRequestedWaterAmount() -
                (
                    rectangleSystem
                        .getTotalDepositedWaterAmount() +
                    rectangleSystem
                        .getTotalRejectedWaterAmount()
                ),
            );

        this.assertPass(
            "Impact Water Conservation",
            rectangleConservationError <
            0.000001,
        );

        // -------------------------------------------------
        // Circle impact deposition
        // -------------------------------------------------

        this.resetFields();

        const circleCenter =
            center(
                70,
                40,
            );

        this.obstacleField
            .rasterizeCircle(
                circleCenter.x,
                circleCenter.y,
                cellSize * 2,
            );

        this.collisionField
            .addCircle(
                circleCenter.x,
                circleCenter.y,
                cellSize * 2,
            );

        const circleSystem =
            new AirborneWaterSystem(
                this.waterField,
                undefined,
                null,
                null,
                this.collisionField,
            );

        const circleSource =
            center(
                64,
                40,
            );

        circleSystem
            .consumeEmissionRequests([
                makeRequest(
                    "8d6-circle",
                    circleSource.x,
                    circleSource.y,
                    0,
                    0.4,
                ),
            ]);

        stepSystem(
            circleSystem,
            20,
        );

        this.assertPass(
            "Circle Impact Deposition",
            circleSystem
                .getTotalStaticCollisionCount() ===
            1 &&
            circleSystem
                .getTotalDepositedWaterAmount() >
            0,
        );

        // -------------------------------------------------
        // Repeated jet accumulation
        // -------------------------------------------------

        this.resetFields();

        const wallCenter =
            center(
                90,
                60,
            );

        this.obstacleField
            .rasterizeRectangle(
                wallCenter.x,
                wallCenter.y,
                cellSize,
                cellSize * 10,
            );

        this.collisionField
            .addRectangle(
                wallCenter.x,
                wallCenter.y,
                cellSize,
                cellSize * 10,
            );

        const jetSystem =
            new AirborneWaterSystem(
                this.waterField,
                undefined,
                null,
                null,
                this.collisionField,
            );

        const jetSource =
            center(
                84,
                60,
            );

        const requests:
            WaterEmissionRequest[] = [];

        for (
            let index = 0;
            index < 8;
            index += 1
        ) {
            requests.push({
                ...makeRequest(
                    "8d6-jet",
                    jetSource.x,
                    jetSource.y,
                    Math.PI / 12,
                    0.2,
                ),
                sequence:
                    index + 1,
            });
        }

        jetSystem
            .consumeEmissionRequests(
                requests,
            );

        stepSystem(
            jetSystem,
            30,
        );

        this.assertPass(
            "Repeated Jet Accumulation",
            jetSystem
                .getTotalStaticCollisionCount() ===
            requests.length &&
            this.waterField
                .getTotalWaterAmount() >
            1,
        );

        const wallIndex =
            60 *
            this.waterField
                .getColumnCount() +
            90;

        const wallCell =
            this.waterField
                .getCell(
                    90,
                    60,
                );

        this.assertPass(
            "Boundary Redistribution",
            wallCell === null ||
            wallCell.depth <=
            this.waterField
                .getDefinition()
                .activeDepthThreshold,
        );

        const tangentialMomentumPresent =
            this.hasTangentialMomentum();

        this.assertPass(
            "Tangential Momentum Retention",
            tangentialMomentumPresent,
        );

        void wallIndex;

        this.resetFields();

        console.info(
            "[8D-6] Jet Obstruction + Impact Deposition: PASS",
        );
    }

    private hasTrackedWaterOutsideObstacle():
        boolean {
        let foundWater = false;
        let foundBlockedWater = false;

        this.waterField
            .forEachTrackedWaterCell(
                (cell): void => {
                    if (
                        cell.depth <=
                        this.waterField
                            .getDefinition()
                            .activeDepthThreshold
                    ) {
                        return;
                    }

                    foundWater = true;

                    if (
                        this.obstacleField
                            .isBlocked(
                                cell.gridX,
                                cell.gridY,
                            )
                    ) {
                        foundBlockedWater =
                            true;
                    }
                },
            );

        return (
            foundWater &&
            !foundBlockedWater
        );
    }

    private hasTangentialMomentum():
        boolean {
        let found = false;

        this.waterField
            .forEachTrackedWaterCell(
                (cell): void => {
                    if (
                        Math.abs(
                            cell.velocityY,
                        ) >
                        0.01
                    ) {
                        found = true;
                    }
                },
            );

        return found;
    }

    private resetFields(): void {
        this.waterField.reset();
        this.obstacleField.clear();
        this.collisionField.clear();
    }

    private assertPass(
        name: string,
        condition: boolean,
    ): void {
        if (!condition) {
            throw new Error(
                `[8D-6] ${name}: FAIL`,
            );
        }

        console.info(
            `[8D-6] ${name}: PASS`,
        );
    }
}
