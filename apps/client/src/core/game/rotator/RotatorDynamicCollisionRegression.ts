import { ROTATOR_DEFINITION } from "../config/RotatorDefinition";
/** Startup contract for R4's finite, nondegenerate kinematic contact geometry. */
export function assertRotatorDynamicCollisionRegression(): void {
    const d = ROTATOR_DEFINITION;
    if (!(d.armOuterRadius > d.armInnerRadius && d.armWidth > 0 && d.armCapHalfWidth > d.armCapHalfThickness && d.hubDiameter > 0)) {
        throw new Error("[R4] Invalid rotating dynamic collision geometry");
    }
}
