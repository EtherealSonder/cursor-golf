import type { World } from "../world/World";
import type { Fan } from "../entities/mechanisms/Fan";
import type { AudioVoiceHandle } from "./AudioDefinition";
import { SpatialAudioManager } from "./SpatialAudioManager";
import { WORLD_MECHANISM_AUDIO as D } from "./WorldMechanismAudioDefinition";
/** Quiet continuous wind, updated at the fan's actual spatial location. */
export class FanAudioController {
    private readonly loops = new Map<Fan, AudioVoiceHandle>();
    constructor(private readonly world: World, private readonly audio: SpatialAudioManager) {}
    public update(): void {
        const fans = this.world.getFans();
        for (const [fan, loop] of this.loops) if (!fans.includes(fan) || !fan.getAudioOperatingState().active) { loop.stop(); this.loops.delete(fan); }
        for (const fan of fans) {
            const state = fan.getAudioOperatingState();
            if (!state.active) continue;
            let loop = this.loops.get(fan);
            if (!loop) { loop = this.audio.playLoop("fan-wind", () => ({ x: fan.getX(), y: fan.getY() }), D.fan.gain) ?? undefined; if (loop) this.loops.set(fan, loop); }
            if (loop) { loop.setPlaybackRate(Math.min(D.fan.maximumRate, Math.max(0.8, state.speedRatio))); loop.update(); }
        }
    }
    public dispose(): void { for (const loop of this.loops.values()) loop.stop(); this.loops.clear(); }
}
