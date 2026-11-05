import { CRATE_REWARDS } from "../config/CrateRewardDefinition";
import { rollCrateReward } from "../crate/CrateRewardRoller";
export function assertCrateRewardRegression(): void {
  for (const lives of [1, 2, 3, 4, 5] as const) {
    const primary = CRATE_REWARDS.primaryRewardByLives[lives];
    if (Math.abs(Object.values(primary).reduce((a, b) => a + b, 0) - 100) > 0.00001) throw new Error("Crate reward primary weights must sum to 100");
    for (const random of [0, 0.25, 0.54, 0.7, 0.99]) {
      const result = rollCrateReward(lives, () => random);
      if (result.grantedLives < 0 || result.grantedLives + lives > 5) throw new Error("Crate reward exceeded life cap");
      if (lives === 5 && result.kind === "extraLives") throw new Error("Extra lives must not roll at cap");
    }
  }
}
