import type {
    WaterFieldDefinition,
} from "../config/WaterFieldDefinition";

export interface WaterFlowStepResult {
    readonly movedWaterAmount: number;
    readonly changedCellCount: number;
    readonly processedCellCount: number;
}

/**
 * Phase 8A-5 sparse four-neighbour shallow-water solver.
 *
 * Persistent Water state still belongs to WaterField. This solver owns only
 * reusable numeric scratch buffers. It receives a sparse list of active and
 * boundary-candidate cells and never scans the complete world grid.
 */
export class WaterFlowSolver {
    private readonly depthDelta: Float32Array;
    private readonly momentumXDelta: Float32Array;
    private readonly momentumYDelta: Float32Array;

    /** Scratch cells touched by transfers in the previous/current step. */
    private readonly touchedFlags: Uint8Array;
    private readonly touchedIndices: number[] = [];

    constructor(
        private readonly columnCount: number,
        private readonly rowCount: number,
        private readonly definition: WaterFieldDefinition,
    ) {
        const cellCount = columnCount * rowCount;
        this.depthDelta = new Float32Array(cellCount);
        this.momentumXDelta = new Float32Array(cellCount);
        this.momentumYDelta = new Float32Array(cellCount);
        this.touchedFlags = new Uint8Array(cellCount);
    }

    public step(
        depth: Float32Array,
        velocityX: Float32Array,
        velocityY: Float32Array,
        activeIndices: readonly number[],
        deltaTime: number,
    ): WaterFlowStepResult {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0 || activeIndices.length === 0) {
            return {
                movedWaterAmount: 0,
                changedCellCount: 0,
                processedCellCount: 0,
            };
        }

        const expectedCellCount = this.columnCount * this.rowCount;
        if (
            depth.length !== expectedCellCount ||
            velocityX.length !== expectedCellCount ||
            velocityY.length !== expectedCellCount
        ) {
            throw new Error(
                "WaterFlowSolver state buffers do not match its grid dimensions.",
            );
        }

        this.clearTouchedScratch();

        this.applyPressureAndDamping(
            depth,
            velocityX,
            velocityY,
            activeIndices,
            deltaTime,
        );

        const equalizationResponse = Math.min(
            1,
            this.definition.depthEqualizationRate * deltaTime,
        );

        let movedWaterAmount = 0;

        for (const index of activeIndices) {
            if (index < 0 || index >= expectedCellCount) {
                continue;
            }

            const gridX = index % this.columnCount;
            const gridY = Math.floor(index / this.columnCount);

            if (gridX + 1 < this.columnCount) {
                movedWaterAmount += this.accumulateEdgeTransfer(
                    depth,
                    velocityX,
                    velocityY,
                    index,
                    index + 1,
                    1,
                    0,
                    equalizationResponse,
                    deltaTime,
                );
            }

            if (gridY + 1 < this.rowCount) {
                movedWaterAmount += this.accumulateEdgeTransfer(
                    depth,
                    velocityX,
                    velocityY,
                    index,
                    index + this.columnCount,
                    0,
                    1,
                    equalizationResponse,
                    deltaTime,
                );
            }
        }

        let changedCellCount = 0;

        for (const index of this.touchedIndices) {
            const oldDepth = depth[index];
            const depthChange = this.depthDelta[index];
            const nextDepth = Math.max(0, oldDepth + depthChange);

            if (depthChange !== 0) {
                changedCellCount += 1;
            }

            if (nextDepth <= 0) {
                depth[index] = 0;
                velocityX[index] = 0;
                velocityY[index] = 0;
                continue;
            }

            const oldMomentumX = oldDepth * velocityX[index];
            const oldMomentumY = oldDepth * velocityY[index];
            const nextMomentumX = oldMomentumX + this.momentumXDelta[index];
            const nextMomentumY = oldMomentumY + this.momentumYDelta[index];

            depth[index] = nextDepth;
            velocityX[index] = this.clampVelocityComponent(nextMomentumX / nextDepth);
            velocityY[index] = this.clampVelocityComponent(nextMomentumY / nextDepth);

            const minimumVelocity = this.definition.minimumVelocity;
            const speedSquared =
                velocityX[index] * velocityX[index] +
                velocityY[index] * velocityY[index];

            if (speedSquared < minimumVelocity * minimumVelocity) {
                velocityX[index] = 0;
                velocityY[index] = 0;
            }
        }

