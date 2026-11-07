/** A lightweight adapter: gameplay ownership stays with World. */
export interface HoleCaptureTarget {
    readonly id: string;
    readonly radius: number;
    getX(): number;
    getY(): number;
    getVelocityX(): number;
    getVelocityY(): number;
    isAvailable(): boolean;
    applyAttraction(deltaVelocityX: number, deltaVelocityY: number): void;
    beginCapture(): void;
    moveTo(x: number, y: number): void;
    setScale(scale: number): void;
    remove(): void;
}
