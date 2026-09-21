import { ScalarFieldContourBuilder } from "../../rendering/ScalarFieldContourBuilder";
import { DEFAULT_WORLD_PERFORMANCE_PROFILE_DEFINITION } from "./WorldPerformanceProfileDefinition";
import type { WorldPerformanceProfileDefinition } from "./WorldPerformanceProfileDefinition";

export type ProfileTimingName =
    | "surface" | "waterSources" | "airborneWater" | "waterFireInteraction"
    | "waterFireAirborneDirectional" | "waterFireAirborneGround"
    | "waterFireStandingGround" | "waterFireStandingDirectional"
    | "waterSimulation" | "waterGroundInteraction" | "moistureSurfaceBridge"
    | "wetGround" | "standingWater" | "hoseWaterVfx" | "sprinklerWaterVfx"
    | "fireSimulation" | "firePresentation" | "fireDirectionalValidation"
    | "fireSourceVisualizer" | "fireVfxUpdate" | "entities" | "hoseBallForce"
    | "ballTrail" | "dynamicCollisions" | "hoseCollisions" | "mechanismSync"
    | "waterObstacleSync" | "windPresentation" | "gameplayPresentation" | "debugAndMetrics";

export interface StandingWaterProfileDetails {
    readonly scanMilliseconds: number;
    readonly contourMilliseconds: number;
    readonly graphicsMilliseconds: number;
    readonly reflectionMilliseconds: number;
    readonly bodyContours: number;
    readonly accentContours: number;
    readonly bodyVertices: number;
    readonly accentVertices: number;
}
export interface WetGroundProfileDetails {
    readonly membershipMilliseconds: number;
    readonly contourMilliseconds: number;
    readonly graphicsMilliseconds: number;
    readonly trackedMoistureCells: number;
    readonly visibleWetCells: number;
    readonly contours: number;
    readonly vertices: number;
}
export interface WaterVfxProfileDetails {
    readonly activeSources: number;
    readonly inspectedPackets: number;
    readonly renderedElements: number;
}
export interface SprinklerDeepProfileDetails extends WaterVfxProfileDetails {
    readonly preparedPackets: number;
    readonly sourceBookkeepingMilliseconds: number;
    readonly packetTraversalMilliseconds: number;
    readonly packetPreparationMilliseconds: number;
    readonly rendererSyncMilliseconds: number;
    readonly legacyHideMilliseconds: number;
    readonly dropletRenderer: {
        readonly beginFrameMilliseconds: number;
        readonly slotLookupCreateMilliseconds: number;
        readonly transformMilliseconds: number;
        readonly geometryMilliseconds: number;
        readonly styleMilliseconds: number;
        readonly endFrameMilliseconds: number;
        readonly createdSlots: number;
        readonly reusedSlots: number;
        readonly hiddenSlots: number;
        readonly totalSlots: number;
    };
}


export interface FireDeepProfileDetails {
    readonly fireSourceSystemMilliseconds: number;
    readonly simulationTotalMilliseconds: number;
    readonly simulationPeakMilliseconds: number;
    readonly activeCellLoopMilliseconds: number;
    readonly samplingMilliseconds: number;
    readonly environmentInfluenceMilliseconds: number;
    readonly spreadMilliseconds: number;
    readonly fieldIgnitionMilliseconds: number;
    readonly cleanupMilliseconds: number;
    readonly commitMilliseconds: number;
    readonly heatCoolingMilliseconds: number;
    readonly simulationActiveCells: number;
    readonly spreadPasses: number;
    readonly pendingIgnitions: number;
    readonly expiredCells: number;
    readonly hotCandidates: number;
    readonly groundEmitterMilliseconds: number;
    readonly directionalEmitterMilliseconds: number;
    readonly poolUpdateMilliseconds: number;
    readonly scorchRendererMilliseconds: number;
    readonly directionalRegionMilliseconds: number;
    readonly directionalSuppressionMilliseconds: number;
    readonly activeGroundParticles: number;
    readonly activeDirectionalParticles: number;
    readonly activeParticles: number;
    readonly particleCapacity: number;
    readonly acquireAttempts: number;
    readonly acquireSuccesses: number;
    readonly reusedParticles: number;
    readonly createdParticles: number;
    readonly groundSpawnAttempts: number;
    readonly groundSpawned: number;
    readonly groundSpawnSkipped: number;
    readonly directionalSpawnAttempts: number;
    readonly directionalSpawned: number;
    readonly directionalSpawnSkipped: number;
    readonly activeDirectionalSources: number;
    readonly collisionSweeps: number;
    readonly collisionHits: number;
    readonly groundCollisionSweeps: number;
    readonly groundCollisionHits: number;
    readonly directionalCollisionSweeps: number;
    readonly directionalCollisionHits: number;
}

export interface WindDeepProfileDetails {
    readonly globalEmitterMilliseconds: number;
    readonly localEmitterMilliseconds: number;
    readonly poolBookkeepingMilliseconds: number;
    readonly activeParticles: number;
    readonly particleCapacity: number;
    readonly acquireAttempts: number;
    readonly acquireSuccesses: number;
    readonly releases: number;
    readonly globalSpawnAttempts: number;
    readonly globalSpawned: number;
    readonly localSpawnAttempts: number;
    readonly localSpawned: number;
    readonly activeLocalSources: number;
    readonly localWindQueries: number;
    readonly localWindQueryMilliseconds: number;
}

