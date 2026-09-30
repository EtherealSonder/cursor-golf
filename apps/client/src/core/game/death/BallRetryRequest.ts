export interface BallRetryRequest {
    readonly deathId: number;
}

export enum BallRetryResult {
    Accepted = "accepted",
    NotAwaitingRetry = "not_awaiting_retry",
    StaleDeath = "stale_death",
    GameOver = "game_over",
}
