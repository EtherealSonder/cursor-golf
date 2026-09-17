export type WaterFireInteractionType = "airborne-water-ground-fire" | "standing-water-ground-fire" | "airborne-water-directional-fire" | "standing-water-directional-fire";
export type WaterFireWaterType = "airborne" | "standing";
export type WaterFireFireType = "ground" | "directional";

export interface WaterFireContactEvent {
    readonly positionX: number;
    readonly positionY: number;
    readonly interactionType: WaterFireInteractionType;
    readonly waterType: WaterFireWaterType;
    readonly fireType: WaterFireFireType;
    readonly waterSourceId?: string;
    readonly fireSourceId?: string;
    readonly waterAmount: number;
    readonly fireIntensity?: number;
}
