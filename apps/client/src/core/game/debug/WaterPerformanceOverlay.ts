import {
    Container,
    Graphics,
    Text,
    TextStyle,
} from "pixi.js";

import type {
    WaterPerformanceSnapshot,
} from "./WaterPerformanceProfiler";

/**
 * O1 Water deep-profile HUD.
 *
 * This deliberately favours Water attribution over the general stress-test
 * summary. It stays compact enough to remain visible while the course is
 * played and recorded.
 */
export class WaterPerformanceOverlay {

    private readonly container = new Container();
    private readonly background = new Graphics();
    private readonly text: Text;

    private readonly overlayWidth = 445;
    private readonly overlayHeight = 590;
    private readonly padding = 10;

    public constructor() {
        this.text = new Text({
            text: "",
            style: new TextStyle({
                fontFamily: "monospace",
                fontSize: 10,
                fill: 0xffffff,
                lineHeight: 12,
            }),
        });

        this.text.position.set(this.padding, this.padding);
        this.container.addChild(this.background, this.text);
        this.container.eventMode = "none";
        this.container.visible = true;
    }

    public getContainer(): Container {
        return this.container;
    }

    public setViewportSize(viewportWidth: number, viewportHeight: number): void {
        const availableWidth = Math.max(1, viewportWidth - 16);
        const availableHeight = Math.max(1, viewportHeight - 16);
        const scale = Math.min(
            1,
            availableWidth / this.overlayWidth,
            availableHeight / this.overlayHeight,
        );

        this.container.scale.set(scale);
        this.container.position.set(
            Math.max(8, viewportWidth - this.overlayWidth * scale - 8),
            8,
        );
    }

    public update(snapshot: WaterPerformanceSnapshot): void {
        const waterFire = snapshot.waterFireInteractionAverageMilliseconds;
        const waterSimulationTotal =
            snapshot.waterSourcesAverageMilliseconds +
            snapshot.airborneWaterAverageMilliseconds +
            snapshot.waterSimulationAverageMilliseconds +
            snapshot.waterGroundInteractionAverageMilliseconds +
            snapshot.moistureSurfaceBridgeAverageMilliseconds +
            waterFire;

        const waterPresentationTotal =
            snapshot.standingWaterAverageMilliseconds +
            snapshot.wetGroundAverageMilliseconds +
            snapshot.sprinklerWaterVfxAverageMilliseconds +
            snapshot.hoseWaterVfxAverageMilliseconds +
            snapshot.waterVfxCoreAverageMilliseconds +
            snapshot.waterImpactVfxAverageMilliseconds;

        const frameBudget = 1000 / 60;
        const budgetStatus = snapshot.actualFrameAverageMilliseconds <= frameBudget
            ? "OK"
            : "OVER";

        this.text.text = [
            "O1 WATER DEEP PROFILE",
            `FPS ${snapshot.actualFps.toFixed(1)}  Frame ${snapshot.actualFrameAverageMilliseconds.toFixed(2)} ms [${budgetStatus}]`,
            `World ${snapshot.worldUpdateAverageMilliseconds.toFixed(2)}  Render ${snapshot.pixiRenderAverageMilliseconds.toFixed(2)} ms`,
            "",
            "WATER SIMULATION                 AVG ms",
            `Sources / emission             ${snapshot.waterSourcesAverageMilliseconds.toFixed(2).padStart(7)}`,
            `Airborne packets               ${snapshot.airborneWaterAverageMilliseconds.toFixed(2).padStart(7)}`,
            `Field / flow                    ${snapshot.waterSimulationAverageMilliseconds.toFixed(2).padStart(7)}`,
            `Ground interaction              ${snapshot.waterGroundInteractionAverageMilliseconds.toFixed(2).padStart(7)}`,
            `  contact wetting               ${snapshot.contactWettingAverageMilliseconds.toFixed(2).padStart(7)}`,
            `  infiltration                 ${snapshot.infiltrationAverageMilliseconds.toFixed(2).padStart(7)}`,
            `  moisture diffusion           ${snapshot.moistureDiffusionAverageMilliseconds.toFixed(2).padStart(7)}`,
            `  drying                       ${snapshot.groundDryingAverageMilliseconds.toFixed(2).padStart(7)}`,
            `  thin-film dissipation        ${snapshot.shallowWaterDissipationAverageMilliseconds.toFixed(2).padStart(7)}`,
            `Moisture -> surface             ${snapshot.moistureSurfaceBridgeAverageMilliseconds.toFixed(2).padStart(7)}`,
            `Water / Fire                    ${waterFire.toFixed(2).padStart(7)}`,
            `SIM TOTAL                       ${waterSimulationTotal.toFixed(2).padStart(7)}`,
            "",
            "WATER PRESENTATION               AVG ms",
            `Standing Water                  ${snapshot.standingWaterAverageMilliseconds.toFixed(2).padStart(7)}`,
            `  scan / contour                ${(snapshot.standingScanAverageMilliseconds + snapshot.standingContourAverageMilliseconds).toFixed(2).padStart(7)}`,
            `  graphics / reflection         ${(snapshot.standingGraphicsAverageMilliseconds + snapshot.standingReflectionAverageMilliseconds).toFixed(2).padStart(7)}`,
            `Wet Ground                      ${snapshot.wetGroundAverageMilliseconds.toFixed(2).padStart(7)}`,
            `  membership / contour          ${(snapshot.wetMembershipAverageMilliseconds + snapshot.wetContourAverageMilliseconds).toFixed(2).padStart(7)}`,
            `  graphics                      ${snapshot.wetGraphicsAverageMilliseconds.toFixed(2).padStart(7)}`,
            `Sprinkler VFX                   ${snapshot.sprinklerWaterVfxAverageMilliseconds.toFixed(2).padStart(7)}`,
            `Hose VFX                        ${snapshot.hoseWaterVfxAverageMilliseconds.toFixed(2).padStart(7)}`,
            `Water VFX core                  ${snapshot.waterVfxCoreAverageMilliseconds.toFixed(2).padStart(7)}`,
            `Impact VFX                      ${snapshot.waterImpactVfxAverageMilliseconds.toFixed(2).padStart(7)}`,
            `PRESENTATION TOTAL              ${waterPresentationTotal.toFixed(2).padStart(7)}`,
            "",
            "LOAD / GEOMETRY",
            `Water cells tracked/visible ${snapshot.trackedWaterCells}/${snapshot.visibleWaterCells}`,
            `Moisture cells ${snapshot.trackedMoistureCells}  packets ${snapshot.activeAirbornePackets}`,
            `Standing verts ${snapshot.standingBodyVertices + snapshot.standingAccentVertices}`,
            `Wet verts ${snapshot.wetVertices}  visible wet ${snapshot.visibleWetCells}`,
            `Sprinkler packets ${snapshot.sprinklerInspectedPackets}  slots ${snapshot.sprinklerTotalSlots}`,
            `Hose packets ${snapshot.hoseInspectedPackets}  elements ${snapshot.hoseRenderedElements}`,
            "",
            "SPIKES",
            `>16.67ms ${snapshot.spikeFrameCount}  worst ${snapshot.spikeWorstFrameMilliseconds.toFixed(2)} ms`,
            `Top: ${snapshot.spikeTopTimings}`,
        ].join("\n");

        this.background
            .clear()
            .roundRect(0, 0, this.overlayWidth, this.overlayHeight, 8)
            .fill({ color: 0x071a18, alpha: 0.92 });
    }

    public destroy(): void {
        this.container.removeFromParent();
        this.container.destroy({ children: true });
    }
}
