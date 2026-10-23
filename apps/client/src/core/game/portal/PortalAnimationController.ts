/** Ping-pong animation: 0..15..0..15 without duplicated endpoints. */
export class PortalAnimationController {
    private frame = 0;
    private direction: 1 | -1 = 1;
    private elapsed = 0;
    constructor(private readonly frameCount: number, private readonly fps: number) {}
    public getFrameIndex(): number { return this.frame; }
    public update(dt: number): boolean {
        if (this.frameCount < 2 || dt <= 0) return false;
        this.elapsed += Math.min(dt, 0.25);
        const interval = 1 / this.fps;
        let changed = false;
        while (this.elapsed >= interval) {
            this.elapsed -= interval;
            this.frame += this.direction;
            if (this.frame >= this.frameCount - 1) { this.frame = this.frameCount - 1; this.direction = -1; }
            else if (this.frame <= 0) { this.frame = 0; this.direction = 1; }
            changed = true;
        }
        return changed;
    }
}
