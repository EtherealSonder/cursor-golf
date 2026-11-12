import type { World } from "../world/World";
import type { Robot } from "../entities/robots/Robot";
import type { AudioSoundId, AudioVoiceHandle } from "./AudioDefinition";
import { SpatialAudioManager } from "./SpatialAudioManager";
import { WATER_WIND_AUDIO } from "./WaterWindAudioDefinition";

/** Robot attack source state is authoritative, including cancellation and overdrive. */
export class RobotWaterWindAudioController {
    private readonly loops = new Map<Robot, { id: AudioSoundId; voice: AudioVoiceHandle }>();
    constructor(private readonly world: World, private readonly audio: SpatialAudioManager) {}
    public update(): void {
        const robots = this.world.getAudioRobots();
        for (const [robot, entry] of this.loops) {
            if (!robots.includes(robot) || !robot.getWaterWindAttackAudioState().active) {
                entry.voice.stop(); this.loops.delete(robot);
            }
        }
        for (const robot of robots) {
            const state = robot.getWaterWindAttackAudioState();
            if (!state.active || !state.kind) continue;
            const id: AudioSoundId = state.kind === "water" ? "robot-water-attack" : "robot-wind-attack";
            const current = this.loops.get(robot);
            if (current && current.id !== id) { current.voice.stop(); this.loops.delete(robot); }
            let loop = this.loops.get(robot)?.voice;
            if (!loop) {
                loop = this.audio.playLoop(id, () => {
                    const snapshot = robot.getWaterWindAttackAudioState();
                    return snapshot.active ? { x: snapshot.x, y: snapshot.y } : null;
                }, state.kind === "water" ? WATER_WIND_AUDIO.waterRobot.gain : WATER_WIND_AUDIO.windRobot.gain) ?? undefined;
                if (loop) this.loops.set(robot, { id, voice: loop });
            }
            loop?.update();
        }
    }
    public dispose(): void { for (const entry of this.loops.values()) entry.voice.stop(); this.loops.clear(); }
}
