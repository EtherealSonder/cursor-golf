import {
    DEFAULT_WORLD_PERFORMANCE_PROFILE_DEFINITION,
} from "./WorldPerformanceProfileDefinition";

import type {
    WorldPerformanceProfileDefinition,
} from "./WorldPerformanceProfileDefinition";

export type ProfileTimingName =
    | "surface"
    | "waterSources"
    | "airborneWater"
    | "waterFireInteraction"
    | "waterSimulation"
    | "waterGroundInteraction"
    | "moistureSurfaceBridge"
    | "wetGround"
    | "standingWater"
    | "fireSimulation"
    | "firePresentation"
    | "entities"
    | "hoseBallForce"
    | "ballTrail"
    | "dynamicCollisions"
    | "hoseCollisions"
    | "mechanismSync"
    | "waterObstacleSync"
    | "windPresentation"
    | "gameplayPresentation"
    | "debugAndMetrics";

export interface WaterPerformanceSnapshot {
    readonly actualFps: number;
    readonly actualFrameAverageMilliseconds: number;
    readonly worldUpdateAverageMilliseconds: number;
    readonly worldUpdatePeakMilliseconds: number;
    readonly waterSimulationAverageMilliseconds: number;
    readonly waterSimulationPeakMilliseconds: number;
    readonly airborneWaterAverageMilliseconds: number;
    readonly standingWaterAverageMilliseconds: number;
    readonly wetGroundAverageMilliseconds: number;
    readonly surfaceAverageMilliseconds: number;
    readonly waterSourcesAverageMilliseconds: number;
    readonly waterFireInteractionAverageMilliseconds: number;
    readonly waterGroundInteractionAverageMilliseconds: number;
    readonly moistureSurfaceBridgeAverageMilliseconds: number;
    readonly contactWettingAverageMilliseconds: number;
    readonly infiltrationAverageMilliseconds: number;
    readonly moistureDiffusionAverageMilliseconds: number;
    readonly groundDryingAverageMilliseconds: number;
    readonly shallowWaterDissipationAverageMilliseconds: number;
    readonly fireSimulationAverageMilliseconds: number;
    readonly firePresentationAverageMilliseconds: number;
    readonly entitiesAverageMilliseconds: number;
    readonly hoseBallForceAverageMilliseconds: number;
    readonly ballTrailAverageMilliseconds: number;
    readonly dynamicCollisionsAverageMilliseconds: number;
    readonly hoseCollisionsAverageMilliseconds: number;
    readonly mechanismSyncAverageMilliseconds: number;
    readonly waterObstacleSyncAverageMilliseconds: number;
    readonly windPresentationAverageMilliseconds: number;
    readonly gameplayPresentationAverageMilliseconds: number;
    readonly debugAndMetricsAverageMilliseconds: number;
    readonly measuredWorldAverageMilliseconds: number;
    readonly worldRemainderAverageMilliseconds: number;
    readonly trackedWaterCells: number;
    readonly visibleWaterCells: number;
    readonly activeRenderRegions: number;
    readonly standingWaterTextureCommits: number;
    readonly standingWaterUploadedTexels: number;
    readonly wetGroundTextureCommits: number;
    readonly wetGroundUploadedTexels: number;
    readonly otherTextureCommits: number;
    readonly otherUploadedTexels: number;
}

interface TimingAccumulator { total: number; peak: number; samples: number; }
interface TextureAccumulator { commits: number; texels: number; }

export class WaterPerformanceProfiler {
    private readonly timings = new Map<string, TimingAccumulator>();
    private readonly measurementStack: string[] = [];
    private worldFrameStartedAt = 0;
    private worldFrameTotal = 0;
    private worldFramePeak = 0;
    private worldFrameSamples = 0;
    private actualFrameTotal = 0;
    private actualFrameSamples = 0;
    private reportAccumulator = 0;
    private trackedWaterCells = 0;
    private visibleWaterCells = 0;
    private activeRenderRegions = 0;
    private standingTexture: TextureAccumulator = { commits: 0, texels: 0 };
    private wetTexture: TextureAccumulator = { commits: 0, texels: 0 };
    private otherTexture: TextureAccumulator = { commits: 0, texels: 0 };

    private groundBreakdown = {
        contactWetting: 0,
        infiltration: 0,
        moistureDiffusion: 0,
        groundDrying: 0,
        shallowWaterDissipation: 0,
        samples: 0,
    };

    private latestSnapshot: WaterPerformanceSnapshot = this.createEmptySnapshot();

    public constructor(
        private readonly definition: WorldPerformanceProfileDefinition =
            DEFAULT_WORLD_PERFORMANCE_PROFILE_DEFINITION,
    ) { }

