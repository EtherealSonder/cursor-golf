import type {
    BallWaterSplashEvent,
} from "../physics/water/BallWaterSplashEvent";

import {
    BallSplashVfx,
} from "../water-vfx/BallSplashVfx";

export class BallSplashVfxContractValidation {
    public run(): void {
        console.log(
            "[8I-8A] BALL SPLASH VFX CONTRACT",
        );

        const adapter =
            new BallSplashVfx();

        const event:
            BallWaterSplashEvent = {
                worldX: 123.25,
                worldY: 456.75,
                velocityX: 210,
                velocityY: -84,
                ballSpeed: 226.2,
                waterDepth: 0.63,
                waterCoverage: 0.78,
                intensity: 0.86,
            };

        adapter.consume(event);

        const received =
            adapter.getLastEvent();

        const checks: ReadonlyArray<
            readonly [string, boolean]
        > = [
            [
                "Existing BallWaterSplashEvent accepted",
                adapter.getConsumedEventCount() === 1 &&
                received !== null,
            ],
            [
                "Position preserved",
                received?.worldX === event.worldX &&
                received?.worldY === event.worldY,
            ],
            [
                "Velocity preserved",
                received?.velocityX === event.velocityX &&
                received?.velocityY === event.velocityY,
            ],
            [
                "Ball speed preserved",
                received?.ballSpeed === event.ballSpeed,
            ],
            [
                "Water depth preserved",
                received?.waterDepth === event.waterDepth,
            ],
            [
                "Water coverage preserved",
                received?.waterCoverage === event.waterCoverage,
            ],
            [
                "Normalized intensity preserved",
                received?.intensity === event.intensity,
            ],
            [
                "Reset clears presentation state",
                this.validateReset(adapter),
            ],
        ];

        let passed = true;

        for (const [label, result] of checks) {
            console.log(
                `[8I-8A] ${label}: ${result ? "PASS" : "FAIL"}`,
            );

            passed &&= result;
        }

        console.log(
            `[8I-8A] RESULT: ${passed ? "PASS" : "FAIL"}`,
        );
    }

    private validateReset(
        adapter: BallSplashVfx,
    ): boolean {
        adapter.reset();

        return (
            adapter.getLastEvent() === null &&
            adapter.getConsumedEventCount() === 0
        );
    }
}
