import type {
    BallWaterSplashEvent,
} from "../physics/water/BallWaterSplashEvent";

import {
    BallSplashVfx,
} from "../water-vfx/BallSplashVfx";

/**
 * 8I-8D contract/mapping validation.
 *
 * This deliberately validates the Ball-specific presentation adapter without
 * creating Pixi render resources. Runtime visual emission is exercised through
 * the real WaterImpactVfxSystem owned by WaterVfxSystem.
 */
export class BallEntrySplashVfxValidation {
    private static hasRun =
        false;

    public run():
        void {

        if (
            BallEntrySplashVfxValidation
                .hasRun
        ) {
            return;
        }

        BallEntrySplashVfxValidation
            .hasRun =
            true;

        console.log(
            "[8I-8D] BALL ENTRY SPLASH VFX",
        );

        const adapter =
            new BallSplashVfx();

        const baseEvent:
            BallWaterSplashEvent = {
                worldX: 240,
                worldY: 180,
                velocityX: 300,
                velocityY: 100,
                ballSpeed: 320,
                waterDepth: 0.08,
                waterCoverage: 0.65,
                intensity: 0.70,
            };

        adapter.consume(
            baseEvent,
        );

        const request =
            adapter.getLastRequest();

        const circularRequest =
            adapter.getLastCircularRequest();

        const preserved =
            adapter.getLastEvent();

        const results:
            boolean[] = [];

        results.push(
            this.check(
                "Authoritative event accepted",
                adapter.getConsumedEventCount() ===
                1 &&
                request !==
                null,
            ),
        );

        results.push(
            this.check(
                "Splash origin preserves world position",
                request !==
                null &&
                request.x ===
                baseEvent.worldX &&
                request.y ===
                baseEvent.worldY,
            ),
        );

        results.push(
            this.check(
                "Ball velocity determines impact orientation",
                request !==
                null &&
                request.directionX ===
                baseEvent.velocityX &&
                request.directionY ===
                baseEvent.velocityY,
            ),
        );

        const slow =
            this.consumeAndGetRequest(
                {
                    ...baseEvent,
                    ballSpeed: 80,
                },
            );

        const fast =
            this.consumeAndGetRequest(
                {
                    ...baseEvent,
                    ballSpeed: 500,
                },
            );

        results.push(
            this.check(
                "Greater Ball speed increases energetic displacement",
                slow !==
                null &&
                fast !==
                null &&
                (
                    fast.energeticDisplacement ??
                    0
                ) >
                (
                    slow.energeticDisplacement ??
                    0
                ),
            ),
        );

        const shallow =
            this.consumeAndGetRequest(
                {
                    ...baseEvent,
                    waterDepth: 0.02,
                },
            );

        const deep =
            this.consumeAndGetRequest(
                {
                    ...baseEvent,
                    waterDepth: 0.12,
                },
            );

        results.push(
            this.check(
                "Greater Water depth strengthens splash body",
                shallow !==
                null &&
                deep !==
                null &&
                (
                    deep.bodyStrength ??
                    0
                ) >
                (
                    shallow.bodyStrength ??
                    0
                ),
            ),
        );

        const narrow =
            this.consumeAndGetRequest(
                {
                    ...baseEvent,
                    waterCoverage: 0.15,
                },
            );

        const broad =
            this.consumeAndGetRequest(
                {
                    ...baseEvent,
                    waterCoverage: 1,
                },
            );

        results.push(
            this.check(
                "Greater Water coverage broadens splash",
                narrow !==
                null &&
                broad !==
                null &&
                (
                    broad.breadth ??
                    0
                ) >
                (
                    narrow.breadth ??
                    0
                ),
            ),
        );

        const lowIntensity =
            this.consumeAndGetRequest(
                {
                    ...baseEvent,
                    intensity: 0.20,
                },
            );

        const highIntensity =
            this.consumeAndGetRequest(
                {
                    ...baseEvent,
                    intensity: 1,
                },
            );

        results.push(
            this.check(
                "Greater intensity increases overall presentation scale",
                lowIntensity !==
                null &&
                highIntensity !==
                null &&
                (
                    highIntensity.overallScale ??
                    0
                ) >
                (
                    lowIntensity.overallScale ??
                    0
                ),
            ),
        );

        const zeroVelocity =
            this.consumeAndGetRequest(
                {
                    ...baseEvent,
                    velocityX: 0,
                    velocityY: 0,
                    ballSpeed: 0,
                },
            );

        results.push(
            this.check(
                "Zero velocity remains finite and safe",
                zeroVelocity !==
                null &&
                Number.isFinite(
                    zeroVelocity.directionX,
                ) &&
                Number.isFinite(
                    zeroVelocity.directionY,
                ) &&
                Number.isFinite(
                    zeroVelocity.speed,
                ) &&
                Number.isFinite(
                    zeroVelocity.directionalBias ??
                    0,
                ),
            ),
        );

        results.push(
            this.check(
                "Input event remains unmodified",
                baseEvent.worldX ===
                240 &&
                baseEvent.worldY ===
                180 &&
                baseEvent.velocityX ===
                300 &&
                baseEvent.velocityY ===
                100 &&
                baseEvent.ballSpeed ===
                320 &&
                baseEvent.waterDepth ===
                0.08 &&
                baseEvent.waterCoverage ===
                0.65 &&
                baseEvent.intensity ===
                0.70 &&
                preserved !==
                baseEvent,
            ),
        );

        results.push(
            this.check(
                "Entry maps to dedicated circular Ball composition",
                circularRequest !==
                null &&
                circularRequest.isEntry ===
                true &&
                circularRequest.x ===
                baseEvent.worldX &&
                circularRequest.y ===
                baseEvent.worldY,
            ),
        );

        results.push(
            this.check(
                "Circular entry preserves depth coverage and intensity inputs",
                circularRequest !==
                null &&
                circularRequest.normalizedDepth >
                0 &&
                circularRequest.coverage ===
                baseEvent.waterCoverage &&
                circularRequest.intensity ===
                baseEvent.intensity,
            ),
        );

        adapter.reset();

        results.push(
            this.check(
                "Reset clears Ball splash presentation state",
                adapter.getConsumedEventCount() ===
                0 &&
                adapter.getLastEvent() ===
                null &&
                adapter.getLastRequest() ===
                null &&
                adapter.getLastCircularRequest() ===
                null,
            ),
        );

        console.log(
            `[8I-8D] RESULT: ${results.every(Boolean) ? "PASS" : "FAIL"}`,
        );
    }

    private consumeAndGetRequest(
        event:
            BallWaterSplashEvent,
    ) {
        const adapter =
            new BallSplashVfx();

        adapter.consume(
            event,
        );

        return adapter.getLastRequest();
    }

    private check(
        label:
            string,

        passed:
            boolean,
    ): boolean {

        console.log(
            `[8I-8D] ${label}: ${passed ? "PASS" : "FAIL"}`,
        );

        return passed;
    }
}
