import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { WaterPerformanceSnapshot } from "./WaterPerformanceProfiler";

export class WaterPerformanceOverlay {
    private readonly container = new Container();
    private readonly background = new Graphics();
    private readonly text: Text;

    public constructor() {
        this.text = new Text({
            text: "",
            style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xffffff, lineHeight: 14 }),
        });
        this.container.addChild(this.background, this.text);
        this.container.eventMode = "none";
    }

    public getContainer(): Container { return this.container; }

    public setViewportSize(viewportWidth: number, viewportHeight: number): void {
        this.container.position.set(Math.max(8, viewportWidth - 330), Math.max(8, viewportHeight - 555));
    }

    public update(snapshot: WaterPerformanceSnapshot): void {
        this.text.text = [
            "8I-3 BROAD PERFORMANCE PROFILE", "",
            `Actual FPS             ${snapshot.actualFps.toFixed(1)}`,
            `Actual frame avg       ${snapshot.actualFrameAverageMilliseconds.toFixed(2)} ms`,
            `World update avg       ${snapshot.worldUpdateAverageMilliseconds.toFixed(2)} ms`,
            `World update peak      ${snapshot.worldUpdatePeakMilliseconds.toFixed(2)} ms`,
            `Measured World         ${snapshot.measuredWorldAverageMilliseconds.toFixed(2)} ms`,
            `WORLD REMAINDER        ${snapshot.worldRemainderAverageMilliseconds.toFixed(2)} ms`, "",
            `Surface                ${snapshot.surfaceAverageMilliseconds.toFixed(2)} ms`,
            `Water sources          ${snapshot.waterSourcesAverageMilliseconds.toFixed(2)} ms`,
            `Airborne Water         ${snapshot.airborneWaterAverageMilliseconds.toFixed(2)} ms`,
            `Water/Fire             ${snapshot.waterFireInteractionAverageMilliseconds.toFixed(2)} ms`,
            `Water simulation       ${snapshot.waterSimulationAverageMilliseconds.toFixed(2)} ms`,
            `Water-ground           ${snapshot.waterGroundInteractionAverageMilliseconds.toFixed(2)} ms`,
            `  contact wetting      ${snapshot.contactWettingAverageMilliseconds.toFixed(2)} ms`,
            `  infiltration        ${snapshot.infiltrationAverageMilliseconds.toFixed(2)} ms`,
            `  moisture diffusion  ${snapshot.moistureDiffusionAverageMilliseconds.toFixed(2)} ms`,
            `  ground drying       ${snapshot.groundDryingAverageMilliseconds.toFixed(2)} ms`,
            `  shallow dissipation ${snapshot.shallowWaterDissipationAverageMilliseconds.toFixed(2)} ms`,
            `Moisture bridge        ${snapshot.moistureSurfaceBridgeAverageMilliseconds.toFixed(2)} ms`,
            `Wet ground             ${snapshot.wetGroundAverageMilliseconds.toFixed(2)} ms`,
            `Standing Water         ${snapshot.standingWaterAverageMilliseconds.toFixed(2)} ms`,
            `Fire simulation        ${snapshot.fireSimulationAverageMilliseconds.toFixed(2)} ms`,
            `Fire presentation      ${snapshot.firePresentationAverageMilliseconds.toFixed(2)} ms`,
            `Entities               ${snapshot.entitiesAverageMilliseconds.toFixed(2)} ms`,
            `Dynamic collisions     ${snapshot.dynamicCollisionsAverageMilliseconds.toFixed(2)} ms`,
            `Hose collisions        ${snapshot.hoseCollisionsAverageMilliseconds.toFixed(2)} ms`,
            `Mechanism sync         ${snapshot.mechanismSyncAverageMilliseconds.toFixed(2)} ms`,
            `Water obstacle sync    ${snapshot.waterObstacleSyncAverageMilliseconds.toFixed(2)} ms`,
            `Wind presentation      ${snapshot.windPresentationAverageMilliseconds.toFixed(2)} ms`,
            `Gameplay presentation  ${snapshot.gameplayPresentationAverageMilliseconds.toFixed(2)} ms`,
            `Debug + metrics        ${snapshot.debugAndMetricsAverageMilliseconds.toFixed(2)} ms`, "",
            `Water cells T/V/R      ${snapshot.trackedWaterCells}/${snapshot.visibleWaterCells}/${snapshot.activeRenderRegions}`,
            `Standing tex C/T       ${snapshot.standingWaterTextureCommits}/${snapshot.standingWaterUploadedTexels}`,
            `Wet tex C/T            ${snapshot.wetGroundTextureCommits}/${snapshot.wetGroundUploadedTexels}`,
            `Other tex C/T          ${snapshot.otherTextureCommits}/${snapshot.otherUploadedTexels}`,
        ].join("\n");

        this.background.clear().roundRect(-10, -10, 322, 542, 8).fill({ color: 0x071a18, alpha: 0.90 });
    }

    public destroy(): void {
        this.container.removeFromParent();
        this.container.destroy({ children: true });
    }
}
