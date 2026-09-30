export interface WaterDebuffDefinition {
    /** Visible droplet dimensions inside the circular HUD holder. */
    readonly dropletWidth: number;
    readonly dropletHeight: number;
    readonly dropletOffsetX: number;
    readonly dropletOffsetY: number;

    /** Authored droplet canvas coordinates used by the procedural layers. */
    readonly authoredCanvasSize: number;

    readonly emptyInteriorColor: number;
    readonly fillColor: number;
    readonly outlineColor: number;
    readonly outlineWidth: number;

    readonly deathBadgeColor: number;
    readonly deathBadgeOutlineColor: number;
    readonly deathBadgeOutlineWidth: number;
}

export const DEFAULT_WATER_DEBUFF_DEFINITION: WaterDebuffDefinition = {
    // Compact, centered droplet with breathing room matching the reference.
    dropletWidth: 34,
    dropletHeight: 43,
    dropletOffsetX: 0,
    dropletOffsetY: -3,

    authoredCanvasSize: 512,

    emptyInteriorColor: 0xffffff,
    fillColor: 0x1e99ff,
    outlineColor: 0x171317,
    outlineWidth: 2.5,

    deathBadgeColor: 0xff2457,
    deathBadgeOutlineColor: 0x171317,
    deathBadgeOutlineWidth: 2,
};
