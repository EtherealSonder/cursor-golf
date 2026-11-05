import { CRATE_REWARD_DEBUG, CRATE_REWARD_LABELS } from "../config/CrateRewardDefinition";
import { rollCrateReward } from "./CrateRewardRoller";
import type { CrateDestructionRewardEvent, CrateRewardResult } from "./CrateRewardEvent";
import type { BallDeathController } from "../death/BallDeathController";
import type { BallEffectController } from "../ball-effects/BallEffectController";
export class CrateRewardController {
  private readonly awarded = new Set<string>();
  constructor(private readonly lives: BallDeathController, private readonly effects: BallEffectController) {}
  public award(event: CrateDestructionRewardEvent): { result: CrateRewardResult; lines: string[] } | null {
    if (this.awarded.has(event.crateId)) return null;
    this.awarded.add(event.crateId);
    const before = this.lives.getSnapshot().currentLives;
    if (before < 1) return null;
    const result = rollCrateReward(before);
    const previous = this.effects.getSnapshot().active;
    const actual = result.kind === "extraLives" ? this.lives.grantLives(result.grantedLives) : 0;
    this.effects.apply(result.effect);
    const lines = result.kind === "extraLives"
      ? [`+${actual} ${actual === 1 ? "ball" : "balls"}`, ...(result.debuff ? [CRATE_REWARD_LABELS[result.debuff]] : [])]
      : [CRATE_REWARD_LABELS[result.kind]];
    if (CRATE_REWARD_DEBUG) {
      console.groupCollapsed(`[CRATE REWARD] ${event.crateId}: ${lines.join(" / ")}`);
      console.log("Lives before:", before, "Lives after:", this.lives.getSnapshot().currentLives);
      for (const roll of result.rolls) console.log(roll.name, { random: roll.random, weights: roll.weights, selected: roll.selected });
      console.log("Life amount rolled:", result.rawLifeAmount, "Actual grant:", actual);
      console.log("Previous effect:", previous, "New effect:", result.effect);
      console.groupEnd();
    }
    return { result, lines };
  }
}
