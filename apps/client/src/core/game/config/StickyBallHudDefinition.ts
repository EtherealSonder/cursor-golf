import { DEFAULT_DEBUFF_HUD_DEFINITION } from "./DebuffHudDefinition";

/** Sticky Ball status badge. Matches existing negative-effect HUD entries. */
export const STICKY_BALL_HUD = {
    size: DEFAULT_DEBUFF_HUD_DEFINITION.entrySize,
    holderTint: DEFAULT_DEBUFF_HUD_DEFINITION.holderColor,
    iconScale: 0.60,
    iconOffsetX: 0,
    iconOffsetY: 0,
    negativeArrowScale: 0.50,
    negativeArrowOffsetX: 0,
    negativeArrowOffsetY: 36,
} as const;
