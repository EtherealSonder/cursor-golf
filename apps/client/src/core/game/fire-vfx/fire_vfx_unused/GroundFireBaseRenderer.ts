import {
    Application,
    Container,
    Graphics,
    Sprite,
    Texture,
} from "pixi.js";

import {
    GAME_COLOR_PALETTE,
} from "../config/GameColorPalette";

import {
    DEFAULT_FIRE_BASE_VFX_DEFINITION,
} from "../config/FireBaseVfxDefinition";

import type {
    FireBaseVfxDefinition,
} from "../config/FireBaseVfxDefinition";

import type {
    FireManager,
} from "../environment/FireManager";

import type {
    FireCell,
} from "../environment/FireCell";

interface FireBaseStamp {
    readonly container: Container;
    readonly accent: Sprite;
    readonly body: Sprite;

    touchedFrame: number;
}

/**
 * Cheap presentation-only renderer for the connected low Fire bed.
 *
 * Performance rules:
 * - two small textures are generated once at construction
 * - one retained Sprite pair is created per active FireCell
 * - no pairwise FireCell/influence comparisons
 * - no metaballs
 * - no coherent-noise reconstruction
 * - no per-frame Graphics rebuilding
 * - no per-frame Set/Array creation in this renderer
 *
 * Adjacent stamps overlap naturally because the visual stamp is slightly
 * larger than the authoritative 48 px FireCell.
 */
export class GroundFireBaseRenderer {
    private readonly container =
        new Container();

    private readonly bodyTexture:
        Texture;

    private readonly accentTexture:
        Texture;

    private readonly stamps =
        new Map<
            string,
            FireBaseStamp
        >();

    private frameId =
        0;

    public constructor(
        app: Application,

        private readonly fireManager:
            FireManager,

        private readonly definition:
            FireBaseVfxDefinition =
            DEFAULT_FIRE_BASE_VFX_DEFINITION,
    ) {
        this.bodyTexture =
            this.createStampTexture(
                app,
                GAME_COLOR_PALETTE
                    .fire.body,
                1,
            );

        this.accentTexture =
            this.createStampTexture(
                app,
                GAME_COLOR_PALETTE
                    .fire.accent,
                this.definition
                    .accentScale,
            );
    }

    public getContainer():
        Container {

        return this.container;
    }

    public update(
        deltaTime: number,
    ): void {

        if (
            !Number.isFinite(
                deltaTime,
            ) ||
            deltaTime <= 0
        ) {
            return;
        }

        this.frameId += 1;

        const cells =
            this.fireManager
                .getActiveCells();

        for (
            let index = 0;
            index <
            cells.length;
            index += 1
        ) {
            this.updateCell(
                cells[index],
            );
        }

        this.stamps.forEach(
            (
                stamp:
                    FireBaseStamp,
                key: string,
            ) => {
                if (
                    stamp.touchedFrame ===
                    this.frameId
                ) {
                    return;
                }

                stamp.container
                    .removeFromParent();

                stamp.container.destroy({
                    children:
                        true,
                });

                this.stamps.delete(
                    key,
                );
            },
        );
    }

    public reset():
        void {

        this.stamps.forEach(
            (
                stamp:
                    FireBaseStamp,
            ) => {
                stamp.container
                    .removeFromParent();

                stamp.container.destroy({
                    children:
                        true,
                });
            },
        );

        this.stamps.clear();

        this.frameId =
            0;
    }

    public destroy():
        void {

        this.reset();

        this.bodyTexture.destroy(
            true,
        );

        this.accentTexture.destroy(
            true,
        );

        this.container.destroy({
            children:
                false,
        });
    }

