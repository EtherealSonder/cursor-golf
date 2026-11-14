import type { BallEffectSelection } from "../ball-effects/BallEffectDefinition";

/** Only intentional cross-level data. Never store World or controller references. */
export interface GameSessionState {
    readonly lives: number;
    readonly effect: BallEffectSelection;
}
