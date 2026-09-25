import type { RotatingPaddle } from "../entities/mechanisms/RotatingPaddle";
import type { WaterField } from "./WaterField";
import type { RotatingPaddleWaterDispersalValidation } from "../debug/RotatingPaddleWaterDispersalValidation";

/**
 * RP-3.5 full-footprint Water transport with edge cleanup.
 *
 * The paddle moves actual standing-Water depth conservatively instead of
 * relying on velocity alone. Tangential transport dominates and an outward
 * component peels Water off the annulus. Momentum is retained so the normal
 * WaterFlowSolver continues the motion after each transfer.
 */
export class RotatingPaddleWaterDispersalSystem {
    public update(
        deltaTime: number,
        waterField: WaterField,
        paddle: RotatingPaddle,
        validation?: RotatingPaddleWaterDispersalValidation,
    ): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;

        const definition = paddle.getDefinition();
        const paddleId = paddle.getId();
        validation?.beginUpdate(paddleId, waterField.getTrackedWaterCellCount());
        const innerRadius = paddle.getCenterStopperRadius();
        const outerRadius = paddle.getSurfaceRadius();
        const waterInteractionRadius =
            outerRadius + definition.waterOuterCaptureMargin + definition.waterEdgeCleanupMargin;
        const innerRadiusSquared = innerRadius * innerRadius;
        const outerRadiusSquared = outerRadius * outerRadius;
        const waterInteractionRadiusSquared = waterInteractionRadius * waterInteractionRadius;

        // Snapshot first: conservative transfers can change sparse membership.
        const candidates: Array<{ index: number; depth: number }> = [];
        waterField.forEachTrackedWaterIndex((index, depth): void => {
            if (depth >= definition.waterMinimumDepth) candidates.push({ index, depth });
        });
        // Only the snapshot above is processed. Water moved into a new cell by this
        // paddle pass cannot recursively become another candidate this same pass.

        for (const candidate of candidates) {
            validation?.recordTested(paddleId);
            const currentDepth = waterField.getDepthByIndex(candidate.index);
            if (currentDepth < definition.waterMinimumDepth) continue;

            const center = waterField.getWorldCenterByIndex(candidate.index);
            if (!center) continue;

            const dx = center.x - paddle.getX();
            const dy = center.y - paddle.getY();
            const distanceSquared = dx * dx + dy * dy;
            if (
                distanceSquared <= innerRadiusSquared ||
                distanceSquared >= waterInteractionRadiusSquared
            ) continue;
            validation?.recordInside(paddleId);
            validation?.recordEligible(paddleId);
            validation?.recordSourceWater(paddleId, currentDepth);

            const distance = Math.sqrt(distanceSquared);
            if (distance <= 0.0001) continue;

            const radialX = dx / distance;
            const radialY = dy / distance;
            const tangent = paddle.getTangentialDirectionAt(center.x, center.y);
            if (!tangent) continue;

            // Tangential motion dominates across the body of the paddle. In the
            // outer band, progressively stronger radial escape prevents a thin
            // stationary fringe from clinging to the circumference.
            const edgeBandStart = Math.max(
                innerRadius,
                outerRadius - definition.waterEdgeBandWidth,
            );
            const edge01 = Math.max(
                0,
                Math.min(
                    1,
                    (distance - edgeBandStart) /
                        Math.max(1, waterInteractionRadius - edgeBandStart),
                ),
            );
            const outwardMultiplier =
                1 +
                edge01 *
                    (definition.waterEdgeOutwardSpeedMultiplier - 1);
            const outwardTargetSpeed =
                definition.waterOutwardTargetSpeed * outwardMultiplier;

            if (edge01 > 0) {
                validation?.recordEdgeBand(paddleId, currentDepth);
            }
            if (distance >= outerRadius) {
                validation?.recordCleanupBandWater(paddleId, currentDepth);
            }

            const targetX =
                tangent.x * definition.waterTangentialTargetSpeed +
                radialX * outwardTargetSpeed;
            const targetY =
                tangent.y * definition.waterTangentialTargetSpeed +
                radialY * outwardTargetSpeed;

            // Keep the authoritative momentum drive from RP-3.1.
            waterField.driveVelocityByIndex(
                candidate.index,
                targetX,
                targetY,
                Math.max(
                    definition.waterTangentialResponsePerSecond,
                    definition.waterOutwardResponsePerSecond,
                ),
                deltaTime,
                definition.waterMaximumDrivenSpeed,
            );

            // Move real Water mass along a tangent-dominant escape direction.
            const directionLength = Math.hypot(targetX, targetY);
            if (directionLength <= 0.0001) continue;
            const directionX = targetX / directionLength;
            const directionY = targetY / directionLength;
            const destinationX = center.x + directionX * definition.waterTransportDistance;
            const destinationY = center.y + directionY * definition.waterTransportDistance;

            // Powered transport must move a visible parcel, not microscopic
            // fractions. The per-second term remains frame-rate aware while the
            // floor guarantees a meaningful response for shallow puddles.
            const timeFraction = 1 - Math.exp(
                -definition.waterTransportFractionPerSecond * deltaTime,
            );
            const minimumFraction = edge01 > 0
                ? Math.max(
                    definition.waterMinimumTransferFraction,
                    definition.waterEdgeMinimumTransferFraction,
                )
                : definition.waterMinimumTransferFraction;
            const fraction = Math.max(
                minimumFraction,
                Math.min(definition.waterMaximumTransferFraction, timeFraction),
            );
            const requestedAmount = Math.min(
                currentDepth,
                Math.max(
                    definition.waterMinimumTransferAmount,
                    currentDepth * fraction,
                ),
            );
            validation?.recordTransferAttempt(paddleId);
            const transferredAmount = waterField.transferWaterByIndexToWorld(
                candidate.index,
                destinationX,
                destinationY,
                requestedAmount,
                targetX,
                targetY,
            );
            validation?.recordTransfer(paddleId, transferredAmount);
            if (edge01 > 0) {
                validation?.recordEdgeTransfer(paddleId, transferredAmount);
            }
            const destinationDx = destinationX - paddle.getX();
            const destinationDy = destinationY - paddle.getY();
            if (
                transferredAmount > 0 &&
                destinationDx * destinationDx + destinationDy * destinationDy >= outerRadiusSquared
            ) {
                validation?.recordTransportedOutside(paddleId, transferredAmount);
            }
        }
    }
}
