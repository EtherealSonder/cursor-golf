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

        // Zero lives is a valid development state during D-3. Keep every
        // socket visible while hiding all Ball sprites, and never allow a
        // negative count to leak into presentation.
        const clampedLives = Math.min(
            visibleSlots,
            Math.max(0, Math.floor(currentLives)),
        );

        for (let index = 0; index < this.lifeBalls.length; index += 1) {
            this.sockets[index].visible = index < visibleSlots;
            this.lifeBalls[index].visible = index < clampedLives;
        }
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
