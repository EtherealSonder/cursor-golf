import { FireSourceType } from "../config/FireSourceDefinition";
import type { AirborneWaterSweep } from "../environment/AirborneWaterSystem";
import { EnvironmentField } from "../environment/EnvironmentField";
import { FireManager } from "../environment/FireManager";
import { FireSourceSystem } from "../environment/FireSourceSystem";
import { LocalWindSystem } from "../environment/LocalWindSystem";
import { WaterField } from "../environment/WaterField";
import { WaterFireInteraction } from "../environment/WaterFireInteraction";
import { SurfaceSystem } from "../surface/SurfaceSystem";
import { SurfaceType } from "../surface/SurfaceType";

export class WaterFireRegressionValidation {
    public static run(): void {
        console.log("[8F-11] WATER-FIRE REGRESSION");

        const surface = new SurfaceSystem(SurfaceType.Grass);
        const environment = new EnvironmentField(surface);
        const fire = new FireManager(
            surface,
            environment,
            new LocalWindSystem([]),
        );
        const water = new WaterField();
        const sources = new FireSourceSystem(environment);
        const interaction = new WaterFireInteraction();
        const checks: Array<{ name: string; passed: boolean }> = [];

        /* Standing Water x Ground Fire and semantic extinguish event. */
        const groundX = 520;
        const groundY = 360;
        const groundIgnited = fire.ignite(groundX, groundY);
        water.injectWater(groundX, groundY, 0.08);

        const standingGround =
            interaction.updateStandingWaterGroundFire(water, fire);

        const standingGroundContacts =
            interaction.consumeContactEvents();

        const standingGroundExtinguished =
            interaction.consumeExtinguishedEvents();

        checks.push({
            name: "Standing Water still extinguishes Ground Fire",
            passed:
                groundIgnited &&
                standingGround.extinguishedFireCellCount > 0,
        });

        checks.push({
            name: "Ground Fire extinguish still emits contact and extinguished events",
            passed:
                standingGroundContacts.some(
                    (event) =>
                        event.interactionType ===
                        "standing-water-ground-fire",
                ) &&
                standingGroundExtinguished.length > 0,
        });

        /* Directional Fire remains enabled while Water truncates it. */
        sources.addSource({
            id: "8f11-fire-tube",
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

        const sweep: AirborneWaterSweep = {
            sourceId: "8f11-hose",
            sequence: 1,
            waterAmount: 0.01,
            startX: 600,
            startY: 520,
            startHeight: 24,
            endX: 600,
            endY: 680,
            endHeight: 24,
        };

        sources.beginDirectionalWaterSuppressionFrame();

        const directional =
            interaction.updateAirborneWaterDirectionalFire(
                [sweep],
                sources,
            );

        const directionalContacts =
            interaction.consumeContactEvents();

        const falseExtinguishes =
            interaction.consumeExtinguishedEvents();

        const source =
            sources
                .getSources()
                .find(
                    (candidate) =>
                        candidate.getId() ===
                        "8f11-fire-tube",
                );

        checks.push({
            name: "Airborne Water still truncates directional Fire",
            passed:
                directional.suppressedSourceCount === 1,
        });

        checks.push({
            name: "Directional Fire source remains enabled",
            passed:
                source?.isEnabled() === true,
        });

        checks.push({
            name: "Directional suppression emits source-aware contact only",
            passed:
                directionalContacts.some(
                    (event) =>
                        event.interactionType ===
                        "airborne-water-directional-fire" &&
                        event.waterSourceId ===
                        "8f11-hose" &&
                        event.fireSourceId ===
                        "8f11-fire-tube",
                ) &&
                falseExtinguishes.length === 0,
        });

        sources.beginDirectionalWaterSuppressionFrame();

        checks.push({
            name: "Removing direct Water restores full directional Fire length",
            passed:
                source !== undefined &&
                sources.getDirectionalEffectiveLength(
                    source.getId(),
                    400,
                ) === 400,
        });

        /*
         * Burn/scorch history must survive Water. EnvironmentField is the
         * authoritative persistent damage store.
         */
        const burnX = 720;
        const burnY = 360;

        environment.depositBurn(
            burnX,
            burnY,
            34,
            0.85,
            808,
        );

        const burnBefore =
            this.sumBurn(environment);

        water.injectWater(burnX, burnY, 0.08);
        water.update(1 / 60);

        const burnAfter =
            this.sumBurn(environment);

        checks.push({
            name: "Water still preserves burn/scorch history",
            passed:
                burnBefore > 0 &&
                Math.abs(burnAfter - burnBefore) <=
                0.000001,
        });

        interaction.clearGameplayEvents();

        checks.push({
            name: "Gameplay event queues still clear without replay",
            passed:
                interaction.consumeContactEvents().length === 0 &&
                interaction.consumeExtinguishedEvents().length === 0,
        });

        for (const check of checks) {
            console.log(
                `[8F-11] ${check.name}: ${check.passed ? "PASS" : "FAIL"}`,
            );
        }

        console.log(
            `[8F-11] Water-Fire Regression: ${
                checks.every((check) => check.passed) ? "PASS" : "FAIL"
            }`,
        );
    }

    private static sumBurn(
        environment: EnvironmentField,
    ): number {
        let total = 0;

        for (
            let index = 0;
            index < environment.getCellCount();
            index += 1
        ) {
            total +=
                environment.getBurnAmountByIndex(index);
        }

        return total;
    }
}
