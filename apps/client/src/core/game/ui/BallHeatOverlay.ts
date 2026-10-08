import { Graphics } from "pixi.js";
import type { Ball } from "../entities/Ball";
import {
    DEFAULT_BALL_FIRE_HEAT_DEFINITION,
} from "../config/BallFireHeatDefinition";

/** Presentation-only red heat wash attached directly to the Ball actor. */
export class BallHeatOverlay {
    private readonly graphic = new Graphics();

    constructor(ball: Ball) {
        const definition = DEFAULT_BALL_FIRE_HEAT_DEFINITION;
        this.graphic
            .circle(0, 0, ball.getRadius())
            .fill({ color: definition.overlayColor });
        this.graphic.alpha = 0;
        this.graphic.eventMode = "none";
        ball.getContainer().addChild(this.graphic);
    }

    public setHeat(normalizedHeat: number): void {
        const heat = Math.min(1, Math.max(0, normalizedHeat));
        this.graphic.alpha =
            heat * DEFAULT_BALL_FIRE_HEAT_DEFINITION.overlayMaximumAlpha;
    }

    public destroy(): void {
        this.graphic.destroy();
    }
}
