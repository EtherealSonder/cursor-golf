import { Graphics } from "pixi.js";

import { Entity } from "./Entity";

export enum BallInteractionState {
    Normal,
    Hovered,
    Dragging,
}

export class Ball extends Entity {
    private ballGraphics: Graphics | null = null;

    private readonly radius = 10;

    private interactionState = BallInteractionState.Normal;

    protected onInitialize(): void {
        this.ballGraphics = new Graphics();

        this.container.position.set(500, 300);

        this.container.addChild(this.ballGraphics);

        this.drawBall();
    }

    protected onUpdate(deltaTime: number): void {
        void deltaTime;
    }

    protected onDestroy(): void {
        this.ballGraphics?.destroy();

        this.ballGraphics = null;

        this.container.destroy({
            children: true,
        });
    }

    public getRadius(): number {
        return this.radius;
    }

    public getInteractionState(): BallInteractionState {
        return this.interactionState;
    }

    public setInteractionState(state: BallInteractionState): void {
        if (this.interactionState === state) {
            return;
        }

        this.interactionState = state;

        this.drawBall();
    }

    // ------------------------------------------------------------------------
    // Temporary compatibility methods.
    // These will be removed after the AimIndicator is introduced.
    // ------------------------------------------------------------------------

    public setAimVector(dx: number, dy: number): void {
        void dx;
        void dy;
    }

    public clearAimVector(): void {
        // Intentionally empty.
    }

    private drawBall(): void {
        if (!this.ballGraphics) {
            return;
        }

        this.ballGraphics.clear();

        this.ballGraphics.circle(0, 0, this.radius);

        switch (this.interactionState) {
            case BallInteractionState.Normal:
                this.ballGraphics.fill(0xffffff);
                break;

            case BallInteractionState.Hovered:
                this.ballGraphics.fill(0xffd54a);
                break;

            case BallInteractionState.Dragging:
                this.ballGraphics.fill(0xff8c00);
                break;
        }
    }
}