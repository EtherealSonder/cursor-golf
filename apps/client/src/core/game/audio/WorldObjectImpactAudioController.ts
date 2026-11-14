import type { World } from "../world/World";
import type { SpatialAudioManager } from "./SpatialAudioManager";

/** Presentation-only adapter for authoritative rigid-body contacts. */
export class WorldObjectImpactAudioController {
    private readonly last = new Map<string, number>();
    private readonly unsubscribe: () => void;
    constructor(world: World, private readonly audio: SpatialAudioManager) {
        this.unsubscribe = world.subscribeObjectAudio(event => {
            if (event.sound === "portal-teleport") return;
            if (!Number.isFinite(event.speed) || event.speed < 30) return;
            const now = performance.now();
            if (now - (this.last.get(event.key) ?? -Infinity) < 120) return;
            this.last.set(event.key, now);
            const gain = Math.min(1, 0.2 + Math.sqrt(Math.min(1, (event.speed - 30) / 550)) * 0.8);
            this.audio.play(event.sound, { position: { x: event.x, y: event.y }, gain });
            if (this.last.size > 1024) this.last.clear();
        });
    }
    dispose(): void { this.unsubscribe(); this.last.clear(); }
}
