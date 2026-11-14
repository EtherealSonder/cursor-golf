/** Tracks subscriptions owned by the active level, releasing them in reverse order. */
export class LevelRuntimeBindings {
    private readonly cleanups: Array<() => void> = [];
    public track(cleanup: () => void): () => void {
        this.cleanups.push(cleanup);
        return () => {
            const index = this.cleanups.indexOf(cleanup);
            if (index >= 0) this.cleanups.splice(index, 1);
            cleanup();
        };
    }
    public clear(): void {
        for (const cleanup of this.cleanups.splice(0).reverse()) cleanup();
    }
}