    private updateCell(
        cell: FireCell,
    ): void {

        const key =
            this.getCellKey(
                cell,
            );

        let stamp =
            this.stamps.get(
                key,
            );

        if (!stamp) {
            stamp =
                this.createStamp(
                    cell,
                );

            this.stamps.set(
                key,
                stamp,
            );

            this.container.addChild(
                stamp.container,
            );
        }

        stamp.touchedFrame =
            this.frameId;

        const intensity =
            this.clamp01(
                cell.getIntensity(),
            );

        const age =
            cell.getAge();

        const youngEnergy =
            1 -
            this.clamp01(
                age /
                0.9,
            );

        const alpha =
            this.lerp(
                this.definition
                    .minimumAlpha,
                this.definition
                    .maximumAlpha,
                intensity,
            ) +
            youngEnergy *
            this.definition
                .youngFireAlphaBoost;

        const scale =
            this.lerp(
                this.definition
                    .minimumScale,
                this.definition
                    .maximumScale,
                Math.sqrt(
                    intensity,
                ),
            ) *
            this.definition
                .stampOverlapScale;

        /*
         * No breathing animation. Scale and alpha only follow authoritative
         * Fire intensity/age, so a stable FireCell produces a stable base.
         */
        stamp.body.alpha =
            this.clamp01(
                alpha,
            );

        stamp.body.scale.set(
            scale,
        );

        stamp.accent.alpha =
            this.clamp01(
                this.definition
                    .accentAlpha *
                (
                    0.72 +
                    intensity *
                    0.28
                ),
            );

        stamp.accent.scale.set(
            scale,
        );
    }

    private createStamp(
        cell: FireCell,
    ): FireBaseStamp {

        const stampContainer =
            new Container();

        stampContainer.position.set(
            cell.getWorldCenterX(),
            cell.getWorldCenterY(),
        );

        /*
         * Deterministic quarter-turn variation prevents every retained stamp
         * from presenting exactly the same silhouette without animating it.
         */
        const rotationQuarter =
            Math.abs(
                (
                    cell.getGridX() *
                    31 +
                    cell.getGridY() *
                    17
                ) %
                4
            );

        stampContainer.rotation =
            rotationQuarter *
            Math.PI *
            0.5;

        const accent =
            new Sprite(
                this.accentTexture,
            );

        accent.anchor.set(
            0.5,
        );

        const body =
            new Sprite(
                this.bodyTexture,
            );

        body.anchor.set(
            0.5,
        );

        stampContainer.addChild(
            accent,
        );

        stampContainer.addChild(
            body,
        );

        return {
            container:
                stampContainer,

            accent,

            body,

            touchedFrame:
                this.frameId,
        };
    }

    private createStampTexture(
        app: Application,
        color: number,
        scaleMultiplier: number,
    ): Texture {

        const size =
            this.definition
                .stampSize *
            scaleMultiplier;

        const half =
            size *
            0.5;

        const graphics =
            new Graphics();

        /*
         * One irregular rounded stamp generated once. The uneven outline is
         * static, deliberately avoiding the previous amoeba-like breathing.
         */
        graphics
            .moveTo(
                half * 0.10,
                -half * 0.78,
            )
            .bezierCurveTo(
                half * 0.48,
                -half * 0.98,
                half * 0.88,
                -half * 0.48,
                half * 0.82,
                -half * 0.10,
            )
            .bezierCurveTo(
                half * 1.00,
                half * 0.28,
                half * 0.48,
                half * 0.86,
                half * 0.08,
                half * 0.78,
            )
            .bezierCurveTo(
                -half * 0.30,
                half * 0.98,
                -half * 0.92,
                half * 0.54,
                -half * 0.78,
                half * 0.10,
            )
            .bezierCurveTo(
                -half * 0.96,
                -half * 0.30,
                -half * 0.42,
                -half * 0.92,
                half * 0.10,
                -half * 0.78,
            )
            .closePath()
            .fill({
                color,
                alpha:
                    1,
            });

        const texture =
            app.renderer
                .generateTexture(
                    graphics,
                );

        graphics.destroy();

        return texture;
    }

    private getCellKey(
        cell: FireCell,
    ): string {

        return (
            `${cell.getGridX()}:` +
            `${cell.getGridY()}`
        );
    }

    private lerp(
        start: number,
        end: number,
        amount: number,
    ): number {

        return (
            start +
            (
                end -
                start
            ) *
            amount
        );
    }

    private clamp01(
        value: number,
    ): number {

        return Math.max(
            0,
            Math.min(
                1,
                value,
            ),
        );
    }
}
