import type { Ball } from "../entities/Ball";
import type { World } from "../world/World";
import type { SpatialAudioManager } from "./SpatialAudioManager";
import { BALL_MECHANISM_AUDIO as C } from "./BallMechanismAudioDefinition";

/** One shared rolling loop across paddle and conveyor contact transitions. */
export class BallPlatformAudioController {
    private loop: { update: () => void; stop: () => void } | null = null;
    private contactLostFor = 0;
    constructor(private readonly ball: Ball, private readonly world: World, private readonly audio: SpatialAudioManager) {}
    public update(dt: number): void {
        if (!(dt > 0)) return;
        const active = this.ball.isAvailableForInteraction() && !this.ball.isStickyBallActive() && !this.ball.isStickyBallAttached()
            && this.ball.getSpeed() >= C.rollMinimumSpeed && this.world.isBallOnPoweredPlatform();
        if (active) this.contactLostFor = 0;
        else this.contactLostFor += dt;
        if (active && !this.loop) {
            this.loop = this.audio.playLoop("golf-ball-roll", () => ({ x: this.ball.getX(), y: this.ball.getY() }));
        }
        if (this.loop && this.contactLostFor > C.rollContactGraceSeconds) { this.loop.stop(); this.loop = null; }
        this.loop?.update();
    }
    public dispose(): void { this.loop?.stop(); this.loop = null; }
}
