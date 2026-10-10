/** Presentation-only color cycling. The tint target is constructed once by World. */
export interface BackgroundTintTarget {
    tint: number;
}

export class CourseBackgroundAnimator {
    private elapsedSeconds = 0;
    private readonly palette: readonly number[];
    private readonly transitionSeconds: number;

    public constructor(
        private readonly target: BackgroundTintTarget,
        palette: readonly number[],
        transitionSeconds: number,
    ) {
        if (palette.length < 2 || !palette.every(c => Number.isInteger(c) && c >= 0 && c <= 0xffffff)) {
            throw new Error("Course background requires at least two valid RGB colors.");
        }
        if (!Number.isFinite(transitionSeconds) || transitionSeconds <= 0) {
            throw new Error("Course background transition duration must be positive.");
        }
        this.palette = [...palette];
        this.transitionSeconds = transitionSeconds;
        this.target.tint = this.palette[0];
    }

    public update(deltaTimeSeconds: number): void {
        if (!Number.isFinite(deltaTimeSeconds) || deltaTimeSeconds <= 0) return;
        const total = this.palette.length * this.transitionSeconds;
        this.elapsedSeconds = (this.elapsedSeconds + deltaTimeSeconds) % total;
        const position = this.elapsedSeconds / this.transitionSeconds;
        const index = Math.floor(position);
        const next = (index + 1) % this.palette.length;
        // Cosine easing yields zero velocity at each palette stop.
        const fraction = position - index;
        const t = (1 - Math.cos(Math.PI * fraction)) / 2;
        const a = this.palette[index], b = this.palette[next];
        const channel = (shift: number) => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
        this.target.tint = (channel(16) << 16) | (channel(8) << 8) | channel(0);
    }
}
