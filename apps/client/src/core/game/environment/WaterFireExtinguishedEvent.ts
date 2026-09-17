import type { WaterFireContactEvent } from "./WaterFireContactEvent";

export interface WaterFireExtinguishedEvent extends WaterFireContactEvent {
    readonly extinguished: true;
}
