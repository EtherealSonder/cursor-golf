import {
    Container,
    Sprite,
    Texture,
} from "pixi.js";

import {
    DEFAULT_WATER_DEBUG_DEFINITION,
} from "../game/config/WaterDebugDefinition";

import type {
    WaterDebugDefinition,
} from "../game/config/WaterDebugDefinition";

import type {
    WaterField,
} from "../game/environment/WaterField";

import {
    WaterDepthTexture,
} from "./WaterDepthTexture";

import {
    createWaterSurfaceShader,
} from "./WaterSurfaceShader";

/**
 * Production standing-Water presentation.
 *
 * The visible object is a plain world-sized quad. WaterField depth is stored
 * separately in WaterDepthTexture and bound explicitly to the shader.
 */
export class WaterSurfaceRenderer {

    private readonly container:
        Container;

    private readonly presentationQuad:
        Sprite;

    private readonly depthTexture:
        WaterDepthTexture;

    private refreshAccumulator =
        0;

    private destroyed =
        false;

    public constructor(
        waterField:
            WaterField,

        private readonly definition:
            WaterDebugDefinition =
            DEFAULT_WATER_DEBUG_DEFINITION,
    ) {
        this.container =
            new Container();

        this.depthTexture =
            new WaterDepthTexture(
                waterField,
                definition
                    .depthTextureFullScaleDepth,
            );

        /*
         * Texture.WHITE supplies only geometry for Pixi's Filter pipeline.
         * The Water shader ignores that texture and samples the explicit
         * uWaterDepthTexture resource instead.
         */
        this.presentationQuad =
            new Sprite(
                Texture.WHITE,
            );

        const cellSize =
            waterField
                .getDefinition()
                .cellSize;

        this.presentationQuad
            .position
            .set(
                waterField
                    .getMinimumWorldX(),
                waterField
                    .getMinimumWorldY(),
            );

        this.presentationQuad.width =
            waterField
                .getColumnCount() *
            cellSize;

        this.presentationQuad.height =
            waterField
                .getRowCount() *
            cellSize;

        const minimumVisibleDepthNormalized =
            definition
                .minimumVisibleDepth /
            definition
                .depthTextureFullScaleDepth;

        const edgeTransitionDepthNormalized =
            definition
                .edgeTransitionDepth /
            definition
                .depthTextureFullScaleDepth;

        this.presentationQuad.filters = [
            createWaterSurfaceShader(
                this.depthTexture
                    .getTexture(),
                {
                    minimumVisibleDepthNormalized,
                    edgeTransitionDepthNormalized,
                    waterColor:
                        definition
                            .standingWaterColor,
                    waterAlpha:
                        definition
                            .waterAlpha,
                },
            ),
        ];

        this.presentationQuad.visible =
            definition.enabled;

        this.container.addChild(
            this.presentationQuad,
        );
    }

    public getDisplayObject():
        Container {

        return this.container;
    }

    public update(
        deltaTime:
            number,
    ): void {

        if (
            this.destroyed ||
            !this.definition.enabled ||
            !Number.isFinite(deltaTime) ||
            deltaTime < 0
        ) {
            return;
        }

        this.refreshAccumulator +=
            deltaTime;

        if (
            this.refreshAccumulator <
            this.definition
                .refreshIntervalSeconds
        ) {
            return;
        }

        this.refreshAccumulator =
            0;

        this.depthTexture
            .redraw();
    }

    public redrawImmediately():
        void {

        if (
            this.destroyed ||
            !this.definition.enabled
        ) {
            return;
        }

        this.refreshAccumulator =
            0;

        this.depthTexture
            .redraw();
    }

    public clear():
        void {

        if (this.destroyed) {
            return;
        }

        this.refreshAccumulator =
            0;

        this.depthTexture
            .clear();
    }

    public destroy():
        void {

        if (this.destroyed) {
            return;
        }

        this.destroyed =
            true;

        this.presentationQuad
            .removeFromParent();

        this.presentationQuad
            .destroy();

        this.depthTexture
            .destroy();

        this.container
            .removeFromParent();

        this.container
            .destroy();
    }
}