export interface WaterPerformanceSnapshot {
    readonly fireDeep: FireDeepProfileDetails;
    readonly spikeWorstFrameMilliseconds: number;
    readonly spikeWorstMeasuredMilliseconds: number;
    readonly spikeTopTimings: string;
    readonly spikeFrameCount: number;
    readonly windDeep: WindDeepProfileDetails;
    readonly actualFps: number; readonly actualFrameAverageMilliseconds: number;
    readonly gameUpdateAverageMilliseconds: number;
    readonly pixiRenderAverageMilliseconds: number; readonly pixiRenderPeakMilliseconds: number;
    readonly frameOutsideGameAndRenderAverageMilliseconds: number;
    readonly presentationDiagnosticMode: string;
    readonly firePresentationObjects: number; readonly windPresentationObjects: number;
    readonly waterPresentationObjects: number;
    readonly worldUpdateAverageMilliseconds: number; readonly worldUpdatePeakMilliseconds: number;
    readonly waterSimulationAverageMilliseconds: number; readonly waterSimulationPeakMilliseconds: number;
    readonly airborneWaterAverageMilliseconds: number; readonly standingWaterAverageMilliseconds: number;
    readonly standingWaterPeakMilliseconds: number; readonly wetGroundAverageMilliseconds: number;
    readonly wetGroundPeakMilliseconds: number; readonly hoseWaterVfxAverageMilliseconds: number;
    readonly hoseWaterVfxPeakMilliseconds: number; readonly sprinklerWaterVfxAverageMilliseconds: number;
    readonly sprinklerWaterVfxPeakMilliseconds: number; readonly surfaceAverageMilliseconds: number;
    readonly waterSourcesAverageMilliseconds: number; readonly waterFireInteractionAverageMilliseconds: number;
    readonly waterFireAirborneDirectionalAverageMilliseconds: number;
    readonly waterFireAirborneGroundAverageMilliseconds: number;
    readonly waterFireStandingGroundAverageMilliseconds: number;
    readonly waterFireStandingDirectionalAverageMilliseconds: number;
    readonly waterGroundInteractionAverageMilliseconds: number; readonly moistureSurfaceBridgeAverageMilliseconds: number;
    readonly contactWettingAverageMilliseconds: number; readonly infiltrationAverageMilliseconds: number;
    readonly moistureDiffusionAverageMilliseconds: number; readonly groundDryingAverageMilliseconds: number;
    readonly shallowWaterDissipationAverageMilliseconds: number; readonly fireSimulationAverageMilliseconds: number;
    readonly firePresentationAverageMilliseconds: number; readonly entitiesAverageMilliseconds: number;
    readonly hoseBallForceAverageMilliseconds: number; readonly ballTrailAverageMilliseconds: number;
    readonly dynamicCollisionsAverageMilliseconds: number; readonly hoseCollisionsAverageMilliseconds: number;
    readonly mechanismSyncAverageMilliseconds: number; readonly waterObstacleSyncAverageMilliseconds: number;
    readonly windPresentationAverageMilliseconds: number; readonly gameplayPresentationAverageMilliseconds: number;
    readonly debugAndMetricsAverageMilliseconds: number; readonly measuredWorldAverageMilliseconds: number;
    readonly worldRemainderAverageMilliseconds: number; readonly trackedWaterCells: number;
    readonly visibleWaterCells: number; readonly activeRenderRegions: number;
    readonly activeAirbornePackets: number; readonly trackedMoistureCells: number;
    readonly standingScanAverageMilliseconds: number; readonly standingContourAverageMilliseconds: number;
    readonly standingContourPeakMilliseconds: number;
    readonly standingGraphicsAverageMilliseconds: number; readonly standingReflectionAverageMilliseconds: number;
    readonly standingBodyContours: number; readonly standingAccentContours: number;
    readonly standingBodyVertices: number; readonly standingAccentVertices: number;
    readonly wetMembershipAverageMilliseconds: number; readonly wetContourAverageMilliseconds: number;
    readonly wetContourPeakMilliseconds: number;
    readonly wetGraphicsAverageMilliseconds: number; readonly visibleWetCells: number;
    readonly wetContours: number; readonly wetVertices: number;
    readonly hoseActiveSources: number; readonly hoseInspectedPackets: number; readonly hoseRenderedElements: number;
    readonly sprinklerActiveSources: number; readonly sprinklerInspectedPackets: number; readonly sprinklerRenderedElements: number;
    readonly sprinklerPreparedPackets: number;
    readonly sprinklerSourceBookkeepingAverageMilliseconds: number;
    readonly sprinklerPacketTraversalAverageMilliseconds: number;
    readonly sprinklerPacketPreparationAverageMilliseconds: number;
    readonly sprinklerRendererSyncAverageMilliseconds: number;
    readonly sprinklerLegacyHideAverageMilliseconds: number;
    readonly sprinklerDropletBeginAverageMilliseconds: number;
    readonly sprinklerSlotLookupCreateAverageMilliseconds: number;
    readonly sprinklerTransformAverageMilliseconds: number;
    readonly sprinklerGeometryAverageMilliseconds: number;
    readonly sprinklerStyleAverageMilliseconds: number;
    readonly sprinklerDropletEndAverageMilliseconds: number;
    readonly sprinklerCreatedSlots: number; readonly sprinklerReusedSlots: number;
    readonly sprinklerHiddenSlots: number; readonly sprinklerTotalSlots: number;
    readonly standingWaterTextureCommits: number; readonly standingWaterUploadedTexels: number;
    readonly wetGroundTextureCommits: number; readonly wetGroundUploadedTexels: number;
    readonly otherTextureCommits: number; readonly otherUploadedTexels: number;
    readonly contourScalarTotalMilliseconds:number; readonly contourSegmentBuildMilliseconds:number;
    readonly contourKeyAdjacencyMilliseconds:number; readonly contourStitchingMilliseconds:number;
    readonly contourCandidateCells:number; readonly contourCellsScanned:number;
    readonly contourScanReductionPercent:number; readonly contourActiveSamples:number;
    readonly contourActiveCells:number; readonly contourSegments:number;
    readonly contourLoops:number; readonly contourRawVertices:number;
    readonly standingDeepTotalMilliseconds:number; readonly standingDeepScalarMilliseconds:number;
    readonly standingDeepPostMilliseconds:number; readonly standingDeepPeakDepthMilliseconds:number;
    readonly standingDeepRawLoops:number; readonly standingDeepAcceptedLoops:number;
    readonly standingDeepRawVertices:number; readonly standingDeepFinalVertices:number;
    readonly wetDeepTotalMilliseconds:number; readonly wetDeepScalarMilliseconds:number;
    readonly wetDeepPostMilliseconds:number; readonly wetDeepRawLoops:number; readonly wetDeepAcceptedLoops:number;
    readonly wetDeepRawVertices:number; readonly wetDeepFinalVertices:number;
}
interface TimingAccumulator { total: number; peak: number; samples: number; }
interface TextureAccumulator { commits: number; texels: number; }
interface DetailAccumulator { total: number; samples: number; peak?: number; }

