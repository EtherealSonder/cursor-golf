import type { Ball, BallImpactEvent } from "../entities/Ball";
import type { World } from "../world/World";
import type { SpatialAudioManager } from "./SpatialAudioManager";
import { BALL_MECHANISM_AUDIO as C } from "./BallMechanismAudioDefinition";

/** Receives authoritative mechanism events; does not repeat collision detection. */
export class BallMechanismAudioController {
    private readonly unsubscribe: Array<() => void> = [];
    private readonly cooldown = new Map<string, number>();
    private wasCapturing = false;
    constructor(private readonly ball: Ball, private readonly world: World, private readonly audio: SpatialAudioManager) {
        this.unsubscribe.push(world.subscribeBallMechanismAudio(event => {
            if (event.kind === "bush") {
                if (!this.ball.isStickyBallActive()) this.emit("golf-ball-bush", "bush", event.x, event.y, 1, C.bushCooldownMs);
                return;
            }
            if (this.ball.isStickyBallActive()) return;
            const id = event.kind === "rotator" ? "golf-ball-wall-impact" : "golf-ball-bumper";
            const speed = event.speed ?? C.fullImpactSpeed;
            if (speed < C.minimumImpactSpeed) return;
            const t = Math.min(1, Math.max(0, (speed - C.minimumImpactSpeed) / (C.fullImpactSpeed - C.minimumImpactSpeed)));
            this.emit(id, event.kind, event.x, event.y, 0.25 + 0.75 * Math.sqrt(t), C.impactCooldownMs);
        }));
        this.unsubscribe.push(ball.subscribeToImpacts((event: BallImpactEvent) => {
            if (ball.isStickyBallActive() || !event.colliderId || !this.world.isRadialBumperCollider(event.colliderId)) return;
            const speed = event.normalImpactSpeed ?? event.impactSpeed;
            if (speed < C.minimumImpactSpeed) return;
            this.emit("golf-ball-bumper", `radial:${event.colliderId}`, event.contactX ?? ball.getX(), event.contactY ?? ball.getY(), Math.min(1, Math.max(0.3, speed / C.fullImpactSpeed)), C.impactCooldownMs);
        }));
    }
    private emit(id: "golf-ball-bumper" | "golf-ball-bush" | "golf-ball-wall-impact", key: string, x: number, y: number, gain: number, cooldown: number): void {
        const now = performance.now();
        if (now - (this.cooldown.get(key) ?? -Infinity) < cooldown) return;
        this.cooldown.set(key, now);
        this.audio.play(id, { position: { x, y }, gain });
    }
    public update(): void {
        const capturing = this.ball.isBeingCaptured() || this.ball.isHoled();
        if (capturing && !this.wasCapturing) this.audio.play("golf-ball-holed", { position: { x: this.ball.getX(), y: this.ball.getY() } });
        this.wasCapturing = capturing;
    }
    public dispose(): void { for (const off of this.unsubscribe) off(); this.unsubscribe.length = 0; this.cooldown.clear(); }
}
