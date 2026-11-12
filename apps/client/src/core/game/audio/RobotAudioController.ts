import type { World } from "../world/World";
import type { Robot } from "../entities/robots/Robot";
import type { AudioVoiceHandle } from "./AudioDefinition";
import { SpatialAudioManager } from "./SpatialAudioManager";
import { WORLD_MECHANISM_AUDIO as D } from "./WorldMechanismAudioDefinition";
interface RobotAudioState { loop: AudioVoiceHandle | null; targetId: string | null; previousPhase: string; }
/** Robot's own locomotion phase and target tracking are authoritative. */
export class RobotAudioController {
    private readonly states = new Map<Robot, RobotAudioState>();
    constructor(private readonly world: World, private readonly audio: SpatialAudioManager) {}
    public update(): void {
        const robots = this.world.getAudioRobots();
        for (const [robot, state] of this.states) if (!robots.includes(robot)) { state.loop?.stop(); this.states.delete(robot); }
        for (const robot of robots) {
            let state = this.states.get(robot);
            if (!state) { state = { loop: null, targetId: null, previousPhase: "PLANTED" }; this.states.set(robot, state); }
            const snapshot = robot.getAudioState();
            if (snapshot.targetId && snapshot.targetId !== state.targetId) {
                this.audio.play("robot-detected", { position: { x: robot.getX(), y: robot.getY() }, gain: D.robot.detectionGain });
            }
            state.targetId = snapshot.targetId;
            if (!snapshot.walking) { state.loop?.stop(); state.loop = null; state.previousPhase = snapshot.gaitPhase; continue; }
            if (!state.loop) state.loop = this.audio.playLoop("robot-walk", () => ({ x: robot.getX(), y: robot.getY() }), D.robot.walkGain);
            if (state.loop) {
                state.loop.setPlaybackRate(Math.min(D.robot.maximumRate, Math.max(D.robot.minimumRate, snapshot.speedRatio * D.robot.rateCalibration)));
                state.loop.update();
            }
            state.previousPhase = snapshot.gaitPhase;
        }
    }
    public dispose(): void { for (const state of this.states.values()) state.loop?.stop(); this.states.clear(); }
}
