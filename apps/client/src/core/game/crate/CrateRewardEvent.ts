import type { BallEffectSelection } from "../ball-effects/BallEffectDefinition";
export type CrateRewardKind = "extraLives" | "highPower" | "invincible" | "ghost";
export type CrateDebuffKind = "aimSwing" | "stickyBall" | "heavierBall";
export interface CrateDestructionRewardEvent { crateId: string; x: number; y: number; }
export interface CrateRewardResult {
  kind: CrateRewardKind; livesBefore: number; rawLifeAmount: number; grantedLives: number;
  debuff: CrateDebuffKind | null; effect: BallEffectSelection;
  rolls: ReadonlyArray<{ name: string; random: number; weights: Record<string, number>; selected: string }>;
}
