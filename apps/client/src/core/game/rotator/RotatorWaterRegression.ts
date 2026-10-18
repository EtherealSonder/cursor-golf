import { ROTATOR_DEFINITION } from "../config/RotatorDefinition";
import { AirborneWaterCollisionField } from "../environment/AirborneWaterCollisionField";
import { AirborneWaterCollisionResponse } from "../environment/AirborneWaterCollisionResponse";
/** Deterministic R5 geometry and moving-surface contract checks. */
export function assertRotatorWaterRegression(): void {
    const field = new AirborneWaterCollisionField();
    field.addShape({kind:"orientedRectangle", colliderId:"test-arm", centerX:60, centerY:0,
        width:ROTATOR_DEFINITION.armOuterRadius-ROTATOR_DEFINITION.armInnerRadius,
        height:ROTATOR_DEFINITION.armWidth, rotationRadians:0});
    const hit = field.sweep(60,-50,60,50);
    if (!hit || hit.colliderId !== "test-arm") throw new Error("[R5] Arm jet obstruction missing");
    const hub = new AirborneWaterCollisionField();
    hub.addCircle(0,0,ROTATOR_DEFINITION.hubDiameter/2,"hub");
    if (hub.sweep(-80,0,80,0)?.colliderId !== "hub") throw new Error("[R5] Hub obstruction missing");
    const response = new AirborneWaterCollisionResponse();
    response.registerReflector("test-arm", {speedRetention:1, separationDistance:2,
        minimumOutgoingSpeed:0, getSurfaceVelocity:()=>({x:25,y:0})});
    if (!response.hasReflector("test-arm")) throw new Error("[R5] Moving-surface reflector missing");
}
