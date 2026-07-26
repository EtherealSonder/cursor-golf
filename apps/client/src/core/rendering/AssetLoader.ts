import { Assets, Texture } from "pixi.js";

import golfClubTexture from "../../assets/sprites/golf/golf_club_temp.png";

export class AssetLoader {
    private static initialized = false;

    private static textures = new Map<string, Texture>();

    public static async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        console.log("========== ASSET LOADER ==========");

        await this.loadTexture(
            "golfClub",
            golfClubTexture,
        );

        this.initialized = true;

        console.log("All assets loaded.");
        console.log("==================================");
    }

    private static async loadTexture(
        key: string,
        assetPath: string,
    ): Promise<void> {
        const texture = await Assets.load(assetPath);

        this.textures.set(key, texture);

        console.log(
            `Loaded Texture: ${key} (${texture.width} x ${texture.height})`,
        );
    }

    public static getTexture(key: string): Texture {
        const texture = this.textures.get(key);

        if (!texture) {
            throw new Error(
                `Texture '${key}' has not been loaded.`,
            );
        }

        return texture;
    }

    public static hasTexture(key: string): boolean {
        return this.textures.has(key);
    }
}