import type { World } from "../world/World";
import type { Sprinkler } from "../entities/mechanisms/Sprinkler";
import type { AudioVoiceHandle } from "./AudioDefinition";
import { SpatialAudioManager } from "./SpatialAudioManager";
import { WATER_WIND_AUDIO } from "./WaterWindAudioDefinition";

/** Persistent sound follows each emitting sprinkler, including moving sprinklers. */
export class SprinklerAudioController {
    private readonly loops = new Map<Sprinkler, AudioVoiceHandle>();
    constructor(private readonly world: World, private readonly audio: SpatialAudioManager) {}
    public update(): void {
        const sprinklers = this.world.getAudioSprinklers();
        for (const [sprinkler, loop] of this.loops) {
            if (!sprinklers.includes(sprinkler) || !sprinkler.isEnabled() || sprinkler.isDestroyed() || sprinkler.isSuctionCapturing()) {
                loop.stop(); this.loops.delete(sprinkler);
            }
        }
        for (const sprinkler of sprinklers) {
            if (!sprinkler.isEnabled() || sprinkler.isDestroyed() || sprinkler.isSuctionCapturing()) continue;
            let loop = this.loops.get(sprinkler);
            if (!loop) {
                loop = this.audio.playLoop("water-sprinkler", () => ({ x: sprinkler.getX(), y: sprinkler.getY() }), WATER_WIND_AUDIO.sprinkler.gain) ?? undefined;
                if (loop) this.loops.set(sprinkler, loop);
            }
            loop?.update();
        }
    }
    public dispose(): void { for (const loop of this.loops.values()) loop.stop(); this.loops.clear(); }
}
