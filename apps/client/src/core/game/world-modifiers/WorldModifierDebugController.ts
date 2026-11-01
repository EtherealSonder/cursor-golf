import { DEFAULT_WORLD_MODIFIER_CONFIG } from "./WorldModifierConfig";
import type { WorldModifierConfiguration, WorldModifierId } from "./WorldModifierDefinition";
import { createWorldModifierSeed } from "./WorldModifierRandom";

/** Development-only selection commands. Never changes the production defaults. */
export type WorldModifierDebugSelection = "random" | "none" | WorldModifierId;
export class WorldModifierDebugController {
    public static createConfiguration(selection: WorldModifierDebugSelection): WorldModifierConfiguration {
        if (selection === "none") return { ...DEFAULT_WORLD_MODIFIER_CONFIG, mode: "disabled" };
        if (selection === "random") return DEFAULT_WORLD_MODIFIER_CONFIG;
        return { ...DEFAULT_WORLD_MODIFIER_CONFIG, mode: "forced", forcedModifier: selection };
    }
    public static newSeed(): number { return createWorldModifierSeed(); }
    public static parseSeed(value: string): number | null {
        const trimmed = value.trim();
        if (!/^\d+$/.test(trimmed)) return null;
        const number = Number(trimmed);
        return Number.isSafeInteger(number) && number >= 0 && number <= 4294967295 ? number : null;
    }
}
