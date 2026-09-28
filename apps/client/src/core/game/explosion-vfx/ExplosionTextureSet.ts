import type { Texture } from "pixi.js";
import { AssetLoader } from "../../rendering/AssetLoader";
/** Texture ownership remains with AssetLoader. Never destroy these shared textures here. */
export interface ExplosionTextureSet {
    blastRings: readonly [Texture, Texture, Texture];
    pressureRing: Texture;
    ignition: Texture;
    fireBody: Texture;
    flameFragment: Texture;
    ember: Texture;
    breakupNoise: Texture;
}
export function getExplosionTextureSet(): ExplosionTextureSet {
    return {
        blastRings: [
            AssetLoader.getTexture("explosionBlastRingA"),
            AssetLoader.getTexture("explosionBlastRingB"),
            AssetLoader.getTexture("explosionBlastRingC"),
        ],
        pressureRing: AssetLoader.getTexture("explosionPressureRing"),
        ignition: AssetLoader.getTexture("explosionIgnition"),
        fireBody: AssetLoader.getTexture("explosionFireBody"),
        flameFragment: AssetLoader.getTexture("explosionFlameFragment"),
        ember: AssetLoader.getTexture("explosionEmber"),
        breakupNoise: AssetLoader.getTexture("explosionBreakupNoise"),
    };
}
