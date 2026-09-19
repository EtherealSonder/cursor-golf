import type {
    AirborneWaterPresentationImpact,
} from "../environment/AirborneWaterSystem";

export interface HoseImpactContactSample {
    readonly x: number;
    readonly y: number;
    readonly velocityX: number;
    readonly velocityY: number;
    readonly waterAmount: number;
    readonly impactCount: number;
}

/**
 * 8I-7G presentation-only accumulator for continuous Hose ground contact.
 *
 * Authoritative impacts remain owned by AirborneWaterSystem. This class only
 * smooths recent presentation samples so a continuous Hose jet does not create
 * one disconnected large splash for every packet.
 */
export class HoseImpactContactState {
    private active = false;
    private ageSinceImpact = 0;
    private x = 0;
    private y = 0;
    private velocityX = 0;
    private velocityY = 0;
    private accumulatedWaterAmount = 0;
    private impactCount = 0;

    public constructor(
        private readonly timeoutSeconds: number,
        private readonly positionSmoothing: number,
    ) {}

    public addImpact(
        impact: Readonly<AirborneWaterPresentationImpact>,
    ): void {
        const smoothing = this.clamp01(this.positionSmoothing);

        if (!this.active) {
            this.x = impact.positionX;
            this.y = impact.positionY;
            this.velocityX = impact.velocityX;
            this.velocityY = impact.velocityY;
            this.active = true;
        } else {
            this.x = this.lerp(this.x, impact.positionX, smoothing);
            this.y = this.lerp(this.y, impact.positionY, smoothing);
            this.velocityX = this.lerp(
                this.velocityX,
                impact.velocityX,
                smoothing,
            );
            this.velocityY = this.lerp(
                this.velocityY,
                impact.velocityY,
                smoothing,
            );
        }

        this.accumulatedWaterAmount +=
            Math.max(0, impact.waterAmount);

        this.impactCount += 1;
        this.ageSinceImpact = 0;
    }

    public update(deltaTime: number): void {
        if (
            !this.active ||
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            return;
        }

        this.ageSinceImpact += deltaTime;

        if (this.ageSinceImpact > this.timeoutSeconds) {
            this.clear();
        }
    }

    public isActive(): boolean {
        return this.active;
    }

    public getAgeSinceImpact(): number {
        return this.ageSinceImpact;
    }

    public getSample(): HoseImpactContactSample | null {
        if (!this.active) {
            return null;
        }

        return {
            x: this.x,
            y: this.y,
            velocityX: this.velocityX,
            velocityY: this.velocityY,
            waterAmount: this.accumulatedWaterAmount,
            impactCount: this.impactCount,
        };
    }

    /**
     * Clears only the amount accumulated toward the next periodic splash.
     * The contact point remains alive while authoritative impacts continue.
     */
    public consumeAccumulatedWater(): void {
        this.accumulatedWaterAmount = 0;
        this.impactCount = 0;
    }

    public reset(): void {
        this.clear();
    }

    private clear(): void {
        this.active = false;
        this.ageSinceImpact = 0;
        this.accumulatedWaterAmount = 0;
        this.impactCount = 0;
        this.velocityX = 0;
        this.velocityY = 0;
    }

    private lerp(
        start: number,
        end: number,
        t: number,
    ): number {
        return start + (end - start) * t;
    }

    private clamp01(value: number): number {
        return Math.max(0, Math.min(1, value));
    }
}
