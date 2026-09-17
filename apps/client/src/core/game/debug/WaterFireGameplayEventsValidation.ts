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

export class WaterFireGameplayEventsValidation {
    public static run(): void {
        console.log("[8F-10] WATER-FIRE GAMEPLAY EVENTS");

        const surface = new SurfaceSystem(SurfaceType.Grass);
        const environment = new EnvironmentField(surface);
        const fire = new FireManager(surface, environment, new LocalWindSystem([]));
        const sources = new FireSourceSystem(environment);
        const water = new WaterField();
        const interaction = new WaterFireInteraction();
        const checks: Array<{name: string; passed: boolean}> = [];

        fire.ignite(500, 400, 1);
        const sweep: AirborneWaterSweep = {
            sourceId: "8f10-hose", sequence: 1, waterAmount: 0.01,
            startX: 500, startY: 320, startHeight: 24,
            endX: 500, endY: 480, endHeight: 24,
        };
        interaction.updateAirborneWaterGroundFire([sweep], fire);
        const groundContacts = interaction.consumeContactEvents();
        const extinguished = interaction.consumeExtinguishedEvents();

        checks.push({
            name: "Ground Fire Water contact emits a semantic contact event",
            passed: groundContacts.some(e =>
                e.interactionType === "airborne-water-ground-fire" &&
                e.waterSourceId === "8f10-hose"),
        });
        checks.push({
            name: "Actual Ground Fire removal emits an extinguished event",
            passed: extinguished.length > 0 && extinguished.every(e => e.extinguished),
        });

        sources.addSource({
            id: "8f10-fire-tube",
            type: FireSourceType.Directional,
            enabled: true,
            positionX: 400, positionY: 600,
            directionRadians: 0,
            length: 400, halfWidth: 14,
            heatPerSecond: 0.72,
            endHeatMultiplier: 0.58,
        });

        const jetSweep: AirborneWaterSweep = {
            sourceId: "8f10-sprinkler", sequence: 2, waterAmount: 0.01,
            startX: 600, startY: 520, startHeight: 24,
            endX: 600, endY: 680, endHeight: 24,
        };
        sources.beginDirectionalWaterSuppressionFrame();
        interaction.updateAirborneWaterDirectionalFire([jetSweep], sources);
        const jetContacts = interaction.consumeContactEvents();
        const jetExtinguished = interaction.consumeExtinguishedEvents();

        checks.push({
            name: "Fire Tube contact event carries Water and Fire source identity",
            passed: jetContacts.some(e =>
                e.interactionType === "airborne-water-directional-fire" &&
                e.waterSourceId === "8f10-sprinkler" &&
                e.fireSourceId === "8f10-fire-tube"),
        });
        checks.push({
            name: "Temporary Fire Tube suppression is not reported as extinguished",
            passed: jetExtinguished.length === 0,
        });
        checks.push({
            name: "Consumed events are removed from the queue",
            passed: interaction.consumeContactEvents().length === 0 &&
                interaction.consumeExtinguishedEvents().length === 0,
        });

        water.injectWater(600, 600, 0.08);
        sources.beginDirectionalWaterSuppressionFrame();
        interaction.updateStandingWaterDirectionalFire(water, sources);
        const standing = interaction.consumeContactEvents();

        checks.push({
            name: "Standing Water x Fire Tube emits depth-aware contact event",
            passed: standing.some(e =>
                e.interactionType === "standing-water-directional-fire" &&
                e.fireSourceId === "8f10-fire-tube" &&
                e.waterAmount > 0),
        });

        interaction.clearGameplayEvents();
        checks.push({
            name: "Explicit event clear empties both queues",
            passed: interaction.consumeContactEvents().length === 0 &&
                interaction.consumeExtinguishedEvents().length === 0,
        });

        for (const check of checks) {
            console.log(`[8F-10] ${check.name}: ${check.passed ? "PASS" : "FAIL"}`);
        }

        console.log(
            `[8F-10] Water-Fire Gameplay Events: ${
                checks.every(c => c.passed) ? "PASS" : "FAIL"
            }`,
        );
    }
}
