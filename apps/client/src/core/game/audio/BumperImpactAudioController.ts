import type { World } from "../world/World";
import type { SpatialAudioManager } from "./SpatialAudioManager";
import { BALL_MECHANISM_AUDIO as C } from "./BallMechanismAudioDefinition";

/** Plays only authoritative powered bumper impacts, for ball and rigid bodies alike. */
export class BumperImpactAudioController {
    private readonly lastImpact = new Map<string, number>();
    private readonly unsubscribe: () => void;
    constructor(world: World, private readonly audio: SpatialAudioManager) {
        this.unsubscribe = world.subscribeBumperImpactAudio(({ bumperId, objectId, x, y, speed }) => {
            if (speed < C.minimumImpactSpeed) return;
            const key = `${bumperId}:${objectId}`;
            const now = performance.now();
            if (now - (this.lastImpact.get(key) ?? -Infinity) < C.impactCooldownMs) return;
            this.lastImpact.set(key, now);
            const t = Math.min(1, Math.max(0, (speed - C.minimumImpactSpeed) / (C.fullImpactSpeed - C.minimumImpactSpeed)));
            this.audio.play("golf-ball-bumper", { position: { x, y }, gain: 0.25 + 0.75 * Math.sqrt(t) });
        });
    }
    public dispose(): void { this.unsubscribe(); this.lastImpact.clear(); }
}
