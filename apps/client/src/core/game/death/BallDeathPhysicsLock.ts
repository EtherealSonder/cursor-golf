/** Single authority for death-time physics isolation. Relocation is explicitly permitted. */
export class BallDeathPhysicsLock {
    private locked = false;
    private anchorX = 0;
    private anchorY = 0;
    public engage(x: number, y: number): void {
        if (this.locked) return;
        this.anchorX = x; this.anchorY = y; this.locked = true;
    }
    public get isLocked(): boolean { return this.locked; }
    public get anchor(): Readonly<{x: number; y: number}> { return {x: this.anchorX, y: this.anchorY}; }
    public relocate(x: number, y: number): void { this.anchorX = x; this.anchorY = y; }
    public release(): void { this.locked = false; }
}
