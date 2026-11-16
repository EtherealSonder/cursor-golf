import { CRATE_REWARDS } from "../config/CrateRewardDefinition";
import { rollCrateReward } from "../crate/CrateRewardRoller";
import type { BallEffectSelection } from "../ball-effects/BallEffectDefinition";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export function assertCrateRewardRegression(): void {
  const effects: BallEffectSelection[] = ["none", "high-power", "invincible", "ghost", "heavy", "sticky", "aim-swing"];
  const powered = new Set<BallEffectSelection>(["high-power", "invincible", "ghost"]);
  const rewardKey: Record<string, string> = { "high-power": "highPower", invincible: "invincible", ghost: "ghost" };
  for (const lives of [1, 2, 3, 4, 5] as const) {
    const original = CRATE_REWARDS.primaryRewardByLives[lives];
    assert(Math.abs(Object.values(original).reduce((a, b) => a + b, 0) - 100) < 1e-8, "Original reward weights must sum to 100");
    for (const effect of effects) {
      for (const sample of [0, 0.01, 0.1, 0.3, 0.54, 0.7, 0.9, 0.99, 0.999999]) {
        const result = rollCrateReward(lives, () => sample, effect);
        assert(result.grantedLives >= 0 && result.grantedLives + lives <= 5, "Life cap exceeded");
        assert(!(lives === 5 && result.kind === "extraLives"), "Extra lives awarded at cap");
        const primary = result.rolls.find(roll => roll.name === "primary");
        assert(!!primary, "Missing primary roll");
        assert(Math.abs(Object.values(primary!.weights).reduce((a, b) => a + b, 0) - 100) < 1e-8, "Effective weights must sum to 100");
        if (powered.has(effect)) {
          assert(primary!.weights.extraLives === CRATE_REWARDS.poweredUpExtraLifeChanceByLives[lives], "Powered-up life chance mismatch");
          assert(!(rewardKey[effect] in primary!.weights), "Current powerup was not excluded");
          assert(result.kind !== rewardKey[effect], "Repeated current powerup");
        } else {
          assert(primary!.weights.extraLives === original.extraLives, "Normal/debuffed reward weights changed");
        }
        if (result.kind === "extraLives" && effect !== "none") {
          assert(result.effect === effect && result.debuff === null, "Life pickup changed active effect");
          assert(!result.rolls.some(roll => roll.name === "debuffActivation"), "Life pickup rolled a debuff on an active effect");
        }
      }
    }
  }
  for (const effect of ["high-power", "invincible", "ghost"] as const) {
    for (const lives of [1, 2, 3, 4, 5] as const) {
      const chance = CRATE_REWARDS.poweredUpExtraLifeChanceByLives[lives];
      const life = rollCrateReward(lives, () => 0, effect);
      if (chance > 0) assert(life.kind === "extraLives", "Expected life priority");
      const replacement = rollCrateReward(lives, () => 0.999999, effect);
      assert(replacement.kind !== "extraLives" && replacement.effect !== effect, "Expected different powerup");
    }
  }
}
