import type {
    BallWaterSplashEvent,
} from "../physics/water/BallWaterSplashEvent";

import {
    WaterImpactTier,
} from "./WaterImpactIntensityModel";

import type {
    BallCircularSplashVfxRequest,
    WaterImpactVfxRequest,
} from "./WaterImpactVfxSystem";

import {
    WaterImpactVfxSystem,
} from "./WaterImpactVfxSystem";

/**
 * 8I-8D presentation-only bridge for authoritative Ball/Water splash events.
 *
 * The Ball/Water gameplay layer remains the sole authority for detecting an
 * entry splash and calculating its event data. This adapter only maps that
 * event into the existing shared 8I-7 Water-impact presentation system.
 */
export class BallSplashVfx {
    private lastEvent:
        Readonly<BallWaterSplashEvent> | null =
        null;

    private lastRequest:
        Readonly<WaterImpactVfxRequest> | null =
        null;

    private lastCircularRequest:
        Readonly<BallCircularSplashVfxRequest> | null =
        null;

    private consumedEventCount = 0;

    public constructor(
        private readonly impactVfxSystem?:
            WaterImpactVfxSystem,
    ) {}

    public consume(
        event: Readonly<BallWaterSplashEvent>,
    ): void {
        this.lastEvent = {
            worldX: event.worldX,
            worldY: event.worldY,
            velocityX: event.velocityX,
            velocityY: event.velocityY,
            ballSpeed: event.ballSpeed,
            waterDepth: event.waterDepth,
            waterCoverage: event.waterCoverage,
            intensity: event.intensity,
        };

        this.consumedEventCount += 1;

        const request =
            this.createImpactRequest(
                event,
            );

        this.lastRequest =
            request;

        const circularRequest =
            this.createCircularSplashRequest(
                event,
                request.seed,
            );

        this.lastCircularRequest =
            circularRequest;

        this.impactVfxSystem
            ?.emitBallCircularSplash(
                circularRequest,
            );
    }

    public getLastEvent():
        Readonly<BallWaterSplashEvent> | null {
        return this.lastEvent;
    }

    public getLastRequest():
        Readonly<WaterImpactVfxRequest> | null {
        return this.lastRequest;
    }

    public getLastCircularRequest():
        Readonly<BallCircularSplashVfxRequest> | null {
        return this.lastCircularRequest;
    }

    public getConsumedEventCount(): number {
        return this.consumedEventCount;
    }

    public reset(): void {
        this.lastEvent = null;
        this.lastRequest = null;
        this.lastCircularRequest = null;
        this.consumedEventCount = 0;
    }

    private createImpactRequest(
        event:
            Readonly<BallWaterSplashEvent>,
    ): WaterImpactVfxRequest {

        const intensity =
            this.clamp01(
                event.intensity,
            );

        const coverage =
            this.clamp01(
                event.waterCoverage,
            );

        const depthStrength =
            this.clamp01(
                event.waterDepth /
                0.12,
            );

        const speedStrength =
            this.clamp01(
                event.ballSpeed /
                500,
            );

        /*
         * Ball entry should read as a broad lateral/backward displacement,
         * rather than the narrower source-impact language used by Hose and
         * Sprinkler impacts.
         */
        const directionalBias =
            this.lerp(
                0.34,
                0.68,
                speedStrength,
            );

        const breadth =
            this.lerp(
                0.82,
                1.55,
                coverage,
            );

        const bodyStrength =
            this.lerp(
                0.78,
                1.48,
                depthStrength,
            );

        const energeticDisplacement =
            this.lerp(
                0.82,
                1.55,
                speedStrength,
            );

        const overallScale =
            this.lerp(
                0.78,
                1.38,
                intensity,
            );

        return {
            x:
                event.worldX,

            y:
                event.worldY,

            directionX:
                event.velocityX,

            directionY:
                event.velocityY,

            speed:
                Math.max(
                    0,
                    event.ballSpeed,
                ),

            normalizedIntensity:
                intensity,

            tier:
                this.resolveTier(
                    intensity,
                ),

            seed:
                this.createSeed(
                    event,
                ),

            directionalBias,

            breadth,

            bodyStrength,

            energeticDisplacement,

            overallScale,
        };
    }

    private createCircularSplashRequest(
        event:
            Readonly<BallWaterSplashEvent>,

        seed:
            number,
    ): BallCircularSplashVfxRequest {

        return {
            x:
                event.worldX,
            y:
                event.worldY,
            speed:
                Math.max(
                    0,
                    event.ballSpeed,
                ),
            normalizedDepth:
                this.clamp01(
                    event.waterDepth /
                    0.12,
                ),
            coverage:
                this.clamp01(
                    event.waterCoverage,
                ),
            intensity:
                this.clamp01(
                    event.intensity,
                ),
            seed,
            isEntry:
                true,
        };
    }

    private resolveTier(
        intensity:
            number,
    ): WaterImpactTier {

        if (
            intensity >=
            0.67
        ) {
            return WaterImpactTier.Heavy;
        }

        if (
            intensity >=
            0.34
        ) {
            return WaterImpactTier.Medium;
        }

        return WaterImpactTier.Fine;
    }

    private createSeed(
        event:
            Readonly<BallWaterSplashEvent>,
    ): number {

        const x =
            Math.round(
                event.worldX *
                10,
            );

        const y =
            Math.round(
                event.worldY *
                10,
            );

        const speed =
            Math.round(
                event.ballSpeed *
                10,
            );

        const intensity =
            Math.round(
                this.clamp01(
                    event.intensity,
                ) *
                1000,
            );

        return (
            Math.imul(
                x,
                73856093,
            ) ^
            Math.imul(
                y,
                19349663,
            ) ^
            Math.imul(
                speed,
                83492791,
            ) ^
            intensity
        ) >>> 0;
    }

    private lerp(
        from:
            number,

        to:
            number,

        amount:
            number,
    ): number {

        return (
            from +
            (
                to -
                from
            ) *
            this.clamp01(
                amount,
            )
        );
    }

    private clamp01(
        value:
            number,
    ): number {

        if (
            !Number.isFinite(
                value,
            )
        ) {
            return 0;
        }

        return Math.max(
            0,
            Math.min(
                1,
                value,
            ),
        );
    }
}
