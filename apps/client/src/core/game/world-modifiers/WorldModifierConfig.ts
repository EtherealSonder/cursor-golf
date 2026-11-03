import { WORLD_MODIFIER_IDS, type WorldModifierConfiguration } from "./WorldModifierDefinition";
export const DEFAULT_WORLD_MODIFIER_CONFIG: WorldModifierConfiguration = Object.freeze({
    mode: "random",
    activationChance: 0.65,
    eligible: Object.freeze([...WORLD_MODIFIER_IDS]),
    weights: Object.freeze({ "dune-surge": 8, downpour: 12, wildfire: 20, "gale-force": 35, overdrive: 25 }),
});
