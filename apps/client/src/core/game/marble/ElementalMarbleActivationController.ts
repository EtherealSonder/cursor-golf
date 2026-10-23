/** Qualifies a real launch and accumulates travelled path length before settling. */
export class ElementalMarbleActivationController {
    public static readonly launchSpeed = 160;
    public static readonly requiredTravel = 100;
    public static readonly settlingSpeed = 18;
    public static readonly settlingSeconds = 0.5;
    private launched = false;
    private distance = 0;
    private settledFor = 0;
    private lastX: number;
    private lastY: number;
    private completed = false;

    constructor(x: number, y: number) { this.lastX = x; this.lastY = y; }
    public update(dt: number, x: number, y: number, vx: number, vy: number): boolean {
        if (this.completed) return false;
        const speed = Math.hypot(vx, vy);
        const step = Math.hypot(x - this.lastX, y - this.lastY);
        this.lastX = x; this.lastY = y;
        if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(step) || !Number.isFinite(speed)) return false;
        if (speed >= ElementalMarbleActivationController.launchSpeed) this.launched = true;
        if (!this.launched) return false;
        // Count path length only after a qualifying launch; include rebounds and turns.
        this.distance += step;
        if (this.distance < ElementalMarbleActivationController.requiredTravel) return false;
        this.settledFor = speed < ElementalMarbleActivationController.settlingSpeed
            ? this.settledFor + dt : 0;
        if (this.settledFor < ElementalMarbleActivationController.settlingSeconds) return false;
        this.completed = true;
        return true;
    }
}
