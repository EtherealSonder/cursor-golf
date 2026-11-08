import type { Ball, BallImpactEvent } from "../entities/Ball";
import type { StickyBallAttachmentController } from "../ball-effects/StickyBallAttachmentController";
import type { SpatialAudioManager } from "./SpatialAudioManager";
import { BALL_COLLISION_AUDIO as C, classifyBallCollider } from "./BallCollisionAudioDefinition";

/** Presentation-only event adapter. Never changes collision or sticky physics. */
export class BallCollisionAudioController {
    private readonly unsubscribers: Array<() => void> = [];
    private readonly lastPlayed = new Map<string, number>();
    constructor(ball: Ball, sticky: StickyBallAttachmentController, private readonly audio: SpatialAudioManager) {
        this.unsubscribers.push(ball.subscribeToImpacts(event => this.onImpact(ball, event)));
        this.unsubscribers.push(sticky.onAttached(event => {
            const now = performance.now();
            const key = "sticky:" + event.targetId;
            if (now - (this.lastPlayed.get(key) ?? -Infinity) < C.stickyCooldownMs) return;
            this.lastPlayed.set(key, now);
            this.audio.play("golf-ball-sticky-impact", { position: { x: event.x, y: event.y } });
        }));
    }
    private onImpact(ball: Ball, event: BallImpactEvent): void {
        // Sticky attachments are announced separately by the authoritative attachment controller.
        // Suppress all ordinary collisions while the debuff is active, including non-attaching hits.
        if (ball.isStickyBallActive()) return;
        const sound = classifyBallCollider(event.type, event.colliderId);
        if (!sound || /(?:radial.?bumper|directional.?bumper)/i.test(event.colliderId ?? "")) return;
        const speed = event.normalImpactSpeed ?? event.impactSpeed;
        if (!Number.isFinite(speed) || speed < C.minimumNormalSpeed) return;
        const key = `${sound}:${event.colliderId ?? event.type}`;
        const now = performance.now();
        if (now - (this.lastPlayed.get(key) ?? -Infinity) < C.sameColliderCooldownMs) return;
        this.lastPlayed.set(key, now);
        const fraction = Math.min(1, Math.max(0, (speed - C.minimumNormalSpeed) / (C.fullGainNormalSpeed - C.minimumNormalSpeed)));
        // A glancing collision has a low normal speed even when the ball is moving fast.
        // Use a smooth intensity curve for both amplitude and pitch on material impacts.
        const intensity = Math.sqrt(fraction);
        const gain = C.minimumGain + (C.maximumGain - C.minimumGain) * intensity;
        const materialImpact = sound === "golf-ball-wall-impact" || sound === "golf-ball-metal-hit";
        const playbackRate = materialImpact
            ? C.minimumImpactPlaybackRate + (C.maximumImpactPlaybackRate - C.minimumImpactPlaybackRate) * intensity
            : 1;
        this.audio.play(sound, {
            position: { x: event.contactX ?? ball.getX(), y: event.contactY ?? ball.getY() },
            gain,
            playbackRate,
        });
        if (this.lastPlayed.size > 512) this.lastPlayed.clear();
    }
    public dispose(): void {
        for (const unsubscribe of this.unsubscribers) unsubscribe();
        this.unsubscribers.length = 0;
        this.lastPlayed.clear();
    }
}
