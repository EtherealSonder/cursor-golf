import { Graphics } from "pixi.js";

import { Entity } from "./Entity";

export class Ball extends Entity {
    private graphics: Graphics | null = null;

    protected onInitialize(): void {
        this.graphics = new Graphics();

        this.graphics.circle(0, 0, 10);
        this.graphics.fill(0xffffff);

        this.container.position.set(500, 300);

        this.container.addChild(this.graphics);
    }

    protected onUpdate(deltaTime: number): void {
        void deltaTime;
    }

    protected onDestroy(): void {
        this.graphics?.destroy();

        this.graphics = null;

        this.container.destroy({
            children: true,
        });
    }
}