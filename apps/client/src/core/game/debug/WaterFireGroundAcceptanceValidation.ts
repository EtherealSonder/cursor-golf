import type { AirborneWaterSweep } from "../environment/AirborneWaterSystem";
import { EnvironmentField } from "../environment/EnvironmentField";
import { FireManager } from "../environment/FireManager";
import { LocalWindSystem } from "../environment/LocalWindSystem";
import { WaterField } from "../environment/WaterField";
import { WaterFireInteraction } from "../environment/WaterFireInteraction";
import { SurfaceSystem } from "../surface/SurfaceSystem";
import { SurfaceType } from "../surface/SurfaceType";

export class WaterFireGroundAcceptanceValidation {
    public static run(): boolean {
        console.log("[8F-12] GROUND FIRE ACCEPTANCE");
        const checks: Array<{ name: string; passed: boolean }> = [];

        const makeWorld = () => {
            const surface = new SurfaceSystem(SurfaceType.Grass);
            const environment = new EnvironmentField(surface);
            return {
                water: new WaterField(),
                fire: new FireManager(surface, environment, new LocalWindSystem([])),
                interaction: new WaterFireInteraction(),
            };
        };

        {
            const { fire } = makeWorld();
            const ignited = fire.ignite(500, 400);
            fire.update(1 / 60);
            checks.push({
                name: "Fire without Water behaves normally",
                passed: ignited && fire.getActiveCellCount() > 0,
            });
        }

        {
            const { water, fire, interaction } = makeWorld();
            const ignited = fire.ignite(500, 400);
            water.injectWater(500, 400, 0.08);
            const result = interaction.updateStandingWaterGroundFire(water, fire);
            fire.update(1 / 60);
            checks.push({
                name: "Puddle extinguishes contacted Fire",
                passed: ignited && result.extinguishedFireCellCount > 0,
            });
            checks.push({
                name: "Extinguished Fire stops spreading",
                passed: fire.getActiveCellCount() === 0,
            });
        }

        const airborneCase = (sourceId: string, fireX: number) => {
            const { fire, interaction } = makeWorld();
            const ignited = fire.ignite(fireX, 400);
            const sweep: AirborneWaterSweep = {
                sourceId,
                sequence: 1,
                waterAmount: 0.01,
                startX: fireX,
                startY: 300,
                startHeight: 24,
                endX: fireX,
                endY: 500,
                endHeight: 24,
            };
            const result = interaction.updateAirborneWaterGroundFire([sweep], fire);
            return ignited && result.extinguishedFireCellCount > 0;
        };

        checks.push({
            name: "Sprinkler airborne Water extinguishes contacted Fire",
            passed: airborneCase("8f12-sprinkler", 600),
        });
        checks.push({
            name: "Hose airborne Water extinguishes contacted Fire",
            passed: airborneCase("8f12-hose", 700),
        });

        {
            const { fire, interaction } = makeWorld();
            const ignited = fire.ignite(500, 400);
            const miss: AirborneWaterSweep = {
                sourceId: "8f12-miss",
                sequence: 1,
                waterAmount: 0.01,
                startX: 900,
                startY: 300,
                startHeight: 24,
                endX: 900,
                endY: 500,
                endHeight: 24,
            };
            const result = interaction.updateAirborneWaterGroundFire([miss], fire);
            checks.push({
                name: "Water missing Fire has no effect",
                passed:
                    ignited &&
                    result.extinguishedFireCellCount === 0 &&
                    fire.getActiveCellCount() > 0,
            });
        }

        for (const check of checks) {
            console.log(`[8F-12] ${check.name}: ${check.passed ? "PASS" : "FAIL"}`);
        }
        const passed = checks.every((check) => check.passed);
        console.log(`[8F-12] Ground Fire Acceptance: ${passed ? "PASS" : "FAIL"}`);
        return passed;
    }
}
