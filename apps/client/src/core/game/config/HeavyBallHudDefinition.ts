import { DEFAULT_DEBUFF_HUD_DEFINITION } from "./DebuffHudDefinition";

/** Heavy Ball status badge, using the same proportions as High Power. */
export const HEAVY_BALL_HUD = {
    size: DEFAULT_DEBUFF_HUD_DEFINITION.entrySize,
    holderTint: DEFAULT_DEBUFF_HUD_DEFINITION.holderColor,
    iconScale: 0.55,
    iconOffsetX: 0,
    iconOffsetY: 0,
    negativeArrowScale: 0.50,
    negativeArrowOffsetX: 0,
    negativeArrowOffsetY: 36,
} as const;
