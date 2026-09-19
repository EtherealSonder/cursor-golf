import type { Texture } from "pixi.js";

/** Reusable, generated texture vocabulary for shared Water impact presentation. */
export interface WaterImpactTextureSet {
    readonly splashLobes: readonly Texture[];
    readonly roundDroplets: readonly Texture[];
    readonly teardropDroplets: readonly Texture[];
    readonly elongatedDroplets: readonly Texture[];
    readonly surfaceDisturbances: readonly Texture[];
    readonly ripples: readonly Texture[];
}

export function destroyWaterImpactTextureSet(set: WaterImpactTextureSet): void {
    const unique = new Set<Texture>();
    for (const group of [
        set.splashLobes,
        set.roundDroplets,
        set.teardropDroplets,
        set.elongatedDroplets,
        set.surfaceDisturbances,
        set.ripples,
    ]) {
        for (const texture of group) unique.add(texture);
    }
    for (const texture of unique) texture.destroy(true);
}
