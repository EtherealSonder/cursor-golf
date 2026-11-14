import type { BallDeathController } from "../death/BallDeathController";
import type { BallEffectController } from "../ball-effects/BallEffectController";
import type { GameSessionState } from "./GameSessionState";

/** Captures persistent values while leaving the controllers as their authoritative owners. */
export class GameSessionController {
    private saved: GameSessionState | null = null;

    public capture(death: BallDeathController | null, effects: BallEffectController): GameSessionState | null {
        if (!death) return null;
        const state: GameSessionState = {
            lives: death.getSnapshot().currentLives,
            effect: effects.getSnapshot().active,
        };
        this.saved = state;
        return state;
    }

    public restore(death: BallDeathController | null, effects: BallEffectController): void {
        if (!this.saved || !death) return;
        death.restoreForNewLevel(this.saved.lives);
        effects.apply(this.saved.effect);
        this.saved = null;
    }

    public clear(): void { this.saved = null; }
}
