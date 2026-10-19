import { WaterField } from "../environment/WaterField";
import { EnvironmentField } from "../environment/EnvironmentField";
import { WaterGroundInteractionSystem } from "../environment/WaterGroundInteractionSystem";
import { SurfaceSystem } from "../surface/SurfaceSystem";
import { SurfaceType } from "../surface/SurfaceType";

export class WaterGroundLifecycleValidation {
    public static run(): { passed: boolean; checks: readonly { name: string; passed: boolean; detail: string }[] } {
        const surface = new SurfaceSystem(SurfaceType.Grass);
        const environment = new EnvironmentField(surface);
        const water = new WaterField();
        const ground = new WaterGroundInteractionSystem(water, environment, surface);
        const x = 240, y = 240;
        const beforeMoisture = environment.getMoistureAt(x, y);
        water.injectWater(x, y, 8);
        const initialWater = water.getTotalWaterAmount();
        for (let i = 0; i < 180; i += 1) { water.update(1 / 60); ground.update(1 / 60); }
        const wetMoisture = environment.getMoistureAt(x, y);
        const accounting = ground.getTransferAccounting();
        const remaining = water.getTotalWaterAmount();
        const checks = [
            { name: "Water depth finite and nonnegative", passed: Number.isFinite(remaining) && remaining >= -1e-5, detail: `initial=${initialWater.toFixed(4)}, remaining=${remaining.toFixed(4)}` },
            { name: "Ground wetting", passed: wetMoisture >= beforeMoisture && accounting.totalMoistureAdded >= 0, detail: `before=${beforeMoisture.toFixed(5)}, after=${wetMoisture.toFixed(5)}` },
            { name: "Infiltration accounting bounded", passed: accounting.totalWaterTransferred >= 0 && accounting.totalWaterTransferred <= initialWater + 1e-4, detail: `infiltrated=${accounting.totalWaterTransferred.toFixed(5)}` },
        ];
        water.reset();
        const dryingStart = environment.getMoistureAt(x, y);
        for (let i = 0; i < 1800; i += 1) ground.update(1 / 60);
        const dryingEnd = environment.getMoistureAt(x, y);
        checks.push({ name: "Drying does not increase moisture", passed: Number.isFinite(dryingEnd) && dryingEnd <= dryingStart + 1e-5, detail: `start=${dryingStart.toFixed(5)}, end=${dryingEnd.toFixed(5)}` });
        return { passed: checks.every(c => c.passed), checks };
    }
}
