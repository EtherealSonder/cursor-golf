import type { Rotator } from "../entities/mechanisms/Rotator";
import { rotatorDynamicShapes } from "./RotatorDynamicCollisionGeometry";
import type { AirborneWaterCollisionField } from "../environment/AirborneWaterCollisionField";
import type { WaterObstacleField } from "../environment/WaterObstacleField";
import type { WaterField } from "../environment/WaterField";
import type { AirborneWaterCollisionResponse } from "../environment/AirborneWaterCollisionResponse";
import type { WaterVfxSystem } from "../water-vfx/WaterVfxSystem";

/** R5 bridge: shares the R4 shaft, cap and hub footprints with both Water collision caches. */
export class RotatorWaterInteractionSystem {
    private readonly registered = new Set<string>();
    private readonly impactCooldown = new Map<string, number>();
    private displacementAccumulator = 0;
    /** Conserved, sparse local transfer: no second fluid simulation or full-grid scan. */
    public displaceGroundWater(rotators: readonly Rotator[], water: WaterField, dt: number): void {
        this.displacementAccumulator += Math.min(0.1, Math.max(0, dt));
        if (this.displacementAccumulator < 0.06) return;
        const step = Math.min(0.12, this.displacementAccumulator);
        this.displacementAccumulator = 0;
        for (const rotator of rotators) {
            const center = rotator.getCenter();
            const omega = rotator.getAngularVelocity();
            for (let arm = 0; arm < 4; arm++) {
                const angle = rotator.getRenderedArmAngle() + Math.PI / 4 + arm * Math.PI / 2;
                const ux = Math.cos(angle), uy = Math.sin(angle);
                const tx = -uy * Math.sign(omega), ty = ux * Math.sign(omega);
                for (const radius of [48, 70, 93]) {
                    const sourceX = center.x + ux * radius + tx * 8;
                    const sourceY = center.y + uy * radius + ty * 8;
                    const index = water.getGridIndexAtWorldPosition(sourceX, sourceY);
                    if (index === null || water.getDepthByIndex(index) <= 0) continue;
                    const speed = Math.min(130, Math.abs(omega) * radius);
                    water.transportSurfaceWaterByIndex(index,
                        sourceX + tx * 20, sourceY + ty * 20,
                        tx * speed, ty * speed, 9, step, 180, 5);
                }
            }
        }
    }
    public synchronize(rotators: readonly Rotator[], airborne: AirborneWaterCollisionField,
        ground: WaterObstacleField, response: AirborneWaterCollisionResponse, vfx: WaterVfxSystem | null): void {
        for (const rotator of rotators) {
            const center = rotator.getCenter();
            for (const shape of rotatorDynamicShapes(rotator)) {
                const id = shape.id;
                if (shape.shape === "circle") {
                    airborne.addCircle(shape.positionX, shape.positionY, shape.radius, id);
                    ground.rasterizeCircle(shape.positionX, shape.positionY, shape.radius);
                } else {
                    airborne.addShape({ kind: "orientedRectangle", colliderId: id,
                        centerX: shape.positionX, centerY: shape.positionY,
                        width: shape.width, height: shape.height, rotationRadians: shape.rotationRadians });
                    ground.rasterizeShape({ kind: "orientedRectangle", centerX: shape.positionX,
                        centerY: shape.positionY, width: shape.width, height: shape.height,
                        rotationRadians: shape.rotationRadians });
                }
                if (!this.registered.has(id)) {
                    const isHub = shape.shape === "circle";
                    response.registerReflector(id, {
                        speedRetention: 0.65, minimumOutgoingSpeed: 12, separationDistance: 2.5,
                        getSurfaceVelocity: (x, y) => isHub ? { x: 0, y: 0 } : {
                            x: -rotator.getAngularVelocity() * (y - center.y),
                            y: rotator.getAngularVelocity() * (x - center.x),
                        },
                        onImpact: (x, y, vx, vy) => {
                            const now = performance.now();
                            if (now - (this.impactCooldown.get(id) ?? -1000) < 65) return;
                            this.impactCooldown.set(id, now);
                            vfx?.emitRotatorContactSplash(x, y, vx, vy);
                        },
                    });
                    this.registered.add(id);
                }
            }
        }
    }
}
