export interface BallWaterSplashEvent {
    readonly worldX: number;
    readonly worldY: number;
    readonly velocityX: number;
    readonly velocityY: number;
    readonly ballSpeed: number;
    readonly waterDepth: number;
    readonly waterCoverage: number;
    readonly intensity: number;
}

export type BallWaterSplashListener = (
    event: BallWaterSplashEvent,
) => void;
