import type { World } from "../world/World";
import type { Robot } from "../entities/robots/Robot";
import type { AudioVoiceHandle } from "./AudioDefinition";
import { SpatialAudioManager } from "./SpatialAudioManager";
import { WATER_WIND_AUDIO } from "./WaterWindAudioDefinition";

interface FillingEmitter {
    robot: Robot;
    voice: AudioVoiceHandle | null;
    position: { x: number; y: number };
    previousDepth: number;
    activeSeconds: number;
    gain: number;
    wasGrowing: boolean;
}
/** Optional low-volume layer: only water jets depositing into growing puddles. */
export class WaterFillingAudioController {
    private readonly emitters = new Map<Robot, FillingEmitter>();
    private elapsed = 0;
    constructor(private readonly world: World, private readonly audio: SpatialAudioManager) {}
    public update(dt: number): void {
        const cfg = WATER_WIND_AUDIO.filling;
        if (!cfg.enabled) { this.dispose(); return; }
        const step = Math.max(0, dt);
        this.elapsed += step;
        if (this.elapsed < cfg.sampleIntervalSeconds) {
            for (const emitter of this.emitters.values()) emitter.voice?.update();
            return;
        }
        const seconds = this.elapsed; this.elapsed = 0;
        const field = this.world.getWaterField();
        const activeRobots = this.world.getAudioRobots().filter(robot => robot.getWaterWindAttackAudioState().kind === "water" && robot.getWaterWindAttackAudioState().active);
        for (const [robot, emitter] of this.emitters) {
            if (!activeRobots.includes(robot)) { emitter.voice?.stop(); this.emitters.delete(robot); }
        }
        for (const robot of activeRobots) {
            const attack = robot.getWaterAttackSource();
            if (!attack?.isJetActive()) continue;
            const nozzle = attack.getNozzlePosition();
            const heading = attack.getNozzleDirectionRadians();
            let bestDepth = 0, bestX = nozzle.x, bestY = nozzle.y;
            for (const distance of cfg.sampleDistances) {
                const x = nozzle.x + Math.cos(heading) * distance;
                const y = nozzle.y + Math.sin(heading) * distance;
                const depth = field.getDepthAt(x, y);
                if (depth > bestDepth) { bestDepth = depth; bestX = x; bestY = y; }
            }
            let emitter = this.emitters.get(robot);
            if (!emitter) {
                emitter = { robot, voice: null, position: { x: bestX, y: bestY }, previousDepth: bestDepth,
                    activeSeconds: 0, gain: 0, wasGrowing: false };
                this.emitters.set(robot, emitter);
            }
            const growing = bestDepth >= cfg.minimumDepth && bestDepth - emitter.previousDepth >= cfg.minimumGrowth;
            emitter.previousDepth = bestDepth;
            emitter.position.x = bestX; emitter.position.y = bestY;
            emitter.activeSeconds = growing ? emitter.activeSeconds + seconds : Math.max(0, emitter.activeSeconds - seconds);
            emitter.wasGrowing = growing;
            const target = emitter.activeSeconds >= cfg.armSeconds ? cfg.gain : 0;
            const fade = target > emitter.gain ? cfg.fadeInSeconds : cfg.fadeOutSeconds;
            emitter.gain += (target - emitter.gain) * Math.min(1, seconds / Math.max(0.001, fade));
            if (!emitter.voice && target > 0 && this.activeVoiceCount() < cfg.maxEmitters) {
                emitter.voice = this.audio.playLoop("water-filling-ground", () => emitter!.position, 0);
            }
            if (emitter.voice) {
                emitter.voice.setGain(emitter.gain);
                emitter.voice.update();
                if (target === 0 && emitter.gain < 0.008) { emitter.voice.stop(); emitter.voice = null; }
            }
        }
    }
    private activeVoiceCount(): number { return [...this.emitters.values()].filter(e => e.voice !== null).length; }
    public dispose(): void { for (const emitter of this.emitters.values()) emitter.voice?.stop(); this.emitters.clear(); }
}
