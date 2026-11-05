import { Container, Graphics } from "pixi.js";
import { STICKY_BALL_SPLASH } from "../config/StickyBallSplashDefinition";

interface SplashInstance { readonly graphic: Graphics; readonly x: number; readonly y: number; age: number; }
/** Small, presentation-only world-space bursts; no per-frame allocations of Graphics. */
export class StickyBallSplash {
    private readonly container = new Container();
    private readonly active: SplashInstance[] = [];
    public getContainer(): Container { return this.container; }
    public getActiveCount(): number { return this.active.length; }
    public emit(x: number, y: number): void {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        if (this.active.length >= STICKY_BALL_SPLASH.maximumActive) return;
        const graphic = new Graphics();
        // A deterministic angular layout avoids flickering and makes visual tests reproducible.
        for (let i = 0; i < STICKY_BALL_SPLASH.dropletCount; i++) {
            const a = (i / STICKY_BALL_SPLASH.dropletCount) * Math.PI * 2;
            const distance = STICKY_BALL_SPLASH.minimumDistance +
                (STICKY_BALL_SPLASH.maximumDistance - STICKY_BALL_SPLASH.minimumDistance) * ((i % 3) / 2);
            const r = STICKY_BALL_SPLASH.minimumRadius +
                (STICKY_BALL_SPLASH.maximumRadius - STICKY_BALL_SPLASH.minimumRadius) * ((i % 2) ? 1 : 0.4);
            graphic.circle(Math.cos(a) * distance, Math.sin(a) * distance, r)
                .fill(STICKY_BALL_SPLASH.colors[i % STICKY_BALL_SPLASH.colors.length]);
        }
        graphic.circle(0, 0, 5).fill(STICKY_BALL_SPLASH.colors[0]);
        graphic.position.set(x, y);
        graphic.scale.set(0.35);
        this.container.addChild(graphic);
        this.active.push({ graphic, x, y, age: 0 });
    }
    public update(deltaSeconds: number): void {
        const dt = Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0);
        for (let i = this.active.length - 1; i >= 0; i--) {
            const instance = this.active[i];
            instance.age += dt;
            const progress = Math.min(1, instance.age / STICKY_BALL_SPLASH.lifetimeSeconds);
            instance.graphic.scale.set(0.35 + 0.65 * (1 - Math.pow(1 - progress, 3)));
            instance.graphic.alpha = 1 - progress * progress;
            if (progress >= 1) {
                this.container.removeChild(instance.graphic);
                instance.graphic.destroy();
                this.active.splice(i, 1);
            }
        }
    }
    public clear(): void {
        for (const instance of this.active) { this.container.removeChild(instance.graphic); instance.graphic.destroy(); }
        this.active.length = 0;
    }
    public destroy(): void { this.clear(); this.container.destroy(); }
}
