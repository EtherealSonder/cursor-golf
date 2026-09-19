import { Container, Graphics, Sprite, type Texture } from "pixi.js";
import {
    DEFAULT_WATER_IMPACT_VFX_DEFINITION,
    type WaterImpactVfxDefinition,
} from "../config/WaterImpactVfxDefinition";
import { WaterVfxTextureFactory } from "../water-vfx/WaterVfxTextureFactory";

/**
 * Phase 8I-7C.1 temporary screen-space gallery for visual inspection of the
 * generated Water impact vocabulary. It owns Sprites only, never the cached
 * textures supplied by WaterVfxTextureFactory.
 */
export class WaterImpactPrimitiveGallery {
    private readonly container = new Container();
    private readonly sprites: Sprite[] = [];

    public constructor(
        definition: WaterImpactVfxDefinition = DEFAULT_WATER_IMPACT_VFX_DEFINITION,
    ) {
        this.container.label = "8I-7C.1 Water Impact Primitive Gallery";
        this.container.position.set(24, 24);

        const textures = WaterVfxTextureFactory.getImpactTextureSet(definition);
        const rows: readonly (readonly Texture[])[] = [
            textures.splashLobes,
            [...textures.roundDroplets, ...textures.teardropDroplets, ...textures.elongatedDroplets],
            textures.surfaceDisturbances,
            textures.ripples,
        ];

        const padding = 18;
        const rowHeight = 104;
        const width = 520;
        const height = padding * 2 + rows.length * rowHeight;

        const panel = new Graphics()
            .roundRect(0, 0, width, height, 14)
            .fill({ color: 0x10242b, alpha: 0.88 })
            .stroke({ color: 0x8fe7fa, alpha: 0.55, width: 2 });
        this.container.addChild(panel);

        rows.forEach((row, rowIndex) => {
            let x = padding + 34;
            const y = padding + rowIndex * rowHeight + rowHeight * 0.5;

            if (rowIndex > 0) {
                const dividerY = padding + rowIndex * rowHeight;
                const divider = new Graphics()
                    .moveTo(padding, dividerY)
                    .lineTo(width - padding, dividerY)
                    .stroke({ color: 0x8fe7fa, alpha: 0.18, width: 1 });
                this.container.addChild(divider);
            }

            for (const texture of row) {
                const sprite = new Sprite(texture);
                sprite.anchor.set(0.5);
                const maxDimension = Math.max(texture.width, texture.height, 1);
                const inspectionScale = Math.min(2.0, 70 / maxDimension);
                sprite.scale.set(inspectionScale);
                sprite.position.set(x + (texture.width * inspectionScale) * 0.5, y);
                this.container.addChild(sprite);
                this.sprites.push(sprite);
                x += texture.width * inspectionScale + 34;
            }
        });
    }

    public getContainer(): Container {
        return this.container;
    }

    public destroy(): void {
        for (const sprite of this.sprites) {
            sprite.removeFromParent();
            sprite.destroy({ texture: false, textureSource: false });
        }
        this.sprites.length = 0;
        this.container.destroy({ children: true });
    }
}
