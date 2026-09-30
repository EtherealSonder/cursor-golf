import type { BallDeathCause } from "./BallDeathCause";

/** Immutable record emitted exactly once for each accepted Ball death. */
export interface BallDeathEvent {
    readonly deathId: number;
    readonly cause: BallDeathCause;
    readonly livesBefore: number;
    readonly livesAfter: number;
}
