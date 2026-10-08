import {
    Container,
    Graphics,
    Sprite,
} from "pixi.js";

import {
    AssetLoader,
} from "../../rendering/AssetLoader";

import {
    DEFAULT_BALL_LIVES_HUD_DEFINITION,
} from "../config/BallLivesHudDefinition";

import type {
    BallLivesHudDefinition,
} from "../config/BallLivesHudDefinition";

/**
 * Screen-space Ball lives presentation. Gameplay state is supplied through
 * setLives(); this component never owns or decrements authoritative lives.
 */
export class BallLivesHud {

    private readonly root:
        Container;

    private readonly definition:
        BallLivesHudDefinition;

    private readonly holder:
        Sprite;

    private readonly sockets:
        Graphics[] = [];

    private readonly lifeBalls:
        Sprite[] = [];

    private currentLives = 0;
    private initializedLives = false;

    private readonly lifeLossAnimations =
        new Map<number, number>();

    private readonly pendingLifeLossIndices: number[] = [];

    /**
     * Layout owns the sprites' native display scale. Death feedback must only
     * multiply that established scale, never replace it with an absolute 1.
     */
    private readonly lifeBallBaseScales: number[] = [];

    constructor(
        definition:
            BallLivesHudDefinition =
            DEFAULT_BALL_LIVES_HUD_DEFINITION,
    ) {
        this.definition =
            definition;

        this.validateDefinition();

        this.root =
            new Container();

        this.root.label =
            "BallLivesHud";

        this.holder =
            new Sprite(
                AssetLoader.getTexture(
                    "ballLivesHolder",
                ),
            );

        this.createPresentation();
    }

    private validateDefinition(): void {
        if (
            this.definition.maximumSlots <= 0
        ) {
            throw new Error(
                "BallLivesHudDefinition contains an invalid lives configuration.",
            );
        }
    }

    private createPresentation(): void {
        const definition =
            this.definition;

        this.holder.width =
            definition.holderWidth;

        this.holder.height =
            definition.holderHeight;

        this.root.addChild(
            this.holder,
        );

        const rowWidth =
            definition.maximumSlots *
                definition.socketDiameter +
            (definition.maximumSlots - 1) *
                definition.socketSpacing;

        const startX =
            Math.max(
                definition.holderPaddingX,
                (definition.holderWidth - rowWidth) * 0.5,
            );

        const centerY =
            definition.holderHeight * 0.5 +
            definition.rowOffsetY;

        for (
            let index = 0;
            index < definition.maximumSlots;
            index += 1
        ) {
            const centerX =
                startX +
                definition.socketDiameter * 0.5 +
                index *
                    (
                        definition.socketDiameter +
                        definition.socketSpacing
                    );

            const socket =
                new Graphics()
                    .circle(
                        centerX,
                        centerY,
                        definition.socketDiameter * 0.5,
                    )
                    .fill({
                        color:
                            definition.socketColor,
                        alpha:
                            definition.socketAlpha,
                    });

            this.sockets.push(
                socket,
            );

            this.root.addChild(
                socket,
            );

            const ball =
                new Sprite(
                    AssetLoader.getTexture(
                        "ballUi",
                    ),
                );

            ball.anchor.set(
                0.5,
            );

            ball.width =
                definition.ballDiameter;

            ball.height =
                definition.ballDiameter;

            ball.position.set(
                centerX,
                centerY,
            );

            ball.visible = false;

            this.lifeBalls.push(
                ball,
            );

            this.root.addChild(
                ball,
            );
        }
    }

