import { EnvironmentField } from "../environment/EnvironmentField";
import { FireManager } from "../environment/FireManager";
import { LocalWindSystem } from "../environment/LocalWindSystem";
import { WaterField } from "../environment/WaterField";
import { WaterGroundInteractionSystem } from "../environment/WaterGroundInteractionSystem";
import { SurfaceSystem } from "../surface/SurfaceSystem";
import { SurfaceType } from "../surface/SurfaceType";

export class WaterFireMoistureAcceptanceValidation {
    private static readonly X = 640;
    private static readonly Y = 400;

    public static run(): boolean {
        console.log("[8F-12] MOISTURE + ENVIRONMENTAL HISTORY ACCEPTANCE");

        const surface = new SurfaceSystem(SurfaceType.Grass);
        const environment = new EnvironmentField(surface);
        const water = new WaterField();
        const ground = new WaterGroundInteractionSystem(water, environment, surface);
        const fire = new FireManager(surface, environment, new LocalWindSystem([]));
        const checks: Array<{ name: string; passed: boolean }> = [];

        const radius = fire.getDefinition().fieldInfluenceRadius;
        const moisture = () =>
            environment.getAverageMoistureInRadius(this.X, this.Y, radius);
        const response = () => fire.getMoistureResponse(moisture(), 1);

        const dryMoisture = moisture();
        const dryResponse = response();

        for (let y = -24; y <= 24; y += 8) {
            for (let x = -24; x <= 24; x += 8) {
                water.injectWater(this.X + x, this.Y + y, 0.08);
            }
        }

        for (let i = 0; i < 20; i += 1) {
            water.update(0.1);
            ground.update(0.1);
        }

        const wetMoisture = moisture();
        const wetResponse = response();

        checks.push({
            name: "Wet ground resists ignition",
            passed:
                wetMoisture > dryMoisture &&
                wetResponse.ignitionCombustibility < dryResponse.ignitionCombustibility,
        });
        checks.push({
            name: "Moisture suppresses spread",
            passed: wetResponse.spreadMultiplier < dryResponse.spreadMultiplier,
        });

        environment.depositBurn(this.X, this.Y, radius, 0.85, 812);
        const burnBefore = this.sumBurn(environment);

        let steps = 0;
        while (water.getDepthAt(this.X, this.Y) > 0.012 && steps < 6000) {
            water.update(0.1);
            ground.update(0.1);
            steps += 1;
        }

        const retainedMoisture = moisture();
        const retainedResponse = response();

        checks.push({
            name: "Standing Water can disappear while suppression remains",
            passed:
                water.getDepthAt(this.X, this.Y) <= 0.012 &&
                retainedMoisture > dryMoisture &&
                retainedResponse.ignitionCombustibility < dryResponse.ignitionCombustibility,
        });

        const beforeDryingScore = retainedResponse.ignitionCombustibility;
        for (let i = 0; i < 900; i += 1) {
            ground.update(0.1);
        }
        const partiallyDryMoisture = moisture();
        const partiallyDryResponse = response();

        checks.push({
            name: "Drying progressively restores Fire susceptibility",
            passed:
                partiallyDryMoisture < retainedMoisture &&
                partiallyDryResponse.ignitionCombustibility > beforeDryingScore,
        });

        fire.reset();
        const wetIgnition = fire.ignite(this.X, this.Y);
        fire.reset();

        for (let i = 0; i < 5000; i += 1) {
            ground.update(0.1);
        }

        const dryAgainResponse = response();
        fire.reset();
        const dryAgainIgnition = fire.ignite(this.X, this.Y);
        fire.reset();

        checks.push({
            name: "Reignition follows current moisture",
            passed:
                dryAgainResponse.ignitionCombustibility >
                    partiallyDryResponse.ignitionCombustibility &&
                (!wetIgnition || dryAgainIgnition),
        });

        const burnAfter = this.sumBurn(environment);
        checks.push({
            name: "Scorched terrain remains Scorched",
            passed: burnBefore > 0 && Math.abs(burnAfter - burnBefore) <= 0.000001,
        });
        checks.push({
            name: "Water does not restore burned terrain",
            passed: burnAfter > 0,
        });
        checks.push({
            name: "Wetting and drying preserve scorch history",
            passed: Math.abs(burnAfter - burnBefore) <= 0.000001,
        });

        for (const check of checks) {
            console.log(`[8F-12] ${check.name}: ${check.passed ? "PASS" : "FAIL"}`);
        }
        const passed = checks.every((check) => check.passed);
        console.log(`[8F-12] Moisture + History Acceptance: ${passed ? "PASS" : "FAIL"}`);
        return passed;
    }

    private static sumBurn(environment: EnvironmentField): number {
        let total = 0;
        for (let index = 0; index < environment.getCellCount(); index += 1) {
            total += environment.getBurnAmountByIndex(index);
        }
        return total;
    }
}
