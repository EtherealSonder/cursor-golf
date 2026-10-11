/** Short-lived death immunity after the retry iris finishes reopening. */
export class BallRetryProtectionController {
    public static readonly DEFAULT_DURATION_SECONDS = 0.75;
    private remainingSeconds = 0;

    public start(durationSeconds = BallRetryProtectionController.DEFAULT_DURATION_SECONDS): void {
        this.remainingSeconds = Number.isFinite(durationSeconds)
            ? Math.max(0, durationSeconds) : 0;
    }

    public update(deltaTimeSeconds: number): void {
        if (Number.isFinite(deltaTimeSeconds) && deltaTimeSeconds > 0) {
            this.remainingSeconds = Math.max(0, this.remainingSeconds - deltaTimeSeconds);
        }
    }

    public reset(): void { this.remainingSeconds = 0; }
    public get isActive(): boolean { return this.remainingSeconds > 0; }
    public get remaining(): number { return this.remainingSeconds; }
}
