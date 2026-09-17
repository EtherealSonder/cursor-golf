import { SurfaceType } from "../surface/SurfaceType";
import { SurfaceSystem } from "../surface/SurfaceSystem";
import { EnvironmentField } from "../environment/EnvironmentField";
import { WaterField } from "../environment/WaterField";
import { WaterGroundInteractionSystem } from "../environment/WaterGroundInteractionSystem";
import { LocalWindSystem } from "../environment/LocalWindSystem";
import { FireManager } from "../environment/FireManager";
import { WaterFireInteraction } from "../environment/WaterFireInteraction";

interface FrameRateResult {
    readonly fps: number;
    readonly waterDepth: number;
    readonly totalWater: number;
    readonly moisture: number;
    readonly ignitionScore: number;
    readonly canIgnite: boolean;
    readonly groundFireExtinguished: boolean;
}

export class WaterFireFrameRateStabilityValidation {
    private static readonly TEST_X = 640;
    private static readonly TEST_Y = 400;
    private static readonly DURATION_SECONDS = 3;
    private static readonly WATER_AMOUNT = 0.20;
    private static readonly TOLERANCE = 0.0005;

    public static run(): void {
        console.log("[8F-11] 30/60/120 FPS STABILITY");

        const results = [30, 60, 120].map(
            (fps): FrameRateResult => this.runScenario(fps),
        );

        const reference = results.find((result) => result.fps === 60)!;

        console.table(
            results.map((result) => ({
                FPS: result.fps,
                waterDepth: result.waterDepth.toFixed(6),
                totalWater: result.totalWater.toFixed(6),
                moisture: result.moisture.toFixed(6),
                ignitionScore: result.ignitionScore.toFixed(6),
                canIgnite: result.canIgnite,
                groundFireExtinguished: result.groundFireExtinguished,
            })),
        );

        const checks = results
            .filter((result) => result.fps !== 60)
            .flatMap((result) => [
                {
                    name: `${result.fps} FPS standing Water matches 60 FPS`,
                    passed: this.near(result.waterDepth, reference.waterDepth),
                },
                {
                    name: `${result.fps} FPS total Water matches 60 FPS`,
                    passed: this.near(result.totalWater, reference.totalWater),
                },
                {
                    name: `${result.fps} FPS retained moisture matches 60 FPS`,
                    passed: this.near(result.moisture, reference.moisture),
                },
                {
                    name: `${result.fps} FPS Fire susceptibility matches 60 FPS`,
                    passed:
                        this.near(result.ignitionScore, reference.ignitionScore) &&
                        result.canIgnite === reference.canIgnite,
                },
                {
                    name: `${result.fps} FPS direct Ground Fire suppression matches 60 FPS`,
                    passed:
                        result.groundFireExtinguished ===
                        reference.groundFireExtinguished,
                },
            ]);

        for (const check of checks) {
            console.log(
                `[8F-11] ${check.name}: ${check.passed ? "PASS" : "FAIL"}`,
            );
        }

        console.log(
            `[8F-11] Frame-Rate Stability: ${
                checks.every((check) => check.passed) ? "PASS" : "FAIL"
            }`,
        );
    }

    private static runScenario(fps: number): FrameRateResult {
        const surface = new SurfaceSystem(SurfaceType.Grass);
        const environment = new EnvironmentField(surface);
        const water = new WaterField();
        const ground = new WaterGroundInteractionSystem(
            water,
            environment,
            surface,
        );
        const fire = new FireManager(
            surface,
            environment,
            new LocalWindSystem([]),
        );
        const interaction = new WaterFireInteraction();

        water.injectWater(
            this.TEST_X,
            this.TEST_Y,
            this.WATER_AMOUNT,
        );

        const dt = 1 / fps;
        const frameCount =
            Math.round(this.DURATION_SECONDS * fps);

        for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
            water.update(dt);
            ground.update(dt);
        }

        const waterDepth =
            water.getDepthAt(this.TEST_X, this.TEST_Y);

        const totalWater =
            water.getTotalWaterAmount();

        const fireRadius =
            fire.getDefinition().fieldInfluenceRadius;

        const moisture =
            environment.getAverageMoistureInRadius(
                this.TEST_X,
                this.TEST_Y,
                fireRadius,
            );

        const response =
            fire.getMoistureResponse(moisture, 1);

        /*
         * Use a fresh nearby dry Fire cell, then place meaningful standing
         * Water directly on it. This isolates the direct 8F suppression path
         * from the moisture state measured above.
         */
        const fireX = this.TEST_X + 160;
        const fireY = this.TEST_Y;

        const ignited =
            fire.ignite(fireX, fireY);

        water.injectWater(
            fireX,
            fireY,
            0.08,
        );

        const directResult =
            interaction.updateStandingWaterGroundFire(
                water,
                fire,
            );

        return {
            fps,
            waterDepth,
            totalWater,
            moisture,
            ignitionScore:
                response.ignitionCombustibility,
            canIgnite:
                response.canIgnite,
            groundFireExtinguished:
                ignited &&
                directResult.extinguishedFireCellCount > 0,
        };
    }

    private static near(
        first: number,
        second: number,
    ): boolean {
        return (
            Math.abs(first - second) <=
            this.TOLERANCE
        );
    }
}
