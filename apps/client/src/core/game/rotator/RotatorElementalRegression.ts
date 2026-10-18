import { RotatorElementalObstacleSystem } from "./RotatorElementalObstacleSystem";
import type { Rotator } from "../entities/mechanisms/Rotator";

/** Deterministic moving-obstacle geometry checks, no Pixi texture loading. */
export function assertRotatorElementalRegression(): void {
    const system = new RotatorElementalObstacleSystem();
    const fake = (angle: number) => ({
        getCenter: () => ({ x: 0, y: 0 }), getRenderedArmAngle: () => angle,
        getId: () => "test-rotator",
    }) as Rotator;
    system.synchronize([fake(0)]);
    if (!system.blocksSegment(-15, 0, 15, 0)) throw new Error("[R7] Hub obstruction missing");
    if (!system.blocksSegment(75, 75, 90, 90)) throw new Error("[R7] Diagonal arm obstruction missing");
    if (system.blocksSegment(200, 200, 250, 250)) throw new Error("[R7] Distant ray incorrectly blocked");
    system.synchronize([fake(Math.PI / 4)]);
    if (!system.blocksSegment(80, -5, 80, 5)) throw new Error("[R7] Rotated arm obstruction missing");
    system.synchronize([]);
    if (system.blocksSegment(0, 0, 1, 1)) throw new Error("[R7] Stale obstacle geometry");
}
