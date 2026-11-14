import type { WorldModifierId } from "../world-modifiers/WorldModifierDefinition";
import type { AudioSoundId, AudioVoiceHandle } from "./AudioDefinition";
import { SpatialAudioManager } from "./SpatialAudioManager";
import { WORLD_MODIFIER_AMBIENCE as CFG } from "./WorldModifierAmbienceDefinition";

type Ambience = { id: AudioSoundId; handle: AudioVoiceHandle; level: number; target: number };
/** Weather audio stays centred and independent of camera position. */
export class WorldModifierAmbienceController {
    private readonly tracks: Ambience[] = [];
    private selected: AudioSoundId | null = null;
    public constructor(private readonly audio: SpatialAudioManager) {}

    public update(modifier: WorldModifierId | null, dt: number): void {
        const desired: AudioSoundId | null = modifier === "downpour" ? "world-modifier-downpour"
            : modifier === "gale-force" ? "world-modifier-galewind" : null;
        if (desired !== this.selected) {
            this.selected = desired;
            if (desired) void this.audio.preload(desired);
        }
        const seconds = Number.isFinite(dt) ? Math.max(0, Math.min(dt, 0.1)) : 0;
        // Exclude weather voices themselves when measuring competing sound activity.
        const competing = this.audio.getActiveVoiceCountExcluding(["world-modifier-downpour", "world-modifier-galewind"]);
        const fraction = Math.max(0, Math.min(1, (competing - CFG.duckStartVoices) / (CFG.duckFullVoices - CFG.duckStartVoices)));
        const duck = 1 - fraction * (1 - CFG.minimumDuckMultiplier);
        if (desired && !this.tracks.some(t => t.id === desired)) {
            const handle = this.audio.playGlobalLoop(desired, 0);
            if (handle) this.tracks.push({ id: desired, handle, level: 0, target: 0 });
        }
        for (let i = this.tracks.length - 1; i >= 0; i--) {
            const track = this.tracks[i];
            const base = track.id === "world-modifier-downpour" ? CFG.downpourGain : CFG.galeForceGain;
            const wanted = track.id === desired ? base * duck : 0;
            const duration = wanted > track.level ? (track.id === desired && track.target > wanted ? CFG.duckAttackSeconds : CFG.fadeInSeconds)
                : track.id !== desired ? CFG.fadeOutSeconds : CFG.duckAttackSeconds;
            const recovery = wanted > track.level && track.target > 0 ? CFG.duckReleaseSeconds : duration;
            const speed = Math.max(0.001, wanted > track.level ? recovery : duration);
            track.level += (wanted - track.level) * (1 - Math.exp(-seconds * 4 / speed));
            track.target = wanted;
            track.handle.setGain(track.level);
            if (track.id !== desired && track.level < 0.002) {
                track.handle.stop(); this.tracks.splice(i, 1);
            }
        }
    }
    public dispose(): void { for (const track of this.tracks) track.handle.stop(); this.tracks.length = 0; this.selected = null; }
}
