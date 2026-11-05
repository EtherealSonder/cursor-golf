import { DEFAULT_DEBUFF_HUD_DEFINITION } from "./DebuffHudDefinition";

/** Invincible Ball positive-effect HUD badge. */
export const INVINCIBLE_BALL_HUD = {
    size: DEFAULT_DEBUFF_HUD_DEFINITION.entrySize,
    holderTint: DEFAULT_DEBUFF_HUD_DEFINITION.holderColor,
    iconScale: 0.60,
    iconOffsetX: 0,
    iconOffsetY: 0,
    positiveArrowScale: 0.50,
    positiveArrowOffsetX: 0,
    positiveArrowOffsetY: 36,
} as const;