    public isEnabled(): boolean { return this.definition.enabled; }
    public isOverlayEnabled(): boolean { return this.definition.enabled && this.definition.overlayEnabled; }

    public beginFrame(): void {
        if (!this.definition.enabled) return;
        this.worldFrameStartedAt = performance.now();
    }

    public endFrame(deltaTime: number): void {
        if (!this.definition.enabled) return;
        if (this.worldFrameStartedAt > 0) {
            const elapsed = performance.now() - this.worldFrameStartedAt;
            this.worldFrameTotal += elapsed;
            this.worldFramePeak = Math.max(this.worldFramePeak, elapsed);
            this.worldFrameSamples += 1;
        }
        const safeDelta = Math.max(0, deltaTime);
        this.actualFrameTotal += safeDelta * 1000;
        this.actualFrameSamples += 1;
        this.reportAccumulator += safeDelta;
        if (this.reportAccumulator >= this.definition.consoleReportIntervalSeconds) {
            this.publishSnapshot();
            this.reportAccumulator %= this.definition.consoleReportIntervalSeconds;
        }
    }

    public measure<T>(name: ProfileTimingName, action: () => T): T {
        if (!this.definition.enabled) return action();
        const startedAt = performance.now();
        this.measurementStack.push(name);
        try { return action(); }
        finally {
            this.measurementStack.pop();
            const elapsed = performance.now() - startedAt;
            const accumulator = this.timings.get(name) ?? { total: 0, peak: 0, samples: 0 };
            accumulator.total += elapsed;
            accumulator.peak = Math.max(accumulator.peak, elapsed);
            accumulator.samples += 1;
            this.timings.set(name, accumulator);
        }
    }

    public setWaterCounts(tracked: number, visible: number, regions: number): void {
        this.trackedWaterCells = tracked;
        this.visibleWaterCells = visible;
        this.activeRenderRegions = regions;
    }

    public recordGroundInteractionBreakdown(breakdown: {
        readonly contactWettingMilliseconds: number;
        readonly infiltrationMilliseconds: number;
        readonly moistureDiffusionMilliseconds: number;
        readonly groundDryingMilliseconds: number;
        readonly shallowWaterDissipationMilliseconds: number;
    }): void {
        if (!this.definition.enabled) return;
        this.groundBreakdown.contactWetting += breakdown.contactWettingMilliseconds;
        this.groundBreakdown.infiltration += breakdown.infiltrationMilliseconds;
        this.groundBreakdown.moistureDiffusion += breakdown.moistureDiffusionMilliseconds;
        this.groundBreakdown.groundDrying += breakdown.groundDryingMilliseconds;
        this.groundBreakdown.shallowWaterDissipation += breakdown.shallowWaterDissipationMilliseconds;
        this.groundBreakdown.samples += 1;
    }

    public recordTextureCommit(texelCount: number): void {
        if (!this.definition.enabled) return;
        const current = this.measurementStack[this.measurementStack.length - 1];
        const target = current === "standingWater"
            ? this.standingTexture
            : current === "wetGround"
                ? this.wetTexture
                : this.otherTexture;
        target.commits += 1;
        target.texels += Math.max(0, texelCount);
    }

    public getSnapshot(): WaterPerformanceSnapshot { return this.latestSnapshot; }

    private average(name: ProfileTimingName): number {
        const value = this.timings.get(name);
        return value && this.worldFrameSamples > 0 ? value.total / this.worldFrameSamples : 0;
    }

    private peak(name: ProfileTimingName): number { return this.timings.get(name)?.peak ?? 0; }

