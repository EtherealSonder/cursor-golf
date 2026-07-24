export class EngineLoop {
    private animationFrameId: number | null = null;
    private lastFrameTime = 0;

    private updateCallback: ((deltaTime: number) => void) | null = null;

    public setUpdateCallback(callback: (deltaTime: number) => void): void {
        this.updateCallback = callback;
    }

    public start(): void {
        this.stop();

        this.lastFrameTime = performance.now();

        this.animationFrameId = requestAnimationFrame(this.loop);
    }

    public stop(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        this.lastFrameTime = 0;
    }

    private loop = (currentTime: number): void => {
        const deltaTime = (currentTime - this.lastFrameTime) / 1000;

        this.lastFrameTime = currentTime;

        if (this.updateCallback !== null) {
            this.updateCallback(deltaTime);
        }

        this.animationFrameId = requestAnimationFrame(this.loop);
    };
}