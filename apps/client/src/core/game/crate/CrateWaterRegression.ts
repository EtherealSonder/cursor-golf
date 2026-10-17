import { Crate } from "./Crate";
import { applyCrateJetImpulse } from "./CrateWaterInteractionController";
import type { RuntimeObjectOfType } from "../level/LevelRuntimeDefinition";

/** C4: center and off-center jet contacts must have different angular outcomes. */
export function runCrateWaterRegression(): void {
    const make = (): Crate => new Crate({ id: "water-test", type: "crate", x: 100, y: 100 } as RuntimeObjectOfType<"crate">);
    const centered = make(), offset = make();
    applyCrateJetImpulse(centered, 20, 0, 20, 100);
    applyCrateJetImpulse(offset, 20, 0, 20, 120);
    if (centered.getVelocityX() <= 0 || offset.getVelocityX() <= 0) throw new Error("C4: jet must push crate");
    if (Math.abs(offset.getAngularVelocity()) <= Math.abs(centered.getAngularVelocity())) throw new Error("C4: off-center jet must rotate crate");
    centered.destroy(); offset.destroy();
}