    private publishSnapshot(): void {
        const names: ProfileTimingName[] = [
            "surface", "waterSources", "airborneWater", "waterFireInteraction",
            "waterSimulation", "waterGroundInteraction", "moistureSurfaceBridge", "wetGround", "standingWater",
            "fireSimulation", "firePresentation", "entities", "hoseBallForce",
            "ballTrail", "dynamicCollisions", "hoseCollisions", "mechanismSync",
            "waterObstacleSync", "windPresentation", "gameplayPresentation", "debugAndMetrics",
        ];
        const measured = names.reduce((sum, name) => sum + this.average(name), 0);
        const worldAverage = this.worldFrameSamples > 0 ? this.worldFrameTotal / this.worldFrameSamples : 0;
        const actualFrameAverage = this.actualFrameSamples > 0 ? this.actualFrameTotal / this.actualFrameSamples : 0;

        this.latestSnapshot = {
            actualFps: actualFrameAverage > 0 ? 1000 / actualFrameAverage : 0,
            actualFrameAverageMilliseconds: actualFrameAverage,
            worldUpdateAverageMilliseconds: worldAverage,
            worldUpdatePeakMilliseconds: this.worldFramePeak,
            waterSimulationAverageMilliseconds: this.average("waterSimulation"),
            waterSimulationPeakMilliseconds: this.peak("waterSimulation"),
            airborneWaterAverageMilliseconds: this.average("airborneWater"),
            standingWaterAverageMilliseconds: this.average("standingWater"),
            wetGroundAverageMilliseconds: this.average("wetGround"),
            surfaceAverageMilliseconds: this.average("surface"),
            waterSourcesAverageMilliseconds: this.average("waterSources"),
            waterFireInteractionAverageMilliseconds: this.average("waterFireInteraction"),
            waterGroundInteractionAverageMilliseconds: this.average("waterGroundInteraction"),
            moistureSurfaceBridgeAverageMilliseconds: this.average("moistureSurfaceBridge"),
            contactWettingAverageMilliseconds: this.groundBreakdown.samples > 0 ? this.groundBreakdown.contactWetting / this.worldFrameSamples : 0,
            infiltrationAverageMilliseconds: this.groundBreakdown.samples > 0 ? this.groundBreakdown.infiltration / this.worldFrameSamples : 0,
            moistureDiffusionAverageMilliseconds: this.groundBreakdown.samples > 0 ? this.groundBreakdown.moistureDiffusion / this.worldFrameSamples : 0,
            groundDryingAverageMilliseconds: this.groundBreakdown.samples > 0 ? this.groundBreakdown.groundDrying / this.worldFrameSamples : 0,
            shallowWaterDissipationAverageMilliseconds: this.groundBreakdown.samples > 0 ? this.groundBreakdown.shallowWaterDissipation / this.worldFrameSamples : 0,
            fireSimulationAverageMilliseconds: this.average("fireSimulation"),
            firePresentationAverageMilliseconds: this.average("firePresentation"),
            entitiesAverageMilliseconds: this.average("entities"),
            hoseBallForceAverageMilliseconds: this.average("hoseBallForce"),
            ballTrailAverageMilliseconds: this.average("ballTrail"),
            dynamicCollisionsAverageMilliseconds: this.average("dynamicCollisions"),
            hoseCollisionsAverageMilliseconds: this.average("hoseCollisions"),
            mechanismSyncAverageMilliseconds: this.average("mechanismSync"),
            waterObstacleSyncAverageMilliseconds: this.average("waterObstacleSync"),
            windPresentationAverageMilliseconds: this.average("windPresentation"),
            gameplayPresentationAverageMilliseconds: this.average("gameplayPresentation"),
            debugAndMetricsAverageMilliseconds: this.average("debugAndMetrics"),
            measuredWorldAverageMilliseconds: measured,
            worldRemainderAverageMilliseconds: Math.max(0, worldAverage - measured),
            trackedWaterCells: this.trackedWaterCells,
            visibleWaterCells: this.visibleWaterCells,
            activeRenderRegions: this.activeRenderRegions,
            standingWaterTextureCommits: this.standingTexture.commits,
            standingWaterUploadedTexels: this.standingTexture.texels,
            wetGroundTextureCommits: this.wetTexture.commits,
            wetGroundUploadedTexels: this.wetTexture.texels,
            otherTextureCommits: this.otherTexture.commits,
            otherUploadedTexels: this.otherTexture.texels,
        };

        if (this.definition.consoleReportingEnabled) {
            console.info("[8I-3 PERF] BROAD WORLD PERFORMANCE", {
                actualFps: this.latestSnapshot.actualFps.toFixed(1),
                actualFrameAverageMs: actualFrameAverage.toFixed(2),
                worldUpdateAverageMs: worldAverage.toFixed(2),
                worldUpdatePeakMs: this.worldFramePeak.toFixed(2),
                measuredWorldAverageMs: measured.toFixed(2),
                worldRemainderAverageMs: this.latestSnapshot.worldRemainderAverageMilliseconds.toFixed(2),
                surfaceMs: this.average("surface").toFixed(2),
                waterSourcesMs: this.average("waterSources").toFixed(2),
                airborneWaterMs: this.average("airborneWater").toFixed(2),
                waterFireInteractionMs: this.average("waterFireInteraction").toFixed(2),
                waterSimulationMs: this.average("waterSimulation").toFixed(2),
                waterGroundInteractionMs: this.average("waterGroundInteraction").toFixed(2),
                moistureSurfaceBridgeMs: this.average("moistureSurfaceBridge").toFixed(2),
                groundBreakdown: {
                    contactWettingMs: this.latestSnapshot.contactWettingAverageMilliseconds.toFixed(2),
                    infiltrationMs: this.latestSnapshot.infiltrationAverageMilliseconds.toFixed(2),
                    moistureDiffusionMs: this.latestSnapshot.moistureDiffusionAverageMilliseconds.toFixed(2),
                    groundDryingMs: this.latestSnapshot.groundDryingAverageMilliseconds.toFixed(2),
                    shallowWaterDissipationMs: this.latestSnapshot.shallowWaterDissipationAverageMilliseconds.toFixed(2),
                },
                wetGroundMs: this.average("wetGround").toFixed(2),
                standingWaterMs: this.average("standingWater").toFixed(2),
                fireSimulationMs: this.average("fireSimulation").toFixed(2),
                firePresentationMs: this.average("firePresentation").toFixed(2),
                entitiesMs: this.average("entities").toFixed(2),
                dynamicCollisionsMs: this.average("dynamicCollisions").toFixed(2),
                hoseCollisionsMs: this.average("hoseCollisions").toFixed(2),
                mechanismSyncMs: this.average("mechanismSync").toFixed(2),
                waterObstacleSyncMs: this.average("waterObstacleSync").toFixed(2),
                windPresentationMs: this.average("windPresentation").toFixed(2),
                gameplayPresentationMs: this.average("gameplayPresentation").toFixed(2),
                debugAndMetricsMs: this.average("debugAndMetrics").toFixed(2),
                standingTexture: { ...this.standingTexture },
                wetGroundTexture: { ...this.wetTexture },
                otherTexture: { ...this.otherTexture },
                trackedWaterCells: this.trackedWaterCells,
                visibleWaterCells: this.visibleWaterCells,
                activeRenderRegions: this.activeRenderRegions,
            });
        }

        this.timings.clear();
        this.worldFrameTotal = 0;
        this.worldFramePeak = 0;
        this.worldFrameSamples = 0;
        this.actualFrameTotal = 0;
        this.actualFrameSamples = 0;
        this.standingTexture = { commits: 0, texels: 0 };
        this.wetTexture = { commits: 0, texels: 0 };
        this.otherTexture = { commits: 0, texels: 0 };
        this.groundBreakdown = {
            contactWetting: 0,
            infiltration: 0,
            moistureDiffusion: 0,
            groundDrying: 0,
            shallowWaterDissipation: 0,
            samples: 0,
        };
    }

