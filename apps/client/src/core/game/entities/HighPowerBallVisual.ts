import { Assets, Container, Sprite, Texture } from "pixi.js";
import shellUrl from "../../../assets/sprites/golf/golf_ball_highpower.png";
import logoUrl from "../../../assets/sprites/golf/golf_ball_highpower_logo.png";
import { HIGH_POWER_BALL } from "../config/HighPowerBallDefinition";

/** Presentation only. Does not alter ball dimensions or collision physics. */
export class HighPowerBallVisual {
    private readonly container = new Container();
    private readonly shell: Sprite;
    private readonly logo: Sprite;
    private elapsed = 0;
    private disposed = false;

    constructor(diameter: number) {
        // Texture.from() only checks the cache. Load both Vite-resolved URLs
        // explicitly before assigning them to the sprites.
        this.shell = new Sprite(Texture.EMPTY);
        this.shell.anchor.set(0.5);
        this.shell.width = diameter;
        this.shell.height = diameter;
        this.container.addChild(this.shell);

        this.logo = new Sprite(Texture.EMPTY);
        this.logo.anchor.set(0.5);
        this.logo.width = diameter * 0.68;
        this.logo.height = diameter * 0.68;
        this.container.addChild(this.logo);

        void Promise.all([Assets.load<Texture>(shellUrl), Assets.load<Texture>(logoUrl)])
            .then(([shellTexture, logoTexture]) => {
                if (this.disposed) return;
                this.shell.texture = shellTexture;
                this.shell.width = diameter;
                this.shell.height = diameter;
                this.logo.texture = logoTexture;
                this.logo.width = diameter * 0.68;
                this.logo.height = diameter * 0.68;
            })
            .catch((error: unknown) => {
                console.error("[HighPowerBallVisual] Failed to load ball artwork", error);
            });
    }

    public getContainer(): Container { return this.container; }

    public update(dt: number): void {
        this.elapsed += Math.max(0, Number.isFinite(dt) ? dt : 0);
        const wave = (1 + Math.sin(this.elapsed * Math.PI * 2 / HIGH_POWER_BALL.pulseCycleSeconds)) / 2;
        this.logo.alpha = HIGH_POWER_BALL.pulseMinimumAlpha + (1 - HIGH_POWER_BALL.pulseMinimumAlpha) * wave;
    }

    public destroy(): void {
        this.disposed = true;
        this.container.destroy({ children: true });
    }
}