/**
 * 8I-9B.4A keeps the existing renderer-facing profiler contract intact.
 * Contour builders now expose their latest internal deep profile so the
 * reconstruction pipeline can be inspected without changing World wiring.
 */
export class WaterPerformanceProfiler {
    private readonly timings = new Map<string, TimingAccumulator>();
    private readonly measurementStack: string[] = [];
    private readonly currentFrameTimings = new Map<ProfileTimingName, number>();
    private spikeWorstFrameMilliseconds = 0;
    private spikeWorstMeasuredMilliseconds = 0;
    private spikeTopTimings = "none";
    private spikeFrameCount = 0;
    private worldFrameStartedAt = 0; private worldFrameTotal = 0; private worldFramePeak = 0; private worldFrameSamples = 0;
    private actualFrameTotal = 0; private actualFrameSamples = 0; private reportAccumulator = 0;
    private gameUpdateTotal = 0; private gameUpdateSamples = 0;
    private pixiRenderTotal = 0; private pixiRenderPeak = 0; private pixiRenderSamples = 0;
    private presentationDiagnosticMode = "all";
    private firePresentationObjects = 0; private windPresentationObjects = 0; private waterPresentationObjects = 0;
    private trackedWaterCells = 0; private visibleWaterCells = 0; private activeRenderRegions = 0;
    private activeAirbornePackets = 0; private trackedMoistureCells = 0;
    private standingTexture: TextureAccumulator = { commits: 0, texels: 0 };
    private wetTexture: TextureAccumulator = { commits: 0, texels: 0 };
    private otherTexture: TextureAccumulator = { commits: 0, texels: 0 };
    private standingDetails = { scan: {total:0,samples:0}, contour:{total:0,samples:0,peak:0}, graphics:{total:0,samples:0}, reflection:{total:0,samples:0}, bodyContours:0, accentContours:0, bodyVertices:0, accentVertices:0 };
    private wetDetails = { membership:{total:0,samples:0}, contour:{total:0,samples:0,peak:0}, graphics:{total:0,samples:0}, visibleWetCells:0, contours:0, vertices:0 };
    private hoseDetails: WaterVfxProfileDetails = { activeSources:0, inspectedPackets:0, renderedElements:0 };
    private sprinklerDetails: WaterVfxProfileDetails = { activeSources:0, inspectedPackets:0, renderedElements:0 };
    private sprinklerDeepDetails = {
        sourceBookkeeping:{total:0,samples:0}, packetTraversal:{total:0,samples:0},
        packetPreparation:{total:0,samples:0}, rendererSync:{total:0,samples:0}, legacyHide:{total:0,samples:0},
        dropletBegin:{total:0,samples:0}, slotLookupCreate:{total:0,samples:0}, transform:{total:0,samples:0},
        geometry:{total:0,samples:0}, style:{total:0,samples:0}, dropletEnd:{total:0,samples:0},
        preparedPackets:0, createdSlots:0, reusedSlots:0, hiddenSlots:0, totalSlots:0,
    };
    private groundBreakdown = { contactWetting:0, infiltration:0, moistureDiffusion:0, groundDrying:0, shallowWaterDissipation:0, samples:0 };
    private fireDeepDetails: FireDeepProfileDetails = this.createEmptyFireDeepProfile();
    private windDeepDetails: WindDeepProfileDetails = this.createEmptyWindDeepProfile();
    private latestSnapshot: WaterPerformanceSnapshot = this.createEmptySnapshot();

