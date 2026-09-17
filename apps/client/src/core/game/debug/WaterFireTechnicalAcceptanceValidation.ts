import { AirborneWaterSystem } from "../environment/AirborneWaterSystem";
import { EnvironmentField } from "../environment/EnvironmentField";
import { FireManager } from "../environment/FireManager";
import { LocalWindSystem } from "../environment/LocalWindSystem";
import { WaterField } from "../environment/WaterField";
import { WaterGroundInteractionSystem } from "../environment/WaterGroundInteractionSystem";
import { SurfaceSystem } from "../surface/SurfaceSystem";
import { SurfaceType } from "../surface/SurfaceType";

interface TechnicalSample {
    readonly fps: number;
    readonly water: number;
    readonly moisture: number;
}

export class WaterFireTechnicalAcceptanceValidation {
    public static run(): boolean {
        console.log("[8F-12] TECHNICAL ACCEPTANCE");
        const checks: Array<{ name: string; passed: boolean }> = [];

        const samples = [30, 60, 120].map((fps) => this.sample(fps));
        const reference = samples[1];

        console.table(samples.map((sample) => ({
            FPS: sample.fps,
            water: sample.water.toFixed(6),
            moisture: sample.moisture.toFixed(6),
        })));

        for (const sample of samples) {
            checks.push({
                name: `${sample.fps} FPS`,
                passed:
                    Number.isFinite(sample.water) &&
                    Number.isFinite(sample.moisture) &&
                    Math.abs(sample.water - reference.water) <= 0.0005 &&
                    Math.abs(sample.moisture - reference.moisture) <= 0.0005,
            });
        }

        const surface = new SurfaceSystem(SurfaceType.Grass);
        const environment = new EnvironmentField(surface);
        const water = new WaterField();
        const fire = new FireManager(surface, environment, new LocalWindSystem([]));
        const airborne = new AirborneWaterSystem(water);

        water.injectWater(640, 400, 0.1);
        environment.addMoistureAt(640, 400, 0.2);
        environment.depositHeat(640, 400, 24, 1);
        environment.depositBurn(640, 400, 24, 0.5, 1);
        fire.ignite(720, 400);

        water.reset();
        fire.reset();
        airborne.reset();
        environment.reset();

        checks.push({
            name: "reset",
            passed:
                water.getTotalWaterAmount() === 0 &&
                water.getActiveCellCount() === 0 &&
                fire.getActiveCellCount() === 0 &&
                airborne.getActivePacketCount() === 0 &&
                environment.getTrackedMoistureCellCount() === 0,
        });

        const finite =
            Number.isFinite(water.getTotalWaterAmount()) &&
            Number.isFinite(water.getSimulationAccumulator()) &&
            Number.isFinite(airborne.getSimulationAccumulator());

        checks.push({ name: "finite state", passed: finite });
        checks.push({
            name: "no Fire-cell leaks",
            passed: fire.getActiveCellCount() === 0,
        });
        checks.push({
            name: "no Water-packet corruption",
            passed:
                airborne.getActivePacketCount() === 0 &&
                airborne.getTotalCreatedPacketCount() === 0 &&
                airborne.getTotalDepositedWaterAmount() === 0,
        });

        const regressionSurface = new SurfaceSystem(SurfaceType.Grass);
        const regressionEnvironment = new EnvironmentField(regressionSurface);
        const regressionWater = new WaterField();
        const regressionGround = new WaterGroundInteractionSystem(
            regressionWater,
            regressionEnvironment,
            regressionSurface,
        );

        const before = regressionWater.getTotalWaterAmount();
        regressionWater.injectWater(640, 400, 0.08);
        const afterInject = regressionWater.getTotalWaterAmount();
        regressionWater.update(1 / 60);

        checks.push({
            name: "WaterField regression",
            passed:
                before === 0 &&
                afterInject > 0 &&
                Number.isFinite(regressionWater.getTotalWaterAmount()),
        });

        const baseline = regressionEnvironment.getMoistureAt(640, 400);
        regressionGround.update(0.1);
        const afterGround = regressionEnvironment.getMoistureAt(640, 400);

        checks.push({
            name: "EnvironmentField regression",
            passed:
                Number.isFinite(baseline) &&
                Number.isFinite(afterGround) &&
                afterGround >= baseline,
        });

        const regressionFire = new FireManager(
            regressionSurface,
            regressionEnvironment,
            new LocalWindSystem([]),
        );
        regressionFire.reset();
        const dryIgnition = regressionFire.ignite(900, 400);

        checks.push({
            name: "Fire regression",
            passed: dryIgnition && regressionFire.getActiveCellCount() > 0,
        });

        checks.push({
            name: "8C regression",
            passed: afterGround > baseline,
        });

        checks.push({
            name: "8D regression",
            passed:
                regressionWater.getNonEmptyCellCount() > 0 &&
                regressionWater.getTrackedWaterCellCount() > 0,
        });

        const moistureResponse =
            regressionFire.getMoistureResponse(
                regressionEnvironment.getAverageMoistureInRadius(
                    640,
                    400,
                    regressionFire.getDefinition().fieldInfluenceRadius,
                ),
                1,
            );

        checks.push({
            name: "8E regression",
            passed:
                Number.isFinite(moistureResponse.ignitionCombustibility) &&
                Number.isFinite(regressionWater.getDepthAt(640, 400)),
        });

        for (const check of checks) {
            console.log(`[8F-12] ${check.name}: ${check.passed ? "PASS" : "FAIL"}`);
        }

        const passed = checks.every((check) => check.passed);
        console.log(`[8F-12] Technical Acceptance: ${passed ? "PASS" : "FAIL"}`);
        return passed;
    }

    private static sample(fps: number): TechnicalSample {
        const surface = new SurfaceSystem(SurfaceType.Grass);
        const environment = new EnvironmentField(surface);
        const water = new WaterField();
        const ground = new WaterGroundInteractionSystem(water, environment, surface);

        water.injectWater(640, 400, 0.20);

        const dt = 1 / fps;
        for (let frame = 0; frame < fps * 3; frame += 1) {
            water.update(dt);
            ground.update(dt);
        }

        return {
            fps,
            water: water.getTotalWaterAmount(),
            moisture: environment.getAverageMoistureInRadius(640, 400, 34),
        };
    }
}
