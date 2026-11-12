import type { World } from "../world/World";
import type { Robot } from "../entities/robots/Robot";
import type { AudioVoiceHandle } from "./AudioDefinition";
import { SpatialAudioManager } from "./SpatialAudioManager";
import { FIRE_AUDIO } from "./FireAudioDefinition";

/** The fire attack state, not a separate audio timer, owns loop lifetime. */
export class RobotFireAudioController {
    private readonly loops = new Map<Robot, AudioVoiceHandle>();
    constructor(private readonly world: World, private readonly audio: SpatialAudioManager) {}
    public update(): void {
        const robots = this.world.getAudioFireRobots();
        for (const [robot, loop] of this.loops) {
            if (!robots.includes(robot) || !robot.getFireAttackAudioState().active) {
                loop.stop(); this.loops.delete(robot);
            }
        }
        for (const robot of robots) {
            if (!robot.getFireAttackAudioState().active) continue;
            let loop = this.loops.get(robot);
            if (!loop) {
                loop = this.audio.playLoop("robot-fire-attack", () => {
                    const state = robot.getFireAttackAudioState();
                    return state.active ? { x: state.x, y: state.y } : null;
                }, FIRE_AUDIO.robot.gain) ?? undefined;
                if (loop) this.loops.set(robot, loop);
            }
            loop?.update();
        }
    }
    public dispose(): void { for (const loop of this.loops.values()) loop.stop(); this.loops.clear(); }
}
