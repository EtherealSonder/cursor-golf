import { CONVEYOR_BELT_ANIMATION, conveyorPlatformPitch, conveyorPlatformX } from "./ConveyorBeltAnimationDefinition";
import { CONVEYOR_CARDINAL_ROTATIONS } from "../config/ConveyorBeltDefinition";

export function runConveyorBeltAnimationRegression(): boolean {
    const a = CONVEYOR_BELT_ANIMATION;
    if (a.platformWidth !== 61 || a.platformHeight !== 60 || a.gap !== 11 || a.poolSize !== 5) return false;
    if (a.maskWidth > 200 || a.maskHeight > 89 || a.maskWidth <= 0 || a.maskHeight <= 0) return false;
    if (conveyorPlatformPitch() !== 72 || CONVEYOR_CARDINAL_ROTATIONS.length !== 4) return false;
    const cycle = a.poolSize * conveyorPlatformPitch() / a.speed;
    for (let i = 0; i < a.poolSize; i++) {
        if (Math.abs(conveyorPlatformX(i, 0) - conveyorPlatformX(i, cycle)) > 1e-6) return false;
        if (Math.abs(conveyorPlatformX(i, 0.25) - conveyorPlatformX(i, cycle + 0.25)) > 1e-6) return false;
    }
    // A five-sprite pool spans more than the visible region plus two sprite widths.
    return a.poolSize * conveyorPlatformPitch() >= a.maskWidth + 2 * a.platformWidth;
}
export function assertConveyorBeltAnimationRegression(): void {
    if (!runConveyorBeltAnimationRegression()) throw new Error("CB2 conveyor animation regression failed");
}