    public constructor(private readonly definition: WorldPerformanceProfileDefinition = DEFAULT_WORLD_PERFORMANCE_PROFILE_DEFINITION) { }
    public isEnabled(): boolean { return this.definition.enabled; }
    public isOverlayEnabled(): boolean { return this.definition.enabled && this.definition.overlayEnabled; }
    public recordFramePresentationDiagnostics(gameUpdateMilliseconds:number,pixiRenderMilliseconds:number,mode:string,fireObjects:number,windObjects:number,waterObjects:number):void {
        if(!this.definition.enabled)return;
        if(Number.isFinite(gameUpdateMilliseconds)){this.gameUpdateTotal+=Math.max(0,gameUpdateMilliseconds);this.gameUpdateSamples+=1;}
        if(Number.isFinite(pixiRenderMilliseconds)){const v=Math.max(0,pixiRenderMilliseconds);this.pixiRenderTotal+=v;this.pixiRenderPeak=Math.max(this.pixiRenderPeak,v);this.pixiRenderSamples+=1;}
        this.presentationDiagnosticMode=mode;
        this.firePresentationObjects=Math.max(0,fireObjects);
        this.windPresentationObjects=Math.max(0,windObjects);
        this.waterPresentationObjects=Math.max(0,waterObjects);
    }
    public beginFrame(): void { if (this.definition.enabled) { this.worldFrameStartedAt = performance.now(); this.currentFrameTimings.clear(); } }
    public endFrame(deltaTime:number):void { if(!this.definition.enabled)return; if(this.worldFrameStartedAt>0){const e=performance.now()-this.worldFrameStartedAt;this.worldFrameTotal+=e;this.worldFramePeak=Math.max(this.worldFramePeak,e);this.worldFrameSamples+=1; const measured=Array.from(this.currentFrameTimings.values()).reduce((a,b)=>a+b,0); if(e>=16.67)this.spikeFrameCount+=1; if(e>this.spikeWorstFrameMilliseconds){this.spikeWorstFrameMilliseconds=e;this.spikeWorstMeasuredMilliseconds=measured;this.spikeTopTimings=Array.from(this.currentFrameTimings.entries()).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([n,v])=>`${n} ${v.toFixed(2)}`).join(" | ")||"none";}} const d=Math.max(0,deltaTime);this.actualFrameTotal+=d*1000;this.actualFrameSamples+=1;this.reportAccumulator+=d;if(this.reportAccumulator>=this.definition.consoleReportIntervalSeconds){this.publishSnapshot();this.reportAccumulator%=this.definition.consoleReportIntervalSeconds;} }
    public measure<T>(name:ProfileTimingName,action:()=>T):T { if(!this.definition.enabled)return action();const s=performance.now();this.measurementStack.push(name);try{return action();}finally{this.measurementStack.pop();const e=performance.now()-s;const a=this.timings.get(name)??{total:0,peak:0,samples:0};a.total+=e;a.peak=Math.max(a.peak,e);a.samples+=1;this.timings.set(name,a);this.currentFrameTimings.set(name,(this.currentFrameTimings.get(name)??0)+e);} }
    public setWaterCounts(tracked:number,visible:number,regions:number):void { this.trackedWaterCells=tracked;this.visibleWaterCells=visible;this.activeRenderRegions=regions; }
    public setGlobalWaterCounts(airborne:number,moisture:number):void { this.activeAirbornePackets=airborne;this.trackedMoistureCells=moisture; }
    public recordStandingWaterDetails(d:StandingWaterProfileDetails):void { if(!this.definition.enabled)return;this.addDetail(this.standingDetails.scan,d.scanMilliseconds);this.addDetail(this.standingDetails.contour,d.contourMilliseconds);this.addDetail(this.standingDetails.graphics,d.graphicsMilliseconds);this.addDetail(this.standingDetails.reflection,d.reflectionMilliseconds);this.standingDetails.bodyContours=d.bodyContours;this.standingDetails.accentContours=d.accentContours;this.standingDetails.bodyVertices=d.bodyVertices;this.standingDetails.accentVertices=d.accentVertices; }
    public recordWetGroundDetails(d:WetGroundProfileDetails):void { if(!this.definition.enabled)return;this.addDetail(this.wetDetails.membership,d.membershipMilliseconds);this.addDetail(this.wetDetails.contour,d.contourMilliseconds);this.addDetail(this.wetDetails.graphics,d.graphicsMilliseconds);this.wetDetails.visibleWetCells=d.visibleWetCells;this.wetDetails.contours=d.contours;this.wetDetails.vertices=d.vertices; }
    public recordHoseVfxDetails(d:WaterVfxProfileDetails):void { this.hoseDetails=d; }
    public recordSprinklerDeepProfileDetails(d:SprinklerDeepProfileDetails):void {
        this.sprinklerDetails=d;this.sprinklerDeepDetails.preparedPackets=d.preparedPackets;
        if(!this.definition.enabled)return;
        this.addDetail(this.sprinklerDeepDetails.sourceBookkeeping,d.sourceBookkeepingMilliseconds);
        this.addDetail(this.sprinklerDeepDetails.packetTraversal,d.packetTraversalMilliseconds);
        this.addDetail(this.sprinklerDeepDetails.packetPreparation,d.packetPreparationMilliseconds);
        this.addDetail(this.sprinklerDeepDetails.rendererSync,d.rendererSyncMilliseconds);
        this.addDetail(this.sprinklerDeepDetails.legacyHide,d.legacyHideMilliseconds);
        this.addDetail(this.sprinklerDeepDetails.dropletBegin,d.dropletRenderer.beginFrameMilliseconds);
        this.addDetail(this.sprinklerDeepDetails.slotLookupCreate,d.dropletRenderer.slotLookupCreateMilliseconds);
        this.addDetail(this.sprinklerDeepDetails.transform,d.dropletRenderer.transformMilliseconds);
        this.addDetail(this.sprinklerDeepDetails.geometry,d.dropletRenderer.geometryMilliseconds);
        this.addDetail(this.sprinklerDeepDetails.style,d.dropletRenderer.styleMilliseconds);
        this.addDetail(this.sprinklerDeepDetails.dropletEnd,d.dropletRenderer.endFrameMilliseconds);
        this.sprinklerDeepDetails.createdSlots=d.dropletRenderer.createdSlots;
        this.sprinklerDeepDetails.reusedSlots=d.dropletRenderer.reusedSlots;
        this.sprinklerDeepDetails.hiddenSlots=d.dropletRenderer.hiddenSlots;
        this.sprinklerDeepDetails.totalSlots=d.dropletRenderer.totalSlots;
    }
    public recordGroundInteractionBreakdown(b:{readonly contactWettingMilliseconds:number;readonly infiltrationMilliseconds:number;readonly moistureDiffusionMilliseconds:number;readonly groundDryingMilliseconds:number;readonly shallowWaterDissipationMilliseconds:number;}):void { if(!this.definition.enabled)return;this.groundBreakdown.contactWetting+=b.contactWettingMilliseconds;this.groundBreakdown.infiltration+=b.infiltrationMilliseconds;this.groundBreakdown.moistureDiffusion+=b.moistureDiffusionMilliseconds;this.groundBreakdown.groundDrying+=b.groundDryingMilliseconds;this.groundBreakdown.shallowWaterDissipation+=b.shallowWaterDissipationMilliseconds;this.groundBreakdown.samples+=1; }
    public recordTextureCommit(texelCount:number):void { if(!this.definition.enabled)return;const c=this.measurementStack[this.measurementStack.length-1];const t=c==="standingWater"?this.standingTexture:c==="wetGround"?this.wetTexture:this.otherTexture;t.commits+=1;t.texels+=Math.max(0,texelCount); }
    public recordFireDeepProfileDetails(
        details: FireDeepProfileDetails,
    ): void {
        if (!this.definition.enabled) return;
        /*
         * Merge against the complete default contract so diagnostic UI remains
         * safe even while a producer is being upgraded or intentionally omits
         * expensive deep-timing fields.
         */
        this.fireDeepDetails = {
            ...this.createEmptyFireDeepProfile(),
            ...details,
        };
    }

    public recordWindDeepProfileDetails(
        details: WindDeepProfileDetails,
    ): void {
        if (!this.definition.enabled) return;
        this.windDeepDetails = {
            ...this.createEmptyWindDeepProfile(),
            ...details,
        };
    }

    public getSnapshot():WaterPerformanceSnapshot{return this.latestSnapshot;}
    private addDetail(a:DetailAccumulator,v:number):void{a.total+=v;a.samples+=1;a.peak=Math.max(a.peak??0,v);}
    private detailAverage(a:DetailAccumulator):number{return this.worldFrameSamples>0?a.total/this.worldFrameSamples:0;}
    private average(name:ProfileTimingName):number{const v=this.timings.get(name);return v&&this.worldFrameSamples>0?v.total/this.worldFrameSamples:0;}
    private peak(name:ProfileTimingName):number{return this.timings.get(name)?.peak??0;}
    private publishSnapshot():void {
        const names:ProfileTimingName[]=["surface","waterSources","airborneWater","waterFireInteraction","waterFireAirborneDirectional","waterFireAirborneGround","waterFireStandingGround","waterFireStandingDirectional","waterSimulation","waterGroundInteraction","moistureSurfaceBridge","wetGround","standingWater","hoseWaterVfx","sprinklerWaterVfx","fireSimulation","firePresentation","fireDirectionalValidation","fireSourceVisualizer","fireVfxUpdate","entities","hoseBallForce","ballTrail","dynamicCollisions","hoseCollisions","mechanismSync","waterObstacleSync","windPresentation","gameplayPresentation","debugAndMetrics"];
        const measured=names.reduce((s,n)=>s+this.average(n),0);const worldAverage=this.worldFrameSamples>0?this.worldFrameTotal/this.worldFrameSamples:0;const actual=this.actualFrameSamples>0?this.actualFrameTotal/this.actualFrameSamples:0;const gameUpdate=this.gameUpdateSamples>0?this.gameUpdateTotal/this.gameUpdateSamples:0;const pixiRender=this.pixiRenderSamples>0?this.pixiRenderTotal/this.pixiRenderSamples:0;const outside=Math.max(0,actual-gameUpdate-pixiRender);
        const scalarDeep=ScalarFieldContourBuilder.getLastDeepProfile();
        const standingDeep=ScalarFieldContourBuilder.getLastStandingPostProfile();
        const wetDeep=ScalarFieldContourBuilder.getLastWetPostProfile();
        this.latestSnapshot={...this.createEmptySnapshot(),fireDeep:this.fireDeepDetails,spikeWorstFrameMilliseconds:this.spikeWorstFrameMilliseconds,spikeWorstMeasuredMilliseconds:this.spikeWorstMeasuredMilliseconds,spikeTopTimings:this.spikeTopTimings,spikeFrameCount:this.spikeFrameCount,windDeep:this.windDeepDetails,actualFps:actual>0?1000/actual:0,actualFrameAverageMilliseconds:actual,gameUpdateAverageMilliseconds:gameUpdate,pixiRenderAverageMilliseconds:pixiRender,pixiRenderPeakMilliseconds:this.pixiRenderPeak,frameOutsideGameAndRenderAverageMilliseconds:outside,presentationDiagnosticMode:this.presentationDiagnosticMode,firePresentationObjects:this.firePresentationObjects,windPresentationObjects:this.windPresentationObjects,waterPresentationObjects:this.waterPresentationObjects,worldUpdateAverageMilliseconds:worldAverage,worldUpdatePeakMilliseconds:this.worldFramePeak,waterSimulationAverageMilliseconds:this.average("waterSimulation"),waterSimulationPeakMilliseconds:this.peak("waterSimulation"),airborneWaterAverageMilliseconds:this.average("airborneWater"),standingWaterAverageMilliseconds:this.average("standingWater"),standingWaterPeakMilliseconds:this.peak("standingWater"),wetGroundAverageMilliseconds:this.average("wetGround"),wetGroundPeakMilliseconds:this.peak("wetGround"),hoseWaterVfxAverageMilliseconds:this.average("hoseWaterVfx"),hoseWaterVfxPeakMilliseconds:this.peak("hoseWaterVfx"),sprinklerWaterVfxAverageMilliseconds:this.average("sprinklerWaterVfx"),sprinklerWaterVfxPeakMilliseconds:this.peak("sprinklerWaterVfx"),surfaceAverageMilliseconds:this.average("surface"),waterSourcesAverageMilliseconds:this.average("waterSources"),
waterFireInteractionAverageMilliseconds:this.average("waterFireAirborneDirectional")+this.average("waterFireAirborneGround")+this.average("waterFireStandingGround")+this.average("waterFireStandingDirectional"),
waterFireAirborneDirectionalAverageMilliseconds:this.average("waterFireAirborneDirectional"),
waterFireAirborneGroundAverageMilliseconds:this.average("waterFireAirborneGround"),
waterFireStandingGroundAverageMilliseconds:this.average("waterFireStandingGround"),
waterFireStandingDirectionalAverageMilliseconds:this.average("waterFireStandingDirectional"),
waterGroundInteractionAverageMilliseconds:this.average("waterGroundInteraction"),moistureSurfaceBridgeAverageMilliseconds:this.average("moistureSurfaceBridge"),contactWettingAverageMilliseconds:this.groundBreakdown.contactWetting/Math.max(1,this.worldFrameSamples),infiltrationAverageMilliseconds:this.groundBreakdown.infiltration/Math.max(1,this.worldFrameSamples),moistureDiffusionAverageMilliseconds:this.groundBreakdown.moistureDiffusion/Math.max(1,this.worldFrameSamples),groundDryingAverageMilliseconds:this.groundBreakdown.groundDrying/Math.max(1,this.worldFrameSamples),shallowWaterDissipationAverageMilliseconds:this.groundBreakdown.shallowWaterDissipation/Math.max(1,this.worldFrameSamples),fireSimulationAverageMilliseconds:this.average("fireSimulation"),
firePresentationAverageMilliseconds:this.average("fireDirectionalValidation")+this.average("fireSourceVisualizer")+this.average("fireVfxUpdate"),
entitiesAverageMilliseconds:this.average("entities"),hoseBallForceAverageMilliseconds:this.average("hoseBallForce"),ballTrailAverageMilliseconds:this.average("ballTrail"),dynamicCollisionsAverageMilliseconds:this.average("dynamicCollisions"),hoseCollisionsAverageMilliseconds:this.average("hoseCollisions"),mechanismSyncAverageMilliseconds:this.average("mechanismSync"),waterObstacleSyncAverageMilliseconds:this.average("waterObstacleSync"),windPresentationAverageMilliseconds:this.average("windPresentation"),gameplayPresentationAverageMilliseconds:this.average("gameplayPresentation"),debugAndMetricsAverageMilliseconds:this.average("debugAndMetrics"),measuredWorldAverageMilliseconds:measured,worldRemainderAverageMilliseconds:Math.max(0,worldAverage-measured),trackedWaterCells:this.trackedWaterCells,visibleWaterCells:this.visibleWaterCells,activeRenderRegions:this.activeRenderRegions,activeAirbornePackets:this.activeAirbornePackets,trackedMoistureCells:this.trackedMoistureCells,standingScanAverageMilliseconds:this.detailAverage(this.standingDetails.scan),standingContourAverageMilliseconds:this.detailAverage(this.standingDetails.contour),standingContourPeakMilliseconds:this.standingDetails.contour.peak??0,standingGraphicsAverageMilliseconds:this.detailAverage(this.standingDetails.graphics),standingReflectionAverageMilliseconds:this.detailAverage(this.standingDetails.reflection),standingBodyContours:this.standingDetails.bodyContours,standingAccentContours:this.standingDetails.accentContours,standingBodyVertices:this.standingDetails.bodyVertices,standingAccentVertices:this.standingDetails.accentVertices,wetMembershipAverageMilliseconds:this.detailAverage(this.wetDetails.membership),wetContourAverageMilliseconds:this.detailAverage(this.wetDetails.contour),wetContourPeakMilliseconds:this.wetDetails.contour.peak??0,wetGraphicsAverageMilliseconds:this.detailAverage(this.wetDetails.graphics),visibleWetCells:this.wetDetails.visibleWetCells,wetContours:this.wetDetails.contours,wetVertices:this.wetDetails.vertices,hoseActiveSources:this.hoseDetails.activeSources,hoseInspectedPackets:this.hoseDetails.inspectedPackets,hoseRenderedElements:this.hoseDetails.renderedElements,sprinklerActiveSources:this.sprinklerDetails.activeSources,sprinklerInspectedPackets:this.sprinklerDetails.inspectedPackets,sprinklerRenderedElements:this.sprinklerDetails.renderedElements,sprinklerPreparedPackets:this.sprinklerDeepDetails.preparedPackets,sprinklerSourceBookkeepingAverageMilliseconds:this.detailAverage(this.sprinklerDeepDetails.sourceBookkeeping),sprinklerPacketTraversalAverageMilliseconds:this.detailAverage(this.sprinklerDeepDetails.packetTraversal),sprinklerPacketPreparationAverageMilliseconds:this.detailAverage(this.sprinklerDeepDetails.packetPreparation),sprinklerRendererSyncAverageMilliseconds:this.detailAverage(this.sprinklerDeepDetails.rendererSync),sprinklerLegacyHideAverageMilliseconds:this.detailAverage(this.sprinklerDeepDetails.legacyHide),sprinklerDropletBeginAverageMilliseconds:this.detailAverage(this.sprinklerDeepDetails.dropletBegin),sprinklerSlotLookupCreateAverageMilliseconds:this.detailAverage(this.sprinklerDeepDetails.slotLookupCreate),sprinklerTransformAverageMilliseconds:this.detailAverage(this.sprinklerDeepDetails.transform),sprinklerGeometryAverageMilliseconds:this.detailAverage(this.sprinklerDeepDetails.geometry),sprinklerStyleAverageMilliseconds:this.detailAverage(this.sprinklerDeepDetails.style),sprinklerDropletEndAverageMilliseconds:this.detailAverage(this.sprinklerDeepDetails.dropletEnd),sprinklerCreatedSlots:this.sprinklerDeepDetails.createdSlots,sprinklerReusedSlots:this.sprinklerDeepDetails.reusedSlots,sprinklerHiddenSlots:this.sprinklerDeepDetails.hiddenSlots,sprinklerTotalSlots:this.sprinklerDeepDetails.totalSlots,standingWaterTextureCommits:this.standingTexture.commits,standingWaterUploadedTexels:this.standingTexture.texels,wetGroundTextureCommits:this.wetTexture.commits,wetGroundUploadedTexels:this.wetTexture.texels,otherTextureCommits:this.otherTexture.commits,otherUploadedTexels:this.otherTexture.texels,
contourScalarTotalMilliseconds:scalarDeep.totalMilliseconds,contourSegmentBuildMilliseconds:scalarDeep.segmentBuildMilliseconds,
contourKeyAdjacencyMilliseconds:scalarDeep.keyAndAdjacencyMilliseconds,contourStitchingMilliseconds:scalarDeep.stitchingMilliseconds,
contourCandidateCells:scalarDeep.candidateCells,contourCellsScanned:scalarDeep.cellsScanned,
contourScanReductionPercent:scalarDeep.scanReductionPercent,contourActiveSamples:scalarDeep.activeSamples,
contourActiveCells:scalarDeep.activeContourCells,contourSegments:scalarDeep.segmentsGenerated,
contourLoops:scalarDeep.loopsGenerated,contourRawVertices:scalarDeep.rawVertices,
standingDeepTotalMilliseconds:standingDeep?.totalMilliseconds??0,standingDeepScalarMilliseconds:standingDeep?.scalarMilliseconds??0,
standingDeepPostMilliseconds:standingDeep?.postProcessMilliseconds??0,standingDeepPeakDepthMilliseconds:standingDeep?.peakDepthMilliseconds??0,
standingDeepRawLoops:standingDeep?.rawLoops??0,standingDeepAcceptedLoops:standingDeep?.acceptedLoops??0,
standingDeepRawVertices:standingDeep?.rawVertices??0,standingDeepFinalVertices:standingDeep?.finalVertices??0,
wetDeepTotalMilliseconds:wetDeep?.totalMilliseconds??0,wetDeepScalarMilliseconds:wetDeep?.scalarMilliseconds??0,
wetDeepPostMilliseconds:wetDeep?.postProcessMilliseconds??0,wetDeepRawLoops:wetDeep?.rawLoops??0,
wetDeepAcceptedLoops:wetDeep?.acceptedLoops??0,wetDeepRawVertices:wetDeep?.rawVertices??0,wetDeepFinalVertices:wetDeep?.finalVertices??0};
        if(this.definition.consoleReportingEnabled)console.info("[8I-9A PERF] WATER VFX PROFILE",this.latestSnapshot);
        this.timings.clear();this.spikeWorstFrameMilliseconds=0;this.spikeWorstMeasuredMilliseconds=0;this.spikeTopTimings="none";this.spikeFrameCount=0;this.worldFrameTotal=0;this.worldFramePeak=0;this.worldFrameSamples=0;this.actualFrameTotal=0;this.actualFrameSamples=0;this.gameUpdateTotal=0;this.gameUpdateSamples=0;this.pixiRenderTotal=0;this.pixiRenderPeak=0;this.pixiRenderSamples=0;this.standingTexture={commits:0,texels:0};this.wetTexture={commits:0,texels:0};this.otherTexture={commits:0,texels:0};this.standingDetails.scan={total:0,samples:0};this.standingDetails.contour={total:0,samples:0,peak:0};this.standingDetails.graphics={total:0,samples:0};this.standingDetails.reflection={total:0,samples:0};this.wetDetails.membership={total:0,samples:0};this.wetDetails.contour={total:0,samples:0,peak:0};this.wetDetails.graphics={total:0,samples:0};this.sprinklerDeepDetails.sourceBookkeeping={total:0,samples:0};this.sprinklerDeepDetails.packetTraversal={total:0,samples:0};this.sprinklerDeepDetails.packetPreparation={total:0,samples:0};this.sprinklerDeepDetails.rendererSync={total:0,samples:0};this.sprinklerDeepDetails.legacyHide={total:0,samples:0};this.sprinklerDeepDetails.dropletBegin={total:0,samples:0};this.sprinklerDeepDetails.slotLookupCreate={total:0,samples:0};this.sprinklerDeepDetails.transform={total:0,samples:0};this.sprinklerDeepDetails.geometry={total:0,samples:0};this.sprinklerDeepDetails.style={total:0,samples:0};this.sprinklerDeepDetails.dropletEnd={total:0,samples:0};this.groundBreakdown={contactWetting:0,infiltration:0,moistureDiffusion:0,groundDrying:0,shallowWaterDissipation:0,samples:0};
    }
    private createEmptyFireDeepProfile(): FireDeepProfileDetails {
        return {
            fireSourceSystemMilliseconds:0,simulationTotalMilliseconds:0,simulationPeakMilliseconds:0,
            activeCellLoopMilliseconds:0,samplingMilliseconds:0,environmentInfluenceMilliseconds:0,
            spreadMilliseconds:0,fieldIgnitionMilliseconds:0,cleanupMilliseconds:0,commitMilliseconds:0,
            heatCoolingMilliseconds:0,simulationActiveCells:0,spreadPasses:0,pendingIgnitions:0,expiredCells:0,hotCandidates:0,
            groundEmitterMilliseconds:0,directionalEmitterMilliseconds:0,poolUpdateMilliseconds:0,
            scorchRendererMilliseconds:0,directionalRegionMilliseconds:0,directionalSuppressionMilliseconds:0,
            activeGroundParticles:0,activeDirectionalParticles:0,activeParticles:0,particleCapacity:0,
            acquireAttempts:0,acquireSuccesses:0,reusedParticles:0,createdParticles:0,
            groundSpawnAttempts:0,groundSpawned:0,groundSpawnSkipped:0,
            directionalSpawnAttempts:0,directionalSpawned:0,directionalSpawnSkipped:0,
            activeDirectionalSources:0,collisionSweeps:0,collisionHits:0,
            groundCollisionSweeps:0,groundCollisionHits:0,
            directionalCollisionSweeps:0,directionalCollisionHits:0,
        };
    }

    private createEmptyWindDeepProfile(): WindDeepProfileDetails {
        return {
            globalEmitterMilliseconds:0,localEmitterMilliseconds:0,poolBookkeepingMilliseconds:0,
            activeParticles:0,particleCapacity:0,acquireAttempts:0,acquireSuccesses:0,releases:0,
            globalSpawnAttempts:0,globalSpawned:0,localSpawnAttempts:0,localSpawned:0,
            activeLocalSources:0,localWindQueries:0,localWindQueryMilliseconds:0,
        };
    }

    private createEmptySnapshot(): WaterPerformanceSnapshot {
        return {
            fireDeep: this.createEmptyFireDeepProfile(),
            spikeWorstFrameMilliseconds: 0,
            spikeWorstMeasuredMilliseconds: 0,
            spikeTopTimings: "none",
            spikeFrameCount: 0,
            windDeep: this.createEmptyWindDeepProfile(),
            actualFps: 0,
            actualFrameAverageMilliseconds: 0,
            gameUpdateAverageMilliseconds: 0,
            pixiRenderAverageMilliseconds: 0,
            pixiRenderPeakMilliseconds: 0,
            frameOutsideGameAndRenderAverageMilliseconds: 0,
            presentationDiagnosticMode: "all",
            firePresentationObjects: 0,
            windPresentationObjects: 0,
            waterPresentationObjects: 0,
            worldUpdateAverageMilliseconds: 0,
            worldUpdatePeakMilliseconds: 0,
            waterSimulationAverageMilliseconds: 0,
            waterSimulationPeakMilliseconds: 0,
            airborneWaterAverageMilliseconds: 0,
            standingWaterAverageMilliseconds: 0,
            standingWaterPeakMilliseconds: 0,
            wetGroundAverageMilliseconds: 0,
            wetGroundPeakMilliseconds: 0,
            hoseWaterVfxAverageMilliseconds: 0,
            hoseWaterVfxPeakMilliseconds: 0,
            sprinklerWaterVfxAverageMilliseconds: 0,
            sprinklerWaterVfxPeakMilliseconds: 0,
            surfaceAverageMilliseconds: 0,
            waterSourcesAverageMilliseconds: 0,
            waterFireInteractionAverageMilliseconds: 0,
            waterFireAirborneDirectionalAverageMilliseconds: 0,
            waterFireAirborneGroundAverageMilliseconds: 0,
            waterFireStandingGroundAverageMilliseconds: 0,
            waterFireStandingDirectionalAverageMilliseconds: 0,
            waterGroundInteractionAverageMilliseconds: 0,
            moistureSurfaceBridgeAverageMilliseconds: 0,
            contactWettingAverageMilliseconds: 0,
            infiltrationAverageMilliseconds: 0,
            moistureDiffusionAverageMilliseconds: 0,
            groundDryingAverageMilliseconds: 0,
            shallowWaterDissipationAverageMilliseconds: 0,
            fireSimulationAverageMilliseconds: 0,
            firePresentationAverageMilliseconds: 0,
            entitiesAverageMilliseconds: 0,
            hoseBallForceAverageMilliseconds: 0,
            ballTrailAverageMilliseconds: 0,
            dynamicCollisionsAverageMilliseconds: 0,
            hoseCollisionsAverageMilliseconds: 0,
            mechanismSyncAverageMilliseconds: 0,
            waterObstacleSyncAverageMilliseconds: 0,
            windPresentationAverageMilliseconds: 0,
            gameplayPresentationAverageMilliseconds: 0,
            debugAndMetricsAverageMilliseconds: 0,
            measuredWorldAverageMilliseconds: 0,
            worldRemainderAverageMilliseconds: 0,
            trackedWaterCells: 0,
            visibleWaterCells: 0,
            activeRenderRegions: 0,
            activeAirbornePackets: 0,
            trackedMoistureCells: 0,
            standingScanAverageMilliseconds: 0,
            standingContourAverageMilliseconds: 0,
            standingContourPeakMilliseconds: 0,
            standingGraphicsAverageMilliseconds: 0,
            standingReflectionAverageMilliseconds: 0,
            standingBodyContours: 0,
            standingAccentContours: 0,
            standingBodyVertices: 0,
            standingAccentVertices: 0,
            wetMembershipAverageMilliseconds: 0,
            wetContourAverageMilliseconds: 0,
            wetContourPeakMilliseconds: 0,
            wetGraphicsAverageMilliseconds: 0,
            visibleWetCells: 0,
            wetContours: 0,
            wetVertices: 0,
            hoseActiveSources: 0,
            hoseInspectedPackets: 0,
            hoseRenderedElements: 0,
            sprinklerActiveSources: 0,
            sprinklerInspectedPackets: 0,
            sprinklerRenderedElements: 0,
            sprinklerPreparedPackets: 0,
            sprinklerSourceBookkeepingAverageMilliseconds: 0,
            sprinklerPacketTraversalAverageMilliseconds: 0,
            sprinklerPacketPreparationAverageMilliseconds: 0,
            sprinklerRendererSyncAverageMilliseconds: 0,
            sprinklerLegacyHideAverageMilliseconds: 0,
            sprinklerDropletBeginAverageMilliseconds: 0,
            sprinklerSlotLookupCreateAverageMilliseconds: 0,
            sprinklerTransformAverageMilliseconds: 0,
            sprinklerGeometryAverageMilliseconds: 0,
            sprinklerStyleAverageMilliseconds: 0,
            sprinklerDropletEndAverageMilliseconds: 0,
            sprinklerCreatedSlots: 0,
            sprinklerReusedSlots: 0,
            sprinklerHiddenSlots: 0,
            sprinklerTotalSlots: 0,
            standingWaterTextureCommits: 0,
            standingWaterUploadedTexels: 0,
            wetGroundTextureCommits: 0,
            wetGroundUploadedTexels: 0,
            otherTextureCommits: 0,
            otherUploadedTexels: 0,
            contourScalarTotalMilliseconds:0, contourSegmentBuildMilliseconds:0,
            contourKeyAdjacencyMilliseconds:0, contourStitchingMilliseconds:0,
            contourCandidateCells:0, contourCellsScanned:0, contourScanReductionPercent:0,
            contourActiveSamples:0, contourActiveCells:0, contourSegments:0, contourLoops:0, contourRawVertices:0,
            standingDeepTotalMilliseconds:0, standingDeepScalarMilliseconds:0, standingDeepPostMilliseconds:0,
            standingDeepPeakDepthMilliseconds:0, standingDeepRawLoops:0, standingDeepAcceptedLoops:0,
            standingDeepRawVertices:0, standingDeepFinalVertices:0,
            wetDeepTotalMilliseconds:0, wetDeepScalarMilliseconds:0, wetDeepPostMilliseconds:0,
            wetDeepRawLoops:0, wetDeepAcceptedLoops:0, wetDeepRawVertices:0, wetDeepFinalVertices:0,
        };
    }
}
