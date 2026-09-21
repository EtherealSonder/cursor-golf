import {
    Container,
    Graphics,
    Text,
    TextStyle,
} from "pixi.js";

import type {
    WaterPerformanceSnapshot,
} from "./WaterPerformanceProfiler";

export class WaterPerformanceOverlay {

    private readonly container =
        new Container();

    private readonly background =
        new Graphics();

    private readonly leftText:
        Text;

    private readonly rightText:
        Text;

    private readonly columnWidth =
        395;

    private readonly overlayWidth =
        810;

    private readonly overlayHeight =
        690;

    public constructor() {

        const textStyle =
            new TextStyle({
                fontFamily:
                    "monospace",
                fontSize:
                    11,
                fill:
                    0xffffff,
                lineHeight:
                    14,
            });

        this.leftText =
            new Text({
                text:
                    "",
                style:
                    textStyle,
            });

        this.rightText =
            new Text({
                text:
                    "",
                style:
                    textStyle,
            });

        this.leftText.position.set(
            0,
            0,
        );

        this.rightText.position.set(
            this.columnWidth,
            0,
        );

        this.container.addChild(
            this.background,
            this.leftText,
            this.rightText,
        );

        this.container.eventMode =
            "none";
    }

    public getContainer():
        Container {

        return this.container;
    }

    public setViewportSize(
        viewportWidth: number,
        viewportHeight: number,
    ): void {

        /*
         * Keep the complete diagnostic panel inside the viewport whenever
         * possible. On narrower development windows it anchors at x = 8.
         */
        this.container.position.set(
            Math.max(
                8,
                viewportWidth -
                    this.overlayWidth -
                    8,
            ),
            Math.max(
                8,
                Math.min(
                    16,
                    viewportHeight -
                        this.overlayHeight -
                        8,
                ),
            ),
        );
    }

