import type { BallDeathController } from "../death/BallDeathController";
import type { GameSessionState } from "./GameSessionState";

/** Captures persistent values while leaving the controllers as their authoritative owners. */
export class GameSessionController {
    private saved: GameSessionState | null = null;

    public capture(death: BallDeathController | null): GameSessionState | null {
        if (!death) return null;
        const state: GameSessionState = {
            lives: death.getSnapshot().currentLives,
        };
        this.saved = state;
        return state;
    }

    public restore(death: BallDeathController | null): void {
        if (!this.saved || !death) return;
        death.restoreForNewLevel(this.saved.lives);
        this.saved = null;
    }

    public clear(): void { this.saved = null; }
}
