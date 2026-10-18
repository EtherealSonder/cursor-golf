import { ROTATOR_DEFINITION as D } from "../config/RotatorDefinition";
import type { FixedCollisionShape } from "../physics/DynamicCollidableCollision";
import type { Rotator } from "../entities/mechanisms/Rotator";

/** Kinematic shaft and transverse tip rectangles plus the stationary hub. */
export function rotatorDynamicShapes(rotator: Rotator): FixedCollisionShape[] {
    const center = rotator.getCenter();
    const angle = rotator.getRenderedArmAngle();
    const material = { restitution: D.restitution, friction: 0.45 };
    const shapes: FixedCollisionShape[] = [{
        id: `${rotator.getId()}-hub`, shape: "circle", positionX: center.x, positionY: center.y,
        radius: D.hubDiameter / 2, material,
    }];
    for (let i = 0; i < 4; i++) {
        const a = angle + Math.PI / 4 + i * Math.PI / 2;
        const ux = Math.cos(a), uy = Math.sin(a);
        const mid = (D.armInnerRadius + D.armOuterRadius) / 2;
        shapes.push({ id: `${rotator.getId()}-shaft-${i}`, shape: "rectangle",
            positionX: center.x + ux * mid, positionY: center.y + uy * mid,
            rotationRadians: a, width: D.armOuterRadius - D.armInnerRadius + 2 * D.armTipSafetyMargin,
            height: D.armWidth + 2 * D.armTipSafetyMargin, material });
        shapes.push({ id: `${rotator.getId()}-cap-${i}`, shape: "rectangle",
            positionX: center.x + ux * D.armOuterRadius, positionY: center.y + uy * D.armOuterRadius,
            rotationRadians: a, width: 2 * (D.armCapHalfThickness + D.armTipSafetyMargin),
            height: 2 * (D.armCapHalfWidth + D.armTipSafetyMargin), material });
    }
    return shapes;
}
