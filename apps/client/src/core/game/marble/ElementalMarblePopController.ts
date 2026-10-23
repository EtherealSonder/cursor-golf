/** 0.28s pop: expand to 1.2x, then collapse to zero. */
export class ElementalMarblePopController {
    private elapsed = 0;
    private finished = false;
    public static readonly duration = 0.28;
    public update(dt: number): { scale: number; complete: boolean } {
        if (this.finished) return { scale: 0, complete: false };
        this.elapsed = Math.min(ElementalMarblePopController.duration, this.elapsed + Math.max(0, Number.isFinite(dt) ? dt : 0));
        const t = this.elapsed / ElementalMarblePopController.duration;
        const scale = t < 0.28 ? 1 + 0.2 * t / 0.28 : 1.2 * (1 - (t - 0.28) / 0.72) ** 2;
        if (t >= 1) { this.finished = true; return { scale: 0, complete: true }; }
        return { scale, complete: false };
    }
}
