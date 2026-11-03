import type { Sprite } from "pixi.js";
export interface OverdriveVfxParticle {
    readonly sprite: Sprite;
    active: boolean;
    sourceIndex: number;
    x: number; y: number; baseX: number;
    age: number; life: number; rise: number;
    phase: number; frequency: number; amplitude: number;
}
