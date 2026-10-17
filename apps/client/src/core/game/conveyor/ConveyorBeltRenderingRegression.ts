import { CONVEYOR_BELT_RENDERING, conveyorOccludesGroundPoint } from "./ConveyorBeltRenderingDefinition";
/** CB6: geometry and presentation contract checks, independent of Pixi renderer. */
export function assertConveyorBeltRenderingRegression(): void {
    if (CONVEYOR_BELT_RENDERING.flammable || CONVEYOR_BELT_RENDERING.windAffected) throw new Error("CB6: conveyor must remain inert");
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
        if (!conveyorOccludesGroundPoint(0, 0, 0, 0, angle, 182, 62)) throw new Error("CB6: center occlusion failed");
        if (conveyorOccludesGroundPoint(400, 400, 0, 0, angle, 182, 62)) throw new Error("CB6: occlusion escaped bounds");
    }
}
