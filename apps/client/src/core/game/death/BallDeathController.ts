import {
    DEFAULT_BALL_DEATH_DEFINITION,
} from "../config/BallDeathDefinition";
import type { BallDeathDefinition } from "../config/BallDeathDefinition";
import type { BallDeathEvent } from "./BallDeathEvent";
import type { BallDeathCause } from "./BallDeathCause";
import { BallLifeState } from "./BallLifeState";
import {
    BallRetryResult,
} from "./BallRetryRequest";
import type { BallRetryRequest } from "./BallRetryRequest";

export interface BallDeathStateSnapshot {
    readonly state: BallLifeState;
    readonly currentLives: number;
    readonly maximumLives: number;
    readonly activeDeath: BallDeathEvent | null;
}

export type BallDeathStateListener = (
    snapshot: BallDeathStateSnapshot,
) => void;

/**
 * Authoritative owner of Ball life/death state.
 *
 * Hazard systems may request a death, but only this controller may accept it
 * and consume a life. Requests received while the Ball is not Alive are
 * rejected, preventing overlapping hazards from consuming multiple lives.
 */
export class BallDeathController {
    private readonly definition: BallDeathDefinition;
    private readonly listeners = new Set<BallDeathStateListener>();

    private state = BallLifeState.Alive;
    private currentLives: number;
    private nextDeathId = 1;
    private activeDeath: BallDeathEvent | null = null;
    private dyingElapsedSeconds = 0;

    constructor(
        definition: BallDeathDefinition = DEFAULT_BALL_DEATH_DEFINITION,
    ) {
        this.definition = definition;
        this.validateDefinition();
        this.currentLives = definition.startingLives;
    }

    private validateDefinition(): void {
        if (
            this.definition.maximumLives <= 0 ||
            this.definition.startingLives <= 0 ||
            this.definition.startingLives > this.definition.maximumLives ||
            this.definition.dyingDurationSeconds < 0
        ) {
            throw new Error("BallDeathDefinition contains invalid values.");
        }
    }

    public requestDeath(cause: BallDeathCause): BallDeathEvent | null {
        if (this.state !== BallLifeState.Alive) {
            return null;
        }

        const livesBefore = this.currentLives;
        this.currentLives = Math.max(0, this.currentLives - 1);

        const event: BallDeathEvent = Object.freeze({
            deathId: this.nextDeathId,
            cause,
            livesBefore,
            livesAfter: this.currentLives,
        });

        this.nextDeathId += 1;
        this.activeDeath = event;
        this.state = BallLifeState.Dying;
        this.dyingElapsedSeconds = 0;
        this.emit();
        return event;
    }

    public update(deltaTimeSeconds: number): void {
        if (this.state !== BallLifeState.Dying) {
            return;
        }

        this.dyingElapsedSeconds += Math.max(0, deltaTimeSeconds);
        if (this.dyingElapsedSeconds < this.definition.dyingDurationSeconds) {
            return;
        }

        this.state =
            this.currentLives > 0 ||
            this.definition.continueRetryAtZeroLives
                ? BallLifeState.AwaitingRetry
                : BallLifeState.GameOver;
        this.emit();
    }

    public createRetryRequest(): BallRetryRequest | null {
        if (
            this.state !== BallLifeState.AwaitingRetry ||
            !this.activeDeath
        ) {
            return null;
        }

        return Object.freeze({ deathId: this.activeDeath.deathId });
    }

    public acceptRetry(request: BallRetryRequest): BallRetryResult {
        if (this.state === BallLifeState.GameOver) {
            return BallRetryResult.GameOver;
        }
        if (this.state !== BallLifeState.AwaitingRetry || !this.activeDeath) {
            return BallRetryResult.NotAwaitingRetry;
        }
        if (request.deathId !== this.activeDeath.deathId) {
            return BallRetryResult.StaleDeath;
        }

        this.activeDeath = null;
        this.state = BallLifeState.Alive;
        this.dyingElapsedSeconds = 0;
        this.emit();
        return BallRetryResult.Accepted;
    }

    public getSnapshot(): BallDeathStateSnapshot {
        return Object.freeze({
            state: this.state,
            currentLives: this.currentLives,
            maximumLives: this.definition.maximumLives,
            activeDeath: this.activeDeath,
        });
    }

    public subscribe(listener: BallDeathStateListener): () => void {
        this.listeners.add(listener);
        listener(this.getSnapshot());
        return () => this.listeners.delete(listener);
    }

    private emit(): void {
        const snapshot = this.getSnapshot();
        for (const listener of this.listeners) {
            listener(snapshot);
        }
    }

    public destroy(): void {
        this.listeners.clear();
    }
}
