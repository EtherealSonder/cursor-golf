import type { WaterPerformanceSnapshot } from "./WaterPerformanceProfiler";
import type { PerformanceDiagnosticFrameSampler } from "./PerformanceDiagnosticFrameSampler";
export interface DiagnosticWorkload {
    readonly waterPackets: number;
    readonly windParticles: number;
    readonly fireParticles: number;
    readonly backgroundEnabled: boolean;
}
export function buildDiagnosticReport(label: string, index: number, frameStats: ReturnType<PerformanceDiagnosticFrameSampler["drain"]>,
    snapshot: WaterPerformanceSnapshot, workload: DiagnosticWorkload, counters: Readonly<Record<string, number>>) {
    const metrics: Record<string,number> = {
        world: snapshot.worldUpdateAverageMilliseconds,
        pixiRender: snapshot.pixiRenderAverageMilliseconds,
        robotAI: snapshot.robotAIAverageMilliseconds,
        entities: snapshot.entitiesAverageMilliseconds,
        dynamicCollisions: snapshot.dynamicCollisionsAverageMilliseconds,
        waterAirborne: snapshot.airborneWaterAverageMilliseconds,
        waterFlow: snapshot.waterSimulationAverageMilliseconds,
        waterGround: snapshot.waterGroundInteractionAverageMilliseconds,
        waterVfx: snapshot.sprinklerWaterVfxAverageMilliseconds + snapshot.hoseWaterVfxAverageMilliseconds + snapshot.waterVfxCoreAverageMilliseconds + snapshot.waterImpactVfxAverageMilliseconds,
        fireSimulation: snapshot.fireSimulationAverageMilliseconds,
        fireVfx: snapshot.firePresentationAverageMilliseconds,
        windForces: snapshot.localWindForcesAverageMilliseconds,
        windSuction: snapshot.windSuctionAverageMilliseconds,
        windVfx: snapshot.windPresentationAverageMilliseconds,
        surface: snapshot.surfaceAverageMilliseconds,
    };
    const categories: Record<string, number> = {
        waterSimulation: metrics.waterAirborne + metrics.waterFlow + metrics.waterGround,
        waterVfx: metrics.waterVfx,
        fireSimulation: metrics.fireSimulation,
        fireVfx: metrics.fireVfx,
        windSimulation: metrics.windForces + metrics.windSuction,
        windVfx: metrics.windVfx,
        physicsCollisions: metrics.dynamicCollisions,
        robotsAI: metrics.robotAI,
        renderingCpu: metrics.pixiRender,
        otherMeasured: metrics.surface + metrics.entities,
    };
    return { tag: "PASS-A", configuration: label, report: `${index}`, frames: frameStats.frames, elapsedMs:+frameStats.elapsedMs.toFixed(1),
        fps:+frameStats.fps.toFixed(1),
        frameAvgMs:+frameStats.averageMs.toFixed(2), frameP95Ms:+frameStats.p95Ms.toFixed(2), frameP99Ms:+frameStats.p99Ms.toFixed(2),
        frameMaxMs:+frameStats.maxMs.toFixed(2),
        spikesOver16_67ms:frameStats.spikes,browserStalls:frameStats.browserStalls,stallDurationsMs:frameStats.stallDurationsMs,wallElapsedMs:frameStats.wallElapsedMs,
        timingsMs:metrics,
        categoriesMs: categories,
        categoryRanking: Object.entries(categories).sort((a,b)=>b[1]-a[1]),
        ranking:Object.entries(metrics).filter(([k])=>k!=="world").sort((a,b)=>b[1]-a[1]).slice(0,8),
        workload, counters, cacheEffectiveness:{lookups:counters["geometry.cellCacheLookups"]??0,hits:counters["geometry.cellCacheHits"]??0,misses:counters["geometry.cellCacheMisses"]??0,bypasses:counters["geometry.cellCacheBypasses"]??0,invalidations:counters["geometry.cellCacheInvalidations"]??0}, geometryAcceleration:Object.fromEntries(Object.entries(counters).filter(([k])=>k.startsWith("geometry."))),
        note:"Category timings are diagnostic estimates, not additive frame totals. Timings may overlap; Pixi render is CPU submission, not GPU completion. Subsystem timings are sampled from existing Water profiler and may use a different accumulation period; do not sum overlapping timings." };
}
