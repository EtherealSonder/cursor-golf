export const CRATE_REWARDS = {
  maxLives: 5,
  primaryRewardByLives: {
    1: { extraLives: 55, highPower: 28, invincible: 12, ghost: 5 },
    2: { extraLives: 55, highPower: 28, invincible: 12, ghost: 5 },
    3: { extraLives: 55, highPower: 28, invincible: 12, ghost: 5 },
    4: { extraLives: 5, highPower: 63, invincible: 27, ghost: 5 },
    5: { extraLives: 0, highPower: 66.5, invincible: 28.5, ghost: 5 },
  },
  extraLivesAmountByLives: {
    1: { plus1: 15, plus2: 25, plus3: 60 },
    2: { plus1: 10, plus2: 55, plus3: 35 },
    3: { plus1: 70, plus2: 30, plus3: 0 },
    4: { plus1: 100, plus2: 0, plus3: 0 },
  },
  extraLivesDebuff: { activationChance: 0.8, weights: { aimSwing: 50, stickyBall: 35, heavierBall: 15 } },
  effectLifetime: { type: "oneLife", timer: null, clearOnDeath: true, clearOnLevelComplete: true },
} as const;
export const CRATE_REWARD_LABELS = {
  highPower: "High power ball", invincible: "Invincible ball", ghost: "Ghost ball",
  aimSwing: "Aim swing", stickyBall: "Sticky ball", heavierBall: "Heavier ball",
} as const;
export const CRATE_REWARD_DEBUG = import.meta.env.DEV;
