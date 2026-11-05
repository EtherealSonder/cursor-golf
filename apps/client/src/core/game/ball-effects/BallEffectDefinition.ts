/** Persistent, mutually exclusive ball effects. Instant life grants are separate. */
export const BALL_EFFECT_IDS = ["high-power", "invincible", "ghost", "heavy", "sticky", "aim-swing"] as const;
export type BallEffectId = typeof BALL_EFFECT_IDS[number];
export type BallEffectSelection = BallEffectId | "none";
export type BallEffectCategory = "powerup" | "debuff" | "hybrid";
export interface BallEffectSnapshot {
    readonly active: BallEffectSelection;
    readonly revision: number;
}
export const BALL_EFFECT_OPTIONS: readonly { id: BallEffectSelection; label: string; category: BallEffectCategory | "none" }[] = [
    { id: "none", label: "Normal Ball", category: "none" },
    { id: "high-power", label: "High Power Ball", category: "powerup" },
    { id: "invincible", label: "Invincible Ball", category: "powerup" },
    { id: "ghost", label: "Ghost Ball", category: "hybrid" },
    { id: "heavy", label: "Heavier Ball", category: "debuff" },
    { id: "sticky", label: "Sticky Ball", category: "debuff" },
    { id: "aim-swing", label: "Aim Swing", category: "debuff" },
];
export function isBallEffectSelection(value: string): value is BallEffectSelection {
    return value === "none" || (BALL_EFFECT_IDS as readonly string[]).includes(value);
}