        return {
            movedWaterAmount,
            changedCellCount,
            processedCellCount: activeIndices.length,
        };
    }

    private applyPressureAndDamping(
        depth: Float32Array,
        velocityX: Float32Array,
        velocityY: Float32Array,
        activeIndices: readonly number[],
        deltaTime: number,
    ): void {
        const dampingFactor = Math.exp(
            -this.definition.velocityDamping * deltaTime,
        );

        const pressureScale =
            this.definition.pressureAcceleration *
            deltaTime /
            this.definition.cellSize;

        for (const index of activeIndices) {
            if (depth[index] <= 0) {
                velocityX[index] = 0;
                velocityY[index] = 0;
                continue;
            }

            const gridX = index % this.columnCount;
            const gridY = Math.floor(index / this.columnCount);
            const centerDepth = depth[index];

            const westDepth = gridX > 0 ? depth[index - 1] : centerDepth;
            const eastDepth = gridX + 1 < this.columnCount ? depth[index + 1] : centerDepth;
            const northDepth = gridY > 0 ? depth[index - this.columnCount] : centerDepth;
            const southDepth = gridY + 1 < this.rowCount ? depth[index + this.columnCount] : centerDepth;

            const gradientX = (eastDepth - westDepth) * 0.5;
            const gradientY = (southDepth - northDepth) * 0.5;

            velocityX[index] = this.clampVelocityComponent(
                (velocityX[index] - gradientX * pressureScale) * dampingFactor,
            );

            velocityY[index] = this.clampVelocityComponent(
                (velocityY[index] - gradientY * pressureScale) * dampingFactor,
            );
        }
    }

    private accumulateEdgeTransfer(
        depth: Float32Array,
        velocityX: Float32Array,
        velocityY: Float32Array,
        firstIndex: number,
        secondIndex: number,
        directionX: number,
        directionY: number,
        equalizationResponse: number,
        deltaTime: number,
    ): number {
        const firstDepth = depth[firstIndex];
        const secondDepth = depth[secondIndex];
        const difference = firstDepth - secondDepth;

        let sourceIndex: number;
        let destinationIndex: number;
        let travelDirectionX: number;
        let travelDirectionY: number;

        if (Math.abs(difference) > this.definition.minimumDepthDifference) {
            if (difference > 0) {
                sourceIndex = firstIndex;
                destinationIndex = secondIndex;
                travelDirectionX = directionX;
                travelDirectionY = directionY;
            } else {
                sourceIndex = secondIndex;
                destinationIndex = firstIndex;
                travelDirectionX = -directionX;
                travelDirectionY = -directionY;
            }
        } else {
            const firstProjectedVelocity =
                velocityX[firstIndex] * directionX +
                velocityY[firstIndex] * directionY;

            const secondProjectedVelocity = -(
                velocityX[secondIndex] * directionX +
                velocityY[secondIndex] * directionY
            );

            if (firstProjectedVelocity <= 0 && secondProjectedVelocity <= 0) {
                return 0;
            }

            if (firstProjectedVelocity >= secondProjectedVelocity) {
                sourceIndex = firstIndex;
                destinationIndex = secondIndex;
                travelDirectionX = directionX;
                travelDirectionY = directionY;
            } else {
                sourceIndex = secondIndex;
                destinationIndex = firstIndex;
                travelDirectionX = -directionX;
                travelDirectionY = -directionY;
            }
        }

        const sourceDepth = depth[sourceIndex];
        if (sourceDepth <= 0) {
            return 0;
        }

        const equalizationTransfer =
            Math.abs(difference) * 0.5 * equalizationResponse;

        const projectedVelocity = Math.max(
            0,
            velocityX[sourceIndex] * travelDirectionX +
            velocityY[sourceIndex] * travelDirectionY,
        );

        const advectiveFraction = Math.min(
            this.definition.maximumTransferFractionPerNeighbor,
            (
                projectedVelocity *
                deltaTime /
                this.definition.cellSize
            ) * this.definition.momentumAdvectionStrength,
        );

        const advectiveTransfer = sourceDepth * advectiveFraction;
        const perNeighborLimit =
            sourceDepth * this.definition.maximumTransferFractionPerNeighbor;

        const transfer = Math.min(
            perNeighborLimit,
            Math.max(equalizationTransfer, advectiveTransfer),
        );

        if (transfer <= 0) {
            return 0;
        }

        this.touchIndex(sourceIndex);
        this.touchIndex(destinationIndex);

        this.depthDelta[sourceIndex] -= transfer;
        this.depthDelta[destinationIndex] += transfer;

        const carriedMomentumX = transfer * velocityX[sourceIndex];
        const carriedMomentumY = transfer * velocityY[sourceIndex];

        this.momentumXDelta[sourceIndex] -= carriedMomentumX;
        this.momentumYDelta[sourceIndex] -= carriedMomentumY;
        this.momentumXDelta[destinationIndex] += carriedMomentumX;
        this.momentumYDelta[destinationIndex] += carriedMomentumY;

        return transfer;
    }

    private touchIndex(index: number): void {
        if (this.touchedFlags[index] !== 0) {
            return;
        }

        this.touchedFlags[index] = 1;
        this.touchedIndices.push(index);
    }

    private clearTouchedScratch(): void {
        for (const index of this.touchedIndices) {
            this.depthDelta[index] = 0;
            this.momentumXDelta[index] = 0;
            this.momentumYDelta[index] = 0;
            this.touchedFlags[index] = 0;
        }

        this.touchedIndices.length = 0;
    }

    private clampVelocityComponent(value: number): number {
        const maximumVelocity = this.definition.maximumVelocity;
        return Math.max(-maximumVelocity, Math.min(value, maximumVelocity));
    }
}
