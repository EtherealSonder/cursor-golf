import type { World } from "../world/World";
import type { AudioVoiceHandle } from "./AudioDefinition";
import { SpatialAudioManager } from "./SpatialAudioManager";
import { WORLD_MECHANISM_AUDIO as D } from "./WorldMechanismAudioDefinition";
/** Mine pulse events originate from the LED/VFX clock, not an independent timer. */
export class MineAudioController {
    private readonly explosions: Array<{ voice: AudioVoiceHandle; lethal: boolean; remaining: number }> = [];
    constructor(private readonly world: World, private readonly audio: SpatialAudioManager) {}
    public update(realDeltaSeconds: number, gameplayTimeScale: number): void {
        const events = this.world.consumeMineAudioEvents();
        for (const pulse of events.pulses) this.audio.play("mine-beep", { position: pulse, gain: D.mine.beepGain });
        for (const event of events.explosions) {
            const voice = this.audio.playControlled("mine-explosion", { position: event, gain: D.mine.explosionGain });
            if (voice) this.explosions.push({ voice, lethal: event.lethal, remaining: 8 });
        }
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const item = this.explosions[i];
            item.remaining -= Math.max(0, realDeltaSeconds);
            if (item.remaining <= 0) { this.explosions.splice(i, 1); continue; }
            item.voice.setPlaybackRate(item.lethal ? Math.max(D.mine.lethalExplosionMinimumRate, gameplayTimeScale) : 1);
            item.voice.update();
        }
    }
    public dispose(): void { for (const item of this.explosions) item.voice.stop(); this.explosions.length = 0; }
}
