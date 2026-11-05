import { CRATE_REWARDS } from "../config/CrateRewardDefinition";
import type { CrateRewardResult } from "./CrateRewardEvent";
import type { BallEffectSelection } from "../ball-effects/BallEffectDefinition";
function weighted(weights: Record<string, number>, name: string, rolls: CrateRewardResult["rolls"] extends ReadonlyArray<infer T> ? T[] : never, random: () => number): string {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total <= 0) throw new Error(`Invalid crate weights: ${name}`);
  const sample = Math.max(0, Math.min(0.999999999999, random()));
  let cursor = sample * total;
  let selected = Object.keys(weights).at(-1)!;
  for (const [key, weight] of Object.entries(weights)) { cursor -= weight; if (cursor < 0) { selected = key; break; } }
  rolls.push({ name, random: sample, weights: { ...weights }, selected });
  return selected;
}
export function rollCrateReward(lives: number, random: () => number = Math.random): CrateRewardResult {
  const count = Math.max(1, Math.min(5, Math.trunc(lives))) as 1|2|3|4|5;
  const rolls: Array<{ name: string; random: number; weights: Record<string, number>; selected: string }> = [];
  const kind = weighted(CRATE_REWARDS.primaryRewardByLives[count], "primary", rolls, random) as CrateRewardResult["kind"];
  let rawLifeAmount = 0, grantedLives = 0;
  let debuff: CrateRewardResult["debuff"] = null;
  let effect: BallEffectSelection = "none";
  if (kind === "extraLives") {
    const amountWeights = CRATE_REWARDS.extraLivesAmountByLives[count as 1|2|3|4];
    const selected = weighted(amountWeights, "lifeAmount", rolls, random);
    rawLifeAmount = Number(selected.replace("plus", ""));
    grantedLives = Math.min(rawLifeAmount, CRATE_REWARDS.maxLives - count);
    const activation = Math.max(0, Math.min(0.999999999999, random()));
    rolls.push({ name: "debuffActivation", random: activation, weights: { activate: 80, none: 20 }, selected: activation < CRATE_REWARDS.extraLivesDebuff.activationChance ? "activate" : "none" });
    if (activation < CRATE_REWARDS.extraLivesDebuff.activationChance) {
      debuff = weighted(CRATE_REWARDS.extraLivesDebuff.weights, "debuff", rolls, random) as CrateRewardResult["debuff"];
      effect = ({ aimSwing: "aim-swing", stickyBall: "sticky", heavierBall: "heavy" } as const)[debuff!];
    }
  } else effect = ({ highPower: "high-power", invincible: "invincible", ghost: "ghost" } as const)[kind];
  return { kind, livesBefore: count, rawLifeAmount, grantedLives, debuff, effect, rolls };
}
