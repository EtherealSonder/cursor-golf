import { ROTATOR_DEFINITION as D } from "../config/RotatorDefinition";
import { rotatorMineContact } from "./RotatorEnvironmentInteractionSystem";
import type { Rotator } from "../entities/mechanisms/Rotator";

/** Checks collision primitives without requiring Pixi texture initialization. */
export function assertRotatorEnvironmentRegression(): void {
    const fake = {
        getId: () => "r6-regression", getCenter: () => ({ x: 0, y: 0 }),
        getRenderedArmAngle: () => 0,
    } as unknown as Rotator;
    if (!rotatorMineContact(fake, 0, 0, 4)) throw new Error("[R6] Hub contact missing");
    if (!rotatorMineContact(fake, D.armOuterRadius / Math.SQRT2, D.armOuterRadius / Math.SQRT2, 4)) throw new Error("[R6] Arm-tip contact missing");
    if (rotatorMineContact(fake, D.diameter * 2, 0, 4)) throw new Error("[R6] Distant mine false positive");
}