    private createEmptySnapshot(): WaterPerformanceSnapshot {
        return {
            actualFps: 0, actualFrameAverageMilliseconds: 0,
            worldUpdateAverageMilliseconds: 0, worldUpdatePeakMilliseconds: 0,
            waterSimulationAverageMilliseconds: 0, waterSimulationPeakMilliseconds: 0,
            airborneWaterAverageMilliseconds: 0, standingWaterAverageMilliseconds: 0,
            wetGroundAverageMilliseconds: 0, surfaceAverageMilliseconds: 0,
            waterSourcesAverageMilliseconds: 0, waterFireInteractionAverageMilliseconds: 0,
            waterGroundInteractionAverageMilliseconds: 0, moistureSurfaceBridgeAverageMilliseconds: 0,
            contactWettingAverageMilliseconds: 0, infiltrationAverageMilliseconds: 0,
            moistureDiffusionAverageMilliseconds: 0, groundDryingAverageMilliseconds: 0,
            shallowWaterDissipationAverageMilliseconds: 0, fireSimulationAverageMilliseconds: 0,
            firePresentationAverageMilliseconds: 0, entitiesAverageMilliseconds: 0,
            hoseBallForceAverageMilliseconds: 0, ballTrailAverageMilliseconds: 0,
            dynamicCollisionsAverageMilliseconds: 0, hoseCollisionsAverageMilliseconds: 0,
            mechanismSyncAverageMilliseconds: 0, waterObstacleSyncAverageMilliseconds: 0,
            windPresentationAverageMilliseconds: 0, gameplayPresentationAverageMilliseconds: 0,
            debugAndMetricsAverageMilliseconds: 0, measuredWorldAverageMilliseconds: 0,
            worldRemainderAverageMilliseconds: 0, trackedWaterCells: 0, visibleWaterCells: 0,
            activeRenderRegions: 0, standingWaterTextureCommits: 0,
            standingWaterUploadedTexels: 0, wetGroundTextureCommits: 0,
            wetGroundUploadedTexels: 0, otherTextureCommits: 0, otherUploadedTexels: 0,
        };
    }
}
