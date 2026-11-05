import { Container, Sprite } from "pixi.js";
import { AssetLoader } from "../../rendering/AssetLoader";
import { INVINCIBLE_BALL } from "../config/InvincibleBallDefinition";
/** Overlay only. Existing shell and rolling dimple tile stay underneath the shield. */
export class InvincibleBallVisual {
    private readonly container = new Container();
    private readonly ring: Sprite;
    private readonly shield: Sprite;
    private elapsed = 0;

    constructor(diameter: number) {
        this.ring = new Sprite(AssetLoader.getTexture("golfBallInvincibleRing"));
        this.ring.anchor.set(0.5);
        this.ring.width = diameter * INVINCIBLE_BALL.ringDiameterRatio;
        this.ring.height = diameter * INVINCIBLE_BALL.ringDiameterRatio;
        this.shield = new Sprite(AssetLoader.getTexture("golfBallInvincibleLogo"));
        this.shield.anchor.set(0.5);
        this.shield.width = diameter * INVINCIBLE_BALL.shieldDiameterRatio;
        this.shield.height = diameter * INVINCIBLE_BALL.shieldDiameterRatio;
        this.container.addChild(this.ring, this.shield);
    }

    public getContainer(): Container { return this.container; }
    public update(dt: number): void {
        this.elapsed += Math.max(0, Number.isFinite(dt) ? dt : 0);
        this.ring.rotation = this.elapsed * Math.PI * 2 * INVINCIBLE_BALL.ringRevolutionsPerSecond;
        const wave = (1 + Math.sin(this.elapsed * Math.PI * 2 / INVINCIBLE_BALL.shieldPulseCycleSeconds)) / 2;
        this.shield.alpha = INVINCIBLE_BALL.shieldMinimumAlpha + (1 - INVINCIBLE_BALL.shieldMinimumAlpha) * wave;
    }
    public destroy(): void { this.container.destroy({ children: true }); }
}
