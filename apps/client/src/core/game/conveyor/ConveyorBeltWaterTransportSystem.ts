import type { WaterField } from "../environment/WaterField";
import type { ConveyorBelt } from "../entities/mechanisms/ConveyorBelt";
import { CONVEYOR_BELT_PHYSICS } from "./ConveyorBeltPhysicsDefinition";

/** CB5: transports authoritative standing-water mass, never airborne particles. */
export class ConveyorBeltWaterTransportSystem {
    public update(deltaTime: number, water: WaterField, belts: readonly ConveyorBelt[]): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0 || belts.length === 0) return;
        const settings = CONVEYOR_BELT_PHYSICS;
        // Snapshot membership: transferred water must not be processed recursively this frame.
        const candidates: number[] = [];
        water.forEachTrackedWaterIndex((index, depth) => {
            if (depth >= settings.waterMinimumDepth) candidates.push(index);
        });
        for (const index of candidates) {
            const center = water.getWorldCenterByIndex(index);
            if (!center) continue;
            for (const belt of belts) {
                if (water.getDepthByIndex(index) < settings.waterMinimumDepth) break;
                const influence = belt.getSurfaceContactWeight(center.x, center.y);
                if (influence <= 0) continue;
                const direction = belt.getTransportDirection();
                const speed = settings.waterTargetDirectionalSpeed * influence;
                water.transportSurfaceWaterByIndex(
                    index,
                    center.x + direction.x * settings.waterTransportDistance,
                    center.y + direction.y * settings.waterTransportDistance,
                    direction.x * speed,
                    direction.y * speed,
                    settings.waterResponsePerSecond,
                    deltaTime,
                    settings.waterMaximumDrivenSpeed,
                    settings.waterTransferFractionPerSecond * influence,
                );
            }
        }
    }
}
