import {
    Container,
    Graphics,
    Sprite,
} from "pixi.js";
import { AssetLoader } from "../../rendering/AssetLoader";
import {
    DEFAULT_DEBUFF_HUD_DEFINITION,
} from "../config/DebuffHudDefinition";
import {
    DEFAULT_WATER_DEBUFF_DEFINITION,
} from "../config/WaterDebuffDefinition";
import type {
    WaterDebuffDefinition,
} from "../config/WaterDebuffDefinition";

/**
 * D-4 Water death meter.
 *
 * Empty interior, blue fill and permanent outline are separate vector layers.
 * The blue droplet silhouette is stable; authoritative progress drives only a
 * simple bottom-up rectangular reveal mask.
 */
export class WaterDebuffIndicator {
    private readonly root = new Container();

    /** Full blue droplet silhouette. Geometry never changes after construction. */
    private readonly fillGraphics = new Graphics();

    /**
     * Rectangular bottom-up reveal mask. Progress only changes this rectangle,
     * so 0.83 always exposes exactly 83% of the droplet's vertical extent.
     */
    private readonly fillRevealMask = new Graphics();

    private readonly dropletWidth: number;
    private readonly dropletHeight: number;

    /** Last authoritative value consumed by setProgress(). */
    private currentProgress = 0;

    constructor(
        private readonly definition:
            WaterDebuffDefinition =
            DEFAULT_WATER_DEBUFF_DEFINITION,
    ) {
        this.root.label =
            "WaterDebuffIndicator";

        const entrySize =
            DEFAULT_DEBUFF_HUD_DEFINITION
                .entrySize;

        const holder =
            new Sprite(
                AssetLoader.getTexture(
                    "debuffHolder",
                ),
            );

        holder.anchor.set(0.5);
        holder.width = entrySize;
        holder.height = entrySize;
        holder.tint =
            DEFAULT_DEBUFF_HUD_DEFINITION
                .holderColor;

        this.root.addChild(holder);

        this.dropletWidth =
            this.definition.dropletWidth;
        this.dropletHeight =
            this.definition.dropletHeight;

        // Permanent light empty droplet.
        const emptyShape =
            new Graphics();

        this.drawFullDropletPath(
            emptyShape,
        );

        emptyShape.fill({
            color:
                this.definition
                    .emptyInteriorColor,
        });

        this.root.addChild(
            emptyShape,
        );

        /*
         * Stable full blue silhouette. The geometry is authored once and the
         * rectangular mask below performs the only progress-dependent work.
         */
        this.drawFullDropletPath(
            this.fillGraphics,
        );

        this.fillGraphics.fill({
            color:
                this.definition
                    .fillColor,
        });

        this.root.addChild(
            this.fillGraphics,
        );

        /*
         * Keep the mask in the same local coordinate system as the droplet.
         * It is a child of root so transforms stay identical to fillGraphics.
         */
        this.root.addChild(
            this.fillRevealMask,
        );

        this.fillGraphics.mask =
            this.fillRevealMask;

        // Permanent outline is always above both interior layers.
        const outline =
            new Graphics();

        this.drawFullDropletPath(
            outline,
        );

        outline.stroke({
            color:
                this.definition
                    .outlineColor,
            width:
                this.definition
                    .outlineWidth,
            join: "round",
        });

        this.root.addChild(
            outline,
        );

        const badgeRadius =
            DEFAULT_DEBUFF_HUD_DEFINITION
                .deathBadgeDiameter *
            0.5;

        const badgeY =
            DEFAULT_DEBUFF_HUD_DEFINITION
                .deathBadgeOffsetY;

        const badge =
            new Graphics()
                .circle(
                    0,
                    badgeY,
                    badgeRadius,
                )
                .fill({
                    color:
                        this.definition
                            .deathBadgeColor,
                })
                .stroke({
                    color:
                        this.definition
                            .deathBadgeOutlineColor,
                    width:
                        this.definition
                            .deathBadgeOutlineWidth,
                });

        this.root.addChild(
            badge,
        );

        const death =
            new Sprite(
                AssetLoader.getTexture(
                    "debuffDeath",
                ),
            );

        death.anchor.set(0.5);
        death.position.set(
            0,
            badgeY,
        );
        death.width =
            badgeRadius * 1.35;
        death.height =
            badgeRadius * 1.35;

        this.root.addChild(
            death,
        );

        this.setProgress(0);
    }

