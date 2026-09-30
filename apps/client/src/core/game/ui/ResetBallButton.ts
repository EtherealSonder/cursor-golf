import {
    Container,
    Graphics,
} from "pixi.js";

import {
    DEFAULT_RESET_BALL_BUTTON_DEFINITION,
} from "../config/GameHudDefinition";

import type {
    ResetBallButtonDefinition,
} from "../config/GameHudDefinition";

/**
 * Temporary PixiJS reset control.
 *
 * It deliberately owns no reset/gameplay logic. The caller supplies the
 * action so the button remains a screen-space presentation component.
 */
export class ResetBallButton {

    private readonly root:
        Container;

    private readonly definition:
        ResetBallButtonDefinition;

    private readonly onReset:
        () => void;

    constructor(
        onReset: () => void,
        definition:
            ResetBallButtonDefinition =
            DEFAULT_RESET_BALL_BUTTON_DEFINITION,
    ) {
        this.definition =
            definition;

        this.onReset =
            onReset;

        this.root =
            new Container();

        this.root.label =
            "ResetBallButton";

        this.createPresentation();
        this.configureInteraction();
        this.layout();
    }

    private createPresentation(): void {
        const definition =
            this.definition;

        const radius =
            definition.diameter * 0.5;

        const background =
            new Graphics()
                .circle(
                    0,
                    0,
                    radius,
                )
                .fill({
                    color:
                        definition.backgroundColor,
                    alpha:
                        definition.backgroundAlpha,
                })
                .stroke({
                    color:
                        definition.outlineColor,
                    width:
                        definition.outlineWidth,
                });

        const icon =
            new Graphics();

        /*
         * Counter-clockwise reset arc. The separate triangular arrow head
         * keeps the symbol readable at the small HUD size.
         */
        icon
            .arc(
                1,
                1,
                radius * 0.48,
                -0.18 * Math.PI,
                1.42 * Math.PI,
            )
            .stroke({
                color:
                    definition.iconColor,
                width:
                    definition.iconWidth,
                cap:
                    "round",
            });

        icon
            .poly([
                -radius * 0.50,
                -radius * 0.18,
                -radius * 0.08,
                -radius * 0.31,
                -radius * 0.18,
                radius * 0.08,
            ])
            .fill({
                color:
                    definition.iconColor,
            });

        this.root.addChild(
            background,
            icon,
        );
    }

    private configureInteraction(): void {
        this.root.eventMode =
            "static";

        this.root.cursor =
            "pointer";

        this.root.on(
            "pointerover",
            () => {
                this.root.scale.set(
                    this.definition.hoverScale,
                );
            },
        );

        this.root.on(
            "pointerout",
            () => {
                this.root.scale.set(
                    1,
                );
            },
        );

        this.root.on(
            "pointerdown",
            () => {
                this.root.scale.set(
                    this.definition.pressedScale,
                );
            },
        );

        this.root.on(
            "pointerup",
            () => {
                this.root.scale.set(
                    this.definition.hoverScale,
                );
            },
        );

        this.root.on(
            "pointerupoutside",
            () => {
                this.root.scale.set(
                    1,
                );
            },
        );

        this.root.on(
            "pointertap",
            () => {
                this.onReset();
            },
        );
    }

    private layout(): void {
        const radius =
            this.definition.diameter * 0.5;

        this.root.position.set(
            this.definition.left + radius,
            this.definition.top + radius,
        );
    }

    public getContainer(): Container {
        return this.root;
    }

    public destroy(): void {
        this.root.removeAllListeners();

        this.root.destroy({
            children: true,
        });
    }
}
