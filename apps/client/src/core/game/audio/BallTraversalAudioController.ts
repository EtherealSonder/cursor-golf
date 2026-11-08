import type { Ball } from "../entities/Ball";
import type { SpatialAudioManager } from "./SpatialAudioManager";
import { BALL_TRAVERSAL_AUDIO as CONFIG } from "./BallTraversalAudioDefinition";

type Terrain = "water" | "sand" | "none";
const SPLASH_IDS = ["golf-ball-water-splash-1", "golf-ball-water-splash-2", "golf-ball-water-splash-3"] as const;
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const interval = (min: number, max: number): number => min + Math.random() * (max - min);

/** Event-driven distance scheduling. Never plays on every physics tick or pixel. */
export class BallTraversalAudioController {
    private lastPosition: { x: number; y: number } | null = null;
    private terrain: Terrain = "none";
    private travelled = 0;
    private nextDistance = 0;
    private elapsed = 10;
    private lastSplash = -1;
    private disposed = false;

    constructor(private readonly ball: Ball, private readonly audio: SpatialAudioManager) {}

    public update(deltaTime: number): void {
        if (this.disposed || !Number.isFinite(deltaTime) || deltaTime <= 0) return;
        const snapshot = this.ball.getTraversalAudioSnapshot();
        const position = { x: snapshot.x, y: snapshot.y };
        const previous = this.lastPosition;
        this.lastPosition = position;
        if (!snapshot.active || !previous) { this.resetTerrain(); return; }
        const movement = Math.hypot(position.x - previous.x, position.y - previous.y);
        if (!Number.isFinite(movement) || movement > CONFIG.teleportDistance) { this.resetTerrain(); return; }
        const terrain: Terrain = snapshot.inStandingWater ? "water" : snapshot.onSand ? "sand" : "none";
        const config = terrain === "water" ? CONFIG.water : CONFIG.sand;
        const moving = terrain !== "none" && snapshot.speed >= config.minimumSpeed && movement > 0.001;
        if (!moving) { this.resetTerrain(); return; }
        const entered = this.terrain !== terrain;
        if (entered) {
            this.terrain = terrain;
            this.travelled = 0;
            this.elapsed = 10;
            this.nextDistance = interval(config.distanceMin, config.distanceMax);
            if (terrain === "water") {
                this.emitWater(position, snapshot.speed, config.entryGain);
                this.elapsed = 0;
            }
        }
        this.travelled += movement;
        this.elapsed += deltaTime;
        if (this.travelled < this.nextDistance || this.elapsed < config.cooldownSeconds) return;
        // One event maximum per frame, even for high-speed movement.
        this.travelled = Math.max(0, this.travelled - this.nextDistance);
        this.nextDistance = interval(config.distanceMin, config.distanceMax);
        this.elapsed = 0;
        if (terrain === "water") this.emitWater(position, snapshot.speed, 1);
        else this.emitSand(position, snapshot.speed);
    }

    private emitWater(position: { x: number; y: number }, speed: number, multiplier: number): void {
        const candidates = [0, 1, 2].filter(index => index !== this.lastSplash);
        const choice = candidates[Math.floor(Math.random() * candidates.length)];
        this.lastSplash = choice;
        const settings = CONFIG.water;
        const gain = (settings.minimumGain + (1 - settings.minimumGain) * clamp((speed - settings.minimumSpeed) / (settings.fullGainSpeed - settings.minimumSpeed), 0, 1)) * multiplier;
        this.audio.play(SPLASH_IDS[choice], { position, gain, playbackRate: 1 + (Math.random() * 2 - 1) * settings.rateVariation });
    }

    private emitSand(position: { x: number; y: number }, speed: number): void {
        const settings = CONFIG.sand;
        const gain = settings.minimumGain + (1 - settings.minimumGain) * clamp((speed - settings.minimumSpeed) / (settings.fullGainSpeed - settings.minimumSpeed), 0, 1);
        this.audio.play("golf-ball-sand", { position, gain, playbackRate: 1 + (Math.random() * 2 - 1) * settings.rateVariation });
    }

    private resetTerrain(): void { this.terrain = "none"; this.travelled = 0; this.nextDistance = 0; this.elapsed = 10; }
    public reset(): void { this.lastPosition = null; this.resetTerrain(); }
    public dispose(): void { this.disposed = true; this.reset(); }
}
