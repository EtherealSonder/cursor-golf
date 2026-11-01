export const WORLD_MODIFIER_IDS = ["dune-surge", "downpour", "wildfire", "gale-force", "overdrive"] as const;
export type WorldModifierId = typeof WORLD_MODIFIER_IDS[number];
export const WORLD_MODIFIER_NAMES: Readonly<Record<WorldModifierId, string>> = Object.freeze({
    "dune-surge": "Dune Surge", downpour: "Downpour", wildfire: "Wildfire",
    "gale-force": "Gale Force", overdrive: "Overdrive",
});
export type WorldModifierMode = "random" | "disabled" | "forced";
export interface WorldModifierConfiguration {
    readonly mode: WorldModifierMode;
    readonly activationChance: number;
    readonly eligible: readonly WorldModifierId[];
    readonly weights: Readonly<Partial<Record<WorldModifierId, number>>>;
    readonly forcedModifier?: WorldModifierId;
}
export interface WorldModifierResolvedState {
    readonly seed: number;
    readonly modifier: WorldModifierId | null;
    readonly activationRoll: number | null;
    readonly selectionRoll: number | null;
    readonly mode: WorldModifierMode;
}
