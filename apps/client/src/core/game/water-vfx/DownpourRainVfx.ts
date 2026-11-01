import { Container, Graphics } from "pixi.js";
import { DOWNPOUR_CONFIG as C } from "../world-modifiers/DownpourConfig";

interface View { x: number; y: number; width: number; height: number; }
interface Impact {
    readonly graphic: Graphics;
    x: number;
    y: number;
    age: number;
    lifetime: number;
    radius: number;
    active: boolean;
}
/** WM-4B: fixed pool of locally drawn ripple/splash graphics. No physics or per-frame redraw. */
export class DownpourRainVfx {
    private readonly container = new Container();
    private readonly pool: Impact[] = [];
    private accumulator = 0;
    private frameAccumulator = 0;
    private enabled = false;
    public constructor(private readonly validPosition: (x: number, y: number) => boolean) {
        for (let i = 0; i < C.maximumImpacts; i++) {
            const graphic = new Graphics();
            graphic.visible = false;
            this.container.addChild(graphic);
            this.pool.push({ graphic, x: 0, y: 0, age: 0, lifetime: 1, radius: 1, active: false });
        }
    }
    public getContainer(): Container { return this.container; }
    public setEnabled(enabled: boolean): void {
        if (this.enabled === enabled) return;
        this.enabled = enabled;
        this.container.visible = enabled;
        if (!enabled) {
            this.accumulator = 0;
            this.frameAccumulator = 0;
            for (const hit of this.pool) this.release(hit);
        }
    }
    private release(hit: Impact): void {
        hit.active = false;
        hit.graphic.visible = false;
    }
    private spawn(hit: Impact, x: number, y: number): void {
        const splash = Math.random() >= C.rippleChance;
        hit.active = true;
        hit.x = x;
        hit.y = y;
        hit.age = 0;
        hit.lifetime = splash
            ? C.splashLifetimeMin + Math.random() * (C.splashLifetimeMax - C.splashLifetimeMin)
            : C.rippleLifetimeMin + Math.random() * (C.rippleLifetimeMax - C.rippleLifetimeMin);
        hit.radius = splash
            ? C.splashRadiusMin + Math.random() * (C.splashRadiusMax - C.splashRadiusMin)
            : C.rippleRadiusMin + Math.random() * (C.rippleRadiusMax - C.rippleRadiusMin);
        const graphic = hit.graphic;
        graphic.clear();
        graphic.circle(0, 0, hit.radius).stroke({ color: 0xE4FAFF, alpha: 1, width: 2.1 });
        graphic.circle(0, 0, hit.radius * 0.55).stroke({ color: 0x61C9F5, alpha: 0.9, width: 1.2 });
        if (splash) {
            for (let i = 0; i < 4; i++) {
                const angle = i * Math.PI / 2 + 0.35;
                graphic.circle(Math.cos(angle) * hit.radius, Math.sin(angle) * hit.radius, 1.2)
                    .fill({ color: 0xD8F4FF, alpha: 0.75 });
            }
        }
        graphic.position.set(x, y);
        graphic.scale.set(0.35);
        graphic.alpha = 0.95;
        graphic.visible = true;
    }
    public update(dt: number, view: View): void {
        if (!this.enabled || !Number.isFinite(dt) || dt <= 0 || view.width <= 0 || view.height <= 0) return;
        // Limit accumulated work after a paused or throttled frame.
        this.frameAccumulator = Math.min(this.frameAccumulator + dt, 0.1);
        const interval = 1 / C.rainVfxUpdateHz;
        if (this.frameAccumulator < interval) return;
        const step = this.frameAccumulator;
        this.frameAccumulator = 0;
        const inset = 4;
        for (const hit of this.pool) {
            if (!hit.active) continue;
            hit.age += step;
            if (hit.age >= hit.lifetime || hit.x < view.x - inset || hit.y < view.y - inset ||
                hit.x > view.x + view.width + inset || hit.y > view.y + view.height + inset) {
                this.release(hit);
                continue;
            }
            const t = hit.age / hit.lifetime;
            hit.graphic.scale.set(0.35 + 0.65 * t);
            hit.graphic.alpha = (1 - t) * 0.95;
        }
        this.accumulator = Math.min(this.accumulator + step * C.impactsPerSecond, 2);
        while (this.accumulator >= 1) {
            this.accumulator -= 1;
            const free = this.pool.find(hit => !hit.active);
            if (!free) { this.accumulator = 0; break; }
            const x = view.x + inset + Math.random() * Math.max(0, view.width - inset * 2);
            const y = view.y + inset + Math.random() * Math.max(0, view.height - inset * 2);
            if (this.validPosition(x, y)) {
                this.spawn(free, x, y);
            } else {
            }
        }
    }
    public destroy(): void {
        this.pool.length = 0;
        this.container.destroy({ children: true });
    }
}
