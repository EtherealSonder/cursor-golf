import { CRATE_DEFINITION } from "./CrateDefinition";
import type { RuntimeObjectOfType } from "../level/LevelRuntimeDefinition";
import { Crate } from "./Crate";
import { runCrateDestructionRegression } from "./CrateDestructionRegression";
import { runCrateImpactRegression } from "./CrateImpactRegression";

/** C1 pure regression; no renderer or physics engine required. */
export function runCrateFoundationRegression(): boolean {
    const placement = { id: "crate-1", type: "crate", x: 120, y: 340 } as RuntimeObjectOfType<"crate">;
    const crate = new Crate(placement);
    const valid = CRATE_DEFINITION.size === 68 && CRATE_DEFINITION.sourceWidth === 995
        && CRATE_DEFINITION.sourceHeight === 928 && crate.id === placement.id
        && crate.x === 120 && crate.y === 340 && !crate.isDestroyed && !crate.hasSprite;
    crate.destroy();
    crate.destroy();
    return valid && crate.isDestroyed && !crate.hasSprite && runCrateDestructionRegression() && runCrateImpactRegression();
}
