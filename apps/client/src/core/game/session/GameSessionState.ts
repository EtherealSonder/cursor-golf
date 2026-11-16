
/** Only intentional cross-level data. Never store World or controller references. */
export interface GameSessionState {
    readonly lives: number;
}
