import { FireSourceType } from "../config/FireSourceDefinition";
import type { AirborneWaterSweep } from "../environment/AirborneWaterSystem";
import { EnvironmentField } from "../environment/EnvironmentField";
import { FireSourceSystem } from "../environment/FireSourceSystem";
import { WaterField } from "../environment/WaterField";
import { WaterFireInteraction } from "../environment/WaterFireInteraction";
import { SurfaceSystem } from "../surface/SurfaceSystem";
import { SurfaceType } from "../surface/SurfaceType";

export class WaterFireDirectionalAcceptanceValidation {
    public static run(): boolean {
        console.log("[8F-12] DIRECTIONAL FIRE ACCEPTANCE");

        const surface = new SurfaceSystem(SurfaceType.Grass);
        const environment = new EnvironmentField(surface);
        const water = new WaterField();
        const sources = new FireSourceSystem(environment);
        const interaction = new WaterFireInteraction();
        const checks: Array<{ name: string; passed: boolean }> = [];

        sources.addSource({
            id: "8f12-fire-tube",
            type: FireSourceType.Directional,
            enabled: true,
            positionX: 400,
            positionY: 600,
            directionRadians: 0,
            length: 400,
            halfWidth: 14,
            heatPerSecond: 0.72,
            endHeatMultiplier: 0.58,
        });

        const source = sources.getSources().find((item) => item.getId() === "8f12-fire-tube")!;
        const fullLength = 400;

        sources.beginDirectionalWaterSuppressionFrame();
        checks.push({
            name: "Fire jet operates normally when dry",
            passed:
                source.isEnabled() &&
                sources.getDirectionalEffectiveLength(source.getId(), fullLength) === fullLength,
        });

        const makeSweep = (sourceId: string): AirborneWaterSweep => ({
            sourceId,
            sequence: 1,
            waterAmount: 0.01,
            startX: 600,
            startY: 520,
            startHeight: 24,
            endX: 600,
            endY: 680,
            endHeight: 24,
        });

        sources.beginDirectionalWaterSuppressionFrame();
        const hose = interaction.updateAirborneWaterDirectionalFire(
            [makeSweep("8f12-hose")],
            sources,
        );
        const hoseLength = sources.getDirectionalEffectiveLength(source.getId(), fullLength);
        checks.push({
            name: "Hose intersects Fire jet",
            passed: hose.contactCount > 0,
        });
        checks.push({
            name: "Hose suppresses Fire at interaction",
            passed: hose.suppressedSourceCount === 1 && hoseLength < fullLength,
        });

        sources.beginDirectionalWaterSuppressionFrame();
        const sprinkler = interaction.updateAirborneWaterDirectionalFire(
            [makeSweep("8f12-sprinkler")],
            sources,
        );
        checks.push({
            name: "Sprinkler intersects and suppresses Fire jet",
            passed:
                sprinkler.contactCount > 0 &&
                sprinkler.suppressedSourceCount === 1 &&
                sources.getDirectionalEffectiveLength(source.getId(), fullLength) < fullLength,
        });

        sources.beginDirectionalWaterSuppressionFrame();
        water.injectWater(600, 600, 0.08);
        const puddle = interaction.updateStandingWaterDirectionalFire(water, sources);
        checks.push({
            name: "Puddle suppresses Fire jet",
            passed:
                puddle.contactCount > 0 &&
                puddle.suppressedSourceCount === 1 &&
                sources.getDirectionalEffectiveLength(source.getId(), fullLength) < fullLength,
        });

        checks.push({
            name: "Fire Tube itself remains operational",
            passed: source.isEnabled(),
        });

        sources.beginDirectionalWaterSuppressionFrame();
        checks.push({
            name: "Removing direct Water allows Fire to return",
            passed:
                source.isEnabled() &&
                sources.getDirectionalEffectiveLength(source.getId(), fullLength) === fullLength,
        });

        for (const check of checks) {
            console.log(`[8F-12] ${check.name}: ${check.passed ? "PASS" : "FAIL"}`);
        }
        const passed = checks.every((check) => check.passed);
        console.log(`[8F-12] Directional Fire Acceptance: ${passed ? "PASS" : "FAIL"}`);
        return passed;
    }
}
