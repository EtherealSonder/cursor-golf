import { CONVEYOR_BELT_PHYSICS as p } from "./ConveyorBeltPhysicsDefinition";
/** Configuration invariants for the CB5 conservative water-transport bridge. */
export function assertConveyorBeltWaterRegression(): void {
    for (const n of [p.waterTargetDirectionalSpeed, p.waterResponsePerSecond,
        p.waterMaximumDrivenSpeed, p.waterTransferFractionPerSecond,
        p.waterTransportDistance, p.waterMinimumDepth]) {
        if (!Number.isFinite(n) || n <= 0) throw new Error("CB5 water settings must be finite and positive");
    }
    if (p.waterTransportDistance > 40) throw new Error("CB5 transport step is too large");
}
