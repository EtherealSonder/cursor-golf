import type { WorldModifierId } from "./WorldModifierDefinition";

/** Development-only modifier override. Set to null to restore production selection. */
export const WORLD_MODIFIER_DEVELOPMENT_OVERRIDE: WorldModifierId | null = "gale-force";