    /**
     * Draw the complete teardrop path in this indicator's local coordinates.
     */
    private drawFullDropletPath(
        graphics: Graphics,
    ): void {
        const cx =
            this.definition
                .dropletOffsetX;
        const cy =
            this.definition
                .dropletOffsetY;

        const w =
            this.dropletWidth;
        const h =
            this.dropletHeight;

        const topY =
            cy - h * 0.5;
        const bottomY =
            cy + h * 0.5;

        graphics.moveTo(
            cx,
            topY,
        );

        graphics.bezierCurveTo(
            cx - w * 0.10,
            topY + h * 0.18,
            cx - w * 0.50,
            topY + h * 0.48,
            cx - w * 0.50,
            topY + h * 0.67,
        );

        graphics.bezierCurveTo(
            cx - w * 0.50,
            bottomY - h * 0.12,
            cx - w * 0.28,
            bottomY,
            cx,
            bottomY,
        );

        graphics.bezierCurveTo(
            cx + w * 0.28,
            bottomY,
            cx + w * 0.50,
            bottomY - h * 0.12,
            cx + w * 0.50,
            topY + h * 0.67,
        );

        graphics.bezierCurveTo(
            cx + w * 0.50,
            topY + h * 0.48,
            cx + w * 0.10,
            topY + h * 0.18,
            cx,
            topY,
        );

        graphics.closePath();
    }

    /**
     * Draw only the portion of the droplet below the requested horizontal
     * waterline. This is direct geometry, not a Pixi mask.
     *
     * For reliability, the fill uses horizontal scan strips. Each strip's
     * width is evaluated from a teardrop envelope, so progress is always
     * reconstructed solely from the supplied authoritative meter.
     */
    private rebuildFill(
        progress: number,
    ): void {
        const cx =
            this.definition
                .dropletOffsetX;
        const cy =
            this.definition
                .dropletOffsetY;

        const w =
            this.dropletWidth;
        const h =
            this.dropletHeight;

        const bottom =
            cy + h * 0.5;

        const visibleHeight =
            h * progress;

        const revealTop =
            bottom - visibleHeight;

        /*
         * Rebuild only the rectangular reveal. The underlying blue droplet is
         * permanent, so the meter cannot preserve stale shallow-water geometry.
         *
         * The rectangle deliberately extends slightly beyond the droplet width
         * to avoid clipping the outline-adjacent interior at full progress.
         */
        this.fillRevealMask
            .clear();

        if (visibleHeight <= 0) {
            return;
        }

        this.fillRevealMask
            .rect(
                cx - w * 0.6,
                revealTop,
                w * 1.2,
                visibleHeight,
            )
            .fill({
                color: 0xffffff,
            });
    }

    public setProgress(
        normalizedProgress: number,
    ): void {
        const progress =
            Math.max(
                0,
                Math.min(
                    1,
                    Number.isFinite(
                        normalizedProgress,
                    )
                        ? normalizedProgress
                        : 0,
                ),
            );

        this.currentProgress =
            progress;

        /*
         * Always rebuild. Do not early-out when the numeric value is unchanged:
         * a HUD entry may have been detached/revived between calls.
         */
        this.rebuildFill(
            this.currentProgress,
        );

    }

    public getProgress(): number {
        return this.currentProgress;
    }


    public getContainer(): Container {
        return this.root;
    }
}
