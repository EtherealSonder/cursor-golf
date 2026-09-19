import type {
    AirborneWaterPresentationImpact,
} from "../environment/AirborneWaterSystem";

import {
    WaterImpactIntensityModel,
    WaterImpactTier,
} from "../water-vfx/WaterImpactIntensityModel";

/** Phase 8I-7B deterministic validation for shared impact presentation intensity. */
export class WaterImpactIntensityValidation {
    private static readonly EPSILON = 0.000001;

    public run(): void {
        console.info("[8I-7B] SHARED WATER IMPACT INTENSITY MODEL");

        const model = new WaterImpactIntensityModel();

        const negligible = model.evaluate(
            this.makeImpact(0, 0, 0, false),
        );
        this.assertPass(
            "Negligible impact -> Fine / zero intensity",
            negligible.tier === WaterImpactTier.Fine &&
            this.nearlyEqual(negligible.normalizedIntensity, 0),
        );

        const weak = model.evaluate(
            this.makeImpact(80, 0, 0.05, false),
        );
        const medium = model.evaluate(
            this.makeImpact(260, 80, 0.45, false),
        );
        const strong = model.evaluate(
            this.makeImpact(520, 220, 0.85, false),
        );

        this.assertPass("Weak impact -> Fine", weak.tier === WaterImpactTier.Fine);
        this.assertPass("Medium impact -> Medium", medium.tier === WaterImpactTier.Medium);
        this.assertPass("Strong impact -> Heavy", strong.tier === WaterImpactTier.Heavy);

        const speedLow = model.evaluate(this.makeImpact(100, 0, 0.25, false));
        const speedHigh = model.evaluate(this.makeImpact(300, 0, 0.25, false));
        this.assertPass(
            "Higher speed cannot reduce intensity",
            speedHigh.normalizedIntensity >= speedLow.normalizedIntensity,
        );

        const amountLow = model.evaluate(this.makeImpact(220, 0, 0.10, false));
        const amountHigh = model.evaluate(this.makeImpact(220, 0, 0.70, false));
        this.assertPass(
            "More Water cannot reduce intensity",
            amountHigh.normalizedIntensity >= amountLow.normalizedIntensity,
        );

        const ground = model.evaluate(this.makeImpact(220, 40, 0.30, false));
        const obstacle = model.evaluate(this.makeImpact(220, 40, 0.30, true));
        this.assertPass(
            "Static collision modifier is presentation-only emphasis",
            obstacle.normalizedIntensity >= ground.normalizedIntensity,
        );

        const directional = model.evaluate(
            this.makeImpact(3, 4, 0.20, false),
        );
        this.assertPass(
            "Direction is normalized and speed is preserved",
            this.nearlyEqual(directional.speed, 5) &&
            this.nearlyEqual(
                Math.hypot(directional.directionX, directional.directionY),
                1,
            ),
        );

        const stationary = model.evaluate(this.makeImpact(0, 0, 0.20, false));
        this.assertPass(
            "Zero velocity produces safe zero direction",
            stationary.directionX === 0 &&
            stationary.directionY === 0 &&
            Number.isFinite(stationary.directionX) &&
            Number.isFinite(stationary.directionY),
        );

        const saturated = model.evaluate(
            this.makeImpact(100000, 100000, 1000, true),
        );
        this.assertPass(
            "Normalized intensity remains within [0, 1]",
            saturated.normalizedIntensity >= 0 &&
            saturated.normalizedIntensity <= 1,
        );

        const repeatImpact = this.makeImpact(240, -120, 0.4, true);
        const before = JSON.stringify(repeatImpact);
        const first = model.evaluate(repeatImpact);
        const second = model.evaluate(repeatImpact);
        const after = JSON.stringify(repeatImpact);

        this.assertPass(
            "Same input produces identical output",
            JSON.stringify(first) === JSON.stringify(second),
        );
        this.assertPass(
            "Model does not mutate authoritative impact",
            before === after,
        );

        console.info("[8I-7B] RESULT: PASS");
    }

    private makeImpact(
        velocityX: number,
        velocityY: number,
        waterAmount: number,
        isStaticCollision: boolean,
    ): AirborneWaterPresentationImpact {
        return {
            sourceId: "8i7b-validation",
            emissionOrdinal: 7,
            positionX: 100,
            positionY: 200,
            velocityX,
            velocityY,
            waterAmount,
            isStaticCollision,
            ageSeconds: 0,
        };
    }

    private nearlyEqual(a: number, b: number): boolean {
        return Math.abs(a - b) <= WaterImpactIntensityValidation.EPSILON;
    }

    private assertPass(label: string, condition: boolean): void {
        if (!condition) {
            console.error(`[8I-7B] ${label}: FAIL`);
            throw new Error(`[8I-7B] Validation failed: ${label}`);
        }

        console.info(`[8I-7B] ${label}: PASS`);
    }
}
