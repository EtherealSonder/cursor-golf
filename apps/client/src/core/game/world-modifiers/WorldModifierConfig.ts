import { WORLD_MODIFIER_IDS, type WorldModifierConfiguration } from "./WorldModifierDefinition";
export const DEFAULT_WORLD_MODIFIER_CONFIG: WorldModifierConfiguration = Object.freeze({
    mode: "random",
    activationChance: 0.65,
    eligible: Object.freeze([...WORLD_MODIFIER_IDS]),
    weights: Object.freeze({ "dune-surge": 1, downpour: 1, wildfire: 1, "gale-force": 1, overdrive: 1 }),
});