    public setLives(
        currentLives: number,
        maximumLives: number,
    ): void {
        const visibleSlots = Math.min(
            this.lifeBalls.length,
            Math.max(0, maximumLives),
        );

        const clampedLives = Math.min(
            visibleSlots,
            Math.max(0, Math.floor(currentLives)),
        );

        if (!this.initializedLives) {
            this.initializedLives = true;
            this.currentLives = clampedLives;

            for (let index = 0; index < this.lifeBalls.length; index += 1) {
                this.sockets[index].visible = index < visibleSlots;
                this.lifeBalls[index].visible = index < clampedLives;
                this.restoreLifeBallBaseScale(index);
            }
            return;
        }

        if (clampedLives < this.currentLives) {
            for (
                let index = clampedLives;
                index < this.currentLives;
                index += 1
            ) {
                if (index < visibleSlots) {
                    this.lifeBalls[index].visible = true;
                    this.restoreLifeBallBaseScale(index);
                    if (!this.pendingLifeLossIndices.includes(index)) {
                        this.pendingLifeLossIndices.push(index);
                    }
                }
            }
        } else if (clampedLives > this.currentLives) {
            for (let index = this.currentLives; index < clampedLives; index += 1) {
                this.lifeLossAnimations.delete(index);
                this.lifeBalls[index].visible = true;
                this.restoreLifeBallBaseScale(index);
            }
        }

        this.currentLives = clampedLives;

        for (let index = 0; index < this.lifeBalls.length; index += 1) {
            this.sockets[index].visible = index < visibleSlots;

            if (
                !this.lifeLossAnimations.has(index) &&
                !this.pendingLifeLossIndices.includes(index)
            ) {
                this.lifeBalls[index].visible = index < clampedLives;
                this.restoreLifeBallBaseScale(index);
            }
        }
    }

    public playPendingLifeLossAnimation(): void {
        for (const index of this.pendingLifeLossIndices.splice(0)) {
            const ball = this.lifeBalls[index];
            if (!ball) continue;

            ball.visible = true;
            this.restoreLifeBallBaseScale(index);
            this.lifeLossAnimations.set(index, 0);
        }
    }

    /**
     * Uses unscaled frame time. Life-loss feedback therefore remains readable
     * while the world itself runs at the death-feedback slow-motion scale.
     */
    public update(deltaTime: number): void {
        const dt = Math.max(0, deltaTime);
        const popDuration = Math.max(
            0.001,
            this.definition.lifeLossPopDurationSeconds,
        );
        const shrinkDuration = Math.max(
            0.001,
            this.definition.lifeLossShrinkDurationSeconds,
        );
        const totalDuration = popDuration + shrinkDuration;

        for (const [index, previousElapsed] of [...this.lifeLossAnimations]) {
            const elapsed = previousElapsed + dt;
            const ball = this.lifeBalls[index];

            if (!ball) {
                this.lifeLossAnimations.delete(index);
                continue;
            }

            if (elapsed < popDuration) {
                const t = elapsed / popDuration;
                const scale =
                    1 +
                    (this.definition.lifeLossPopScale - 1) *
                    this.easeOutCubic(t);
                this.applyLifeBallScaleMultiplier(index, scale);
            } else {
                const t = Math.min(
                    1,
                    (elapsed - popDuration) / shrinkDuration,
                );
                this.applyLifeBallScaleMultiplier(index, 1 - this.easeInCubic(t));
            }

            if (elapsed >= totalDuration) {
                this.applyLifeBallScaleMultiplier(index, 0);
                ball.visible = false;
                this.lifeLossAnimations.delete(index);
            } else {
                this.lifeLossAnimations.set(index, elapsed);
            }
        }
    }

    private restoreLifeBallBaseScale(index: number): void {
        this.applyLifeBallScaleMultiplier(index, 1);
    }

    private applyLifeBallScaleMultiplier(
        index: number,
        multiplier: number,
    ): void {
        const ball = this.lifeBalls[index];
        if (!ball) {
            return;
        }

        const baseScale =
            this.lifeBallBaseScales[index] ??
            ball.scale.x;

        ball.scale.set(
            baseScale * Math.max(0, multiplier),
        );
    }

    private easeOutCubic(value: number): number {
        const t = Math.max(0, Math.min(1, value));
        return 1 - Math.pow(1 - t, 3);
    }

    private easeInCubic(value: number): number {
        const t = Math.max(0, Math.min(1, value));
        return t * t * t;
    }

    public layout(
        viewportWidth: number,
        _viewportHeight: number,
    ): void {
        this.root.position.set(
            viewportWidth -
                this.definition.rightMargin -
                this.definition.holderWidth,
            this.definition.topMargin,
        );
        for (let index = 0; index < this.lifeBalls.length; index += 1) {
            this.lifeBallBaseScales[index] = this.lifeBalls[index].scale.x;
        }
    }

    public getContainer(): Container {
        return this.root;
    }

    public destroy(): void {
        this.root.destroy({
            children: true,
        });

        this.sockets.length = 0;
        this.lifeBalls.length = 0;
    }
}
