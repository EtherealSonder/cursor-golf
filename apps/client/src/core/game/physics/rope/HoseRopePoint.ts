export class HoseRopePoint {
    public x: number;
    public y: number;
    public previousX: number;
    public previousY: number;

    constructor(
        public readonly index: number,
        x: number,
        y: number,
        public readonly inverseMass: number,
    ) {
        this.x = x;
        this.y = y;
        this.previousX = x;
        this.previousY = y;
    }

    public isFixed(): boolean {
        return this.inverseMass <= 0;
    }

    public setPosition(x: number, y: number, preserveVelocity = false): void {
        this.x = x;
        this.y = y;
        if (!preserveVelocity) {
            this.previousX = x;
            this.previousY = y;
        }
    }

    public getVelocity(deltaTime: number): { readonly x: number; readonly y: number } {
        if (deltaTime <= 0) return { x: 0, y: 0 };
        return {
            x: (this.x - this.previousX) / deltaTime,
            y: (this.y - this.previousY) / deltaTime,
        };
    }

    public applyVelocityDelta(deltaVelocityX: number, deltaVelocityY: number, deltaTime: number): void {
        if (this.isFixed() || deltaTime <= 0) return;
        this.previousX -= deltaVelocityX * deltaTime;
        this.previousY -= deltaVelocityY * deltaTime;
    }
}
