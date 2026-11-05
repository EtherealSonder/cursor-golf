import { DEFAULT_DEBUFF_HUD_DEFINITION } from "./DebuffHudDefinition";

/** High Power status badge. Positions are relative to the queue entry centre. */
export const HIGH_POWER_BALL_HUD = {
    size: DEFAULT_DEBUFF_HUD_DEFINITION.entrySize,
    holderTint: DEFAULT_DEBUFF_HUD_DEFINITION.holderColor,
    iconScale: 0.55,
    iconOffsetX: 0,
    iconOffsetY: 0,
    positiveArrowScale: 0.50,
    positiveArrowOffsetX: 0,
    positiveArrowOffsetY: 36,
} as const;