    public update(
        snapshot:
            WaterPerformanceSnapshot,
    ): void {

        this.leftText.text =
            [
                "8I-9B.4B PERFORMANCE PROFILE",
                "",
                `FPS / frame avg        ${snapshot.actualFps.toFixed(1)} / ${snapshot.actualFrameAverageMilliseconds.toFixed(2)} ms`,
                `World avg / peak       ${snapshot.worldUpdateAverageMilliseconds.toFixed(2)} / ${snapshot.worldUpdatePeakMilliseconds.toFixed(2)} ms`,
                `Measured / remainder   ${snapshot.measuredWorldAverageMilliseconds.toFixed(2)} / ${snapshot.worldRemainderAverageMilliseconds.toFixed(2)} ms`,
                "",
                "WATER SIMULATION",
                `WaterField avg/peak    ${snapshot.waterSimulationAverageMilliseconds.toFixed(2)} / ${snapshot.waterSimulationPeakMilliseconds.toFixed(2)} ms`,
                `Airborne Water         ${snapshot.airborneWaterAverageMilliseconds.toFixed(2)} ms   packets ${snapshot.activeAirbornePackets}`,
                `Water-ground           ${snapshot.waterGroundInteractionAverageMilliseconds.toFixed(2)} ms`,
                `  contact/infiltration ${snapshot.contactWettingAverageMilliseconds.toFixed(2)} / ${snapshot.infiltrationAverageMilliseconds.toFixed(2)} ms`,
                `  diffusion/drying     ${snapshot.moistureDiffusionAverageMilliseconds.toFixed(2)} / ${snapshot.groundDryingAverageMilliseconds.toFixed(2)} ms`,
                `  shallow dissipation  ${snapshot.shallowWaterDissipationAverageMilliseconds.toFixed(2)} ms`,
                `Water cells T/V        ${snapshot.trackedWaterCells}/${snapshot.visibleWaterCells}`,
                `Tracked moisture       ${snapshot.trackedMoistureCells}`,
                "",
                "STANDING WATER",
                `Total avg/peak         ${snapshot.standingWaterAverageMilliseconds.toFixed(2)} / ${snapshot.standingWaterPeakMilliseconds.toFixed(2)} ms`,
                `  scan                 ${snapshot.standingScanAverageMilliseconds.toFixed(2)} ms`,
                `  contours avg/peak    ${snapshot.standingContourAverageMilliseconds.toFixed(2)} / ${snapshot.standingContourPeakMilliseconds.toFixed(2)} ms`,
                `  graphics             ${snapshot.standingGraphicsAverageMilliseconds.toFixed(2)} ms`,
                `  reflections          ${snapshot.standingReflectionAverageMilliseconds.toFixed(2)} ms`,
                `  body/accent contours ${snapshot.standingBodyContours}/${snapshot.standingAccentContours}`,
                `  body/accent vertices ${snapshot.standingBodyVertices}/${snapshot.standingAccentVertices}`,
                "",
                "WET GROUND",
                `Total avg/peak         ${snapshot.wetGroundAverageMilliseconds.toFixed(2)} / ${snapshot.wetGroundPeakMilliseconds.toFixed(2)} ms`,
                `  membership           ${snapshot.wetMembershipAverageMilliseconds.toFixed(2)} ms`,
                `  contours avg/peak    ${snapshot.wetContourAverageMilliseconds.toFixed(2)} / ${snapshot.wetContourPeakMilliseconds.toFixed(2)} ms`,
                `  graphics             ${snapshot.wetGraphicsAverageMilliseconds.toFixed(2)} ms`,
                `  visible/contours     ${snapshot.visibleWetCells}/${snapshot.wetContours}`,
                `  vertices             ${snapshot.wetVertices}`,
                "",
                "SOURCE VFX",
                `Hose avg/peak          ${snapshot.hoseWaterVfxAverageMilliseconds.toFixed(2)} / ${snapshot.hoseWaterVfxPeakMilliseconds.toFixed(2)} ms`,
                `  sources/packets/pts  ${snapshot.hoseActiveSources}/${snapshot.hoseInspectedPackets}/${snapshot.hoseRenderedElements}`,
                `Sprinkler avg/peak     ${snapshot.sprinklerWaterVfxAverageMilliseconds.toFixed(2)} / ${snapshot.sprinklerWaterVfxPeakMilliseconds.toFixed(2)} ms`,
                `  sources/packets/drop ${snapshot.sprinklerActiveSources}/${snapshot.sprinklerInspectedPackets}/${snapshot.sprinklerRenderedElements}`,
                "",
                "SPRINKLER DEEP PROFILE",
                `  inspected/prepared   ${snapshot.sprinklerInspectedPackets}/${snapshot.sprinklerPreparedPackets}`,
                `  source bookkeeping   ${snapshot.sprinklerSourceBookkeepingAverageMilliseconds.toFixed(2)} ms`,
                `  packet traversal     ${snapshot.sprinklerPacketTraversalAverageMilliseconds.toFixed(2)} ms`,
                `    packet preparation ${snapshot.sprinklerPacketPreparationAverageMilliseconds.toFixed(2)} ms`,
                `    renderer sync      ${snapshot.sprinklerRendererSyncAverageMilliseconds.toFixed(2)} ms`,
                `  legacy hide          ${snapshot.sprinklerLegacyHideAverageMilliseconds.toFixed(2)} ms`,
                `  droplet begin/end    ${snapshot.sprinklerDropletBeginAverageMilliseconds.toFixed(2)} / ${snapshot.sprinklerDropletEndAverageMilliseconds.toFixed(2)} ms`,
                `  slot lookup/create   ${snapshot.sprinklerSlotLookupCreateAverageMilliseconds.toFixed(2)} ms`,
                `  transform            ${snapshot.sprinklerTransformAverageMilliseconds.toFixed(2)} ms`,
                `  geometry rebuild     ${snapshot.sprinklerGeometryAverageMilliseconds.toFixed(2)} ms`,
                `  style/alpha/scale    ${snapshot.sprinklerStyleAverageMilliseconds.toFixed(2)} ms`,
                `  slots C/R/H/total    ${snapshot.sprinklerCreatedSlots}/${snapshot.sprinklerReusedSlots}/${snapshot.sprinklerHiddenSlots}/${snapshot.sprinklerTotalSlots}`,
            ].join(
                "\n",
            );

        this.rightText.text =
            [
                "FRAME / RENDER PROFILE",
                `  diagnostic mode      ${snapshot.presentationDiagnosticMode}`,
                `  frame avg            ${snapshot.actualFrameAverageMilliseconds.toFixed(2)} ms`,
                `  Game update avg      ${snapshot.gameUpdateAverageMilliseconds.toFixed(2)} ms`,
                `  World update avg     ${snapshot.worldUpdateAverageMilliseconds.toFixed(2)} ms`,
                `  Pixi render avg/peak ${snapshot.pixiRenderAverageMilliseconds.toFixed(2)} / ${snapshot.pixiRenderPeakMilliseconds.toFixed(2)} ms`,
                `  outside Game/render  ${snapshot.frameOutsideGameAndRenderAverageMilliseconds.toFixed(2)} ms`,
                `  objects F/W/Water    ${snapshot.firePresentationObjects}/${snapshot.windPresentationObjects}/${snapshot.waterPresentationObjects}`,
                "",
                "FRAME SPIKE ATTRIBUTION",
                `  worst World frame    ${snapshot.spikeWorstFrameMilliseconds.toFixed(2)} ms`,
                `  measured in spike    ${snapshot.spikeWorstMeasuredMilliseconds.toFixed(2)} ms`,
                `  >16.67 ms frames     ${snapshot.spikeFrameCount}`,
                `  top spike work       ${snapshot.spikeTopTimings}`,
                "",
                "FIRE / WATER-FIRE HOT PATHS",
                `  water-fire A-dir     ${snapshot.waterFireAirborneDirectionalAverageMilliseconds.toFixed(2)} ms`,
                `  water-fire A-ground  ${snapshot.waterFireAirborneGroundAverageMilliseconds.toFixed(2)} ms`,
                `  water-fire S-ground  ${snapshot.waterFireStandingGroundAverageMilliseconds.toFixed(2)} ms`,
                `  water-fire S-dir     ${snapshot.waterFireStandingDirectionalAverageMilliseconds.toFixed(2)} ms`,
                "",
                "FIRE SIMULATION DEEP PROFILE",
                `  source system        ${snapshot.fireDeep.fireSourceSystemMilliseconds.toFixed(2)} ms`,
                `  manager now/peak    ${snapshot.fireDeep.simulationTotalMilliseconds.toFixed(2)} / ${snapshot.fireDeep.simulationPeakMilliseconds.toFixed(2)} ms`,
                `  active-cell loop    ${snapshot.fireDeep.activeCellLoopMilliseconds.toFixed(2)} ms`,
                `    fuel/moist sample ${snapshot.fireDeep.samplingMilliseconds.toFixed(2)} ms`,
                `    field influence   ${snapshot.fireDeep.environmentInfluenceMilliseconds.toFixed(2)} ms`,
                `    spread work       ${snapshot.fireDeep.spreadMilliseconds.toFixed(2)} ms`,
                `  field ignition      ${snapshot.fireDeep.fieldIgnitionMilliseconds.toFixed(2)} ms`,
                `  cleanup / commit    ${snapshot.fireDeep.cleanupMilliseconds.toFixed(2)} / ${snapshot.fireDeep.commitMilliseconds.toFixed(2)} ms`,
                `  heat cooling        ${snapshot.fireDeep.heatCoolingMilliseconds.toFixed(2)} ms`,
                `  cells/spread passes ${snapshot.fireDeep.simulationActiveCells}/${snapshot.fireDeep.spreadPasses}`,
                `  pending/expired     ${snapshot.fireDeep.pendingIgnitions}/${snapshot.fireDeep.expiredCells}`,
                `  hot candidates      ${snapshot.fireDeep.hotCandidates}`,
                "",
                "FIRE DEEP PROFILE",
                `  scorch renderer      ${snapshot.fireDeep.scorchRendererMilliseconds.toFixed(2)} ms`,
                `  directional region   ${snapshot.fireDeep.directionalRegionMilliseconds.toFixed(2)} ms`,
                `  ground suppression   ${snapshot.fireDeep.directionalSuppressionMilliseconds.toFixed(2)} ms`,
                `  emit ground/jet      ${snapshot.fireDeep.groundEmitterMilliseconds.toFixed(2)} / ${snapshot.fireDeep.directionalEmitterMilliseconds.toFixed(2)} ms`,
                `  pool update          ${snapshot.fireDeep.poolUpdateMilliseconds.toFixed(2)} ms`,
                `  active G/D/total     ${snapshot.fireDeep.activeGroundParticles}/${snapshot.fireDeep.activeDirectionalParticles}/${snapshot.fireDeep.activeParticles}`,
                `  pool capacity        ${snapshot.fireDeep.particleCapacity}`,
                `  acquire A/S R/C      ${snapshot.fireDeep.acquireAttempts}/${snapshot.fireDeep.acquireSuccesses} ${snapshot.fireDeep.reusedParticles}/${snapshot.fireDeep.createdParticles}`,
                `  ground A/E/S         ${snapshot.fireDeep.groundSpawnAttempts}/${snapshot.fireDeep.groundSpawned}/${snapshot.fireDeep.groundSpawnSkipped}`,
                `  jet A/E/S sources    ${snapshot.fireDeep.directionalSpawnAttempts}/${snapshot.fireDeep.directionalSpawned}/${snapshot.fireDeep.directionalSpawnSkipped}  ${snapshot.fireDeep.activeDirectionalSources}`,
                `  collision Q/H        ${snapshot.fireDeep.collisionSweeps}/${snapshot.fireDeep.collisionHits}`,
                `    ground Q/H         ${snapshot.fireDeep.groundCollisionSweeps}/${snapshot.fireDeep.groundCollisionHits}`,
                `    jet Q/H            ${snapshot.fireDeep.directionalCollisionSweeps}/${snapshot.fireDeep.directionalCollisionHits}`,
                "",
                "WIND DEEP PROFILE",
                `  emit global/local    ${snapshot.windDeep.globalEmitterMilliseconds.toFixed(2)} / ${snapshot.windDeep.localEmitterMilliseconds.toFixed(2)} ms`,
                `  pool bookkeeping     ${snapshot.windDeep.poolBookkeepingMilliseconds.toFixed(2)} ms`,
                `  active/capacity      ${snapshot.windDeep.activeParticles}/${snapshot.windDeep.particleCapacity}`,
                `  acquire A/S release  ${snapshot.windDeep.acquireAttempts}/${snapshot.windDeep.acquireSuccesses}/${snapshot.windDeep.releases}`,
                `  global A/E           ${snapshot.windDeep.globalSpawnAttempts}/${snapshot.windDeep.globalSpawned}`,
                `  local A/E sources    ${snapshot.windDeep.localSpawnAttempts}/${snapshot.windDeep.localSpawned}  ${snapshot.windDeep.activeLocalSources}`,
                `  local queries        ${snapshot.windDeep.localWindQueries}`,
                `  local query CPU      ${snapshot.windDeep.localWindQueryMilliseconds.toFixed(2)} ms`,
                "",
                "CONTOUR PIPELINE DEEP PROFILE",
                `Scalar total           ${snapshot.contourScalarTotalMilliseconds.toFixed(2)} ms`,
                `  segment build        ${snapshot.contourSegmentBuildMilliseconds.toFixed(2)} ms`,
                `  keys/adjacency       ${snapshot.contourKeyAdjacencyMilliseconds.toFixed(2)} ms`,
                `  stitching            ${snapshot.contourStitchingMilliseconds.toFixed(2)} ms`,
                `  candidate/scanned    ${snapshot.contourCandidateCells}/${snapshot.contourCellsScanned}`,
                `  scan reduction       ${snapshot.contourScanReductionPercent.toFixed(1)}%`,
                `  active samples/cells ${snapshot.contourActiveSamples}/${snapshot.contourActiveCells}`,
                `  segments/loops       ${snapshot.contourSegments}/${snapshot.contourLoops}`,
                `  raw vertices         ${snapshot.contourRawVertices}`,
                "",
                "STANDING CONTOUR POST",
                `  total/scalar         ${snapshot.standingDeepTotalMilliseconds.toFixed(2)} / ${snapshot.standingDeepScalarMilliseconds.toFixed(2)} ms`,
                `  post/peak-depth      ${snapshot.standingDeepPostMilliseconds.toFixed(2)} / ${snapshot.standingDeepPeakDepthMilliseconds.toFixed(2)} ms`,
                `  loops raw/accepted   ${snapshot.standingDeepRawLoops}/${snapshot.standingDeepAcceptedLoops}`,
                `  vertices raw/final   ${snapshot.standingDeepRawVertices}/${snapshot.standingDeepFinalVertices}`,
                "",
                "WET CONTOUR POST",
                `  total/scalar         ${snapshot.wetDeepTotalMilliseconds.toFixed(2)} / ${snapshot.wetDeepScalarMilliseconds.toFixed(2)} ms`,
                `  post                 ${snapshot.wetDeepPostMilliseconds.toFixed(2)} ms`,
                `  loops raw/accepted   ${snapshot.wetDeepRawLoops}/${snapshot.wetDeepAcceptedLoops}`,
                `  vertices raw/final   ${snapshot.wetDeepRawVertices}/${snapshot.wetDeepFinalVertices}`,
            ].join(
                "\n",
            );

        this.background
            .clear()
            .roundRect(
                -10,
                -10,
                this.overlayWidth,
                this.overlayHeight,
                8,
            )
            .fill({
                color:
                    0x071a18,
                alpha:
                    0.92,
            });
    }

    public destroy():
        void {

        this.container
            .removeFromParent();

        this.container
            .destroy({
                children:
                    true,
            });
    }
}
