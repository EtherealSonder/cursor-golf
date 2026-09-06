import {
    DEFAULT_PERFORMANCE_PROFILING_DEFINITION,
    validatePerformanceProfilingDefinition,
} from "../config/PerformanceProfilingDefinition";

import type {
    PerformanceProfilingDefinition,
    PerformanceProfilingPhase,
} from "../config/PerformanceProfilingDefinition";

export interface PerformanceSnapshot {
    readonly phase: PerformanceProfilingPhase;
    readonly phaseElapsedSeconds: number;
    readonly phaseRemainingSeconds: number;
    readonly elapsedSeconds: number;
    readonly totalFrames: number;
    readonly currentFps: number;
    readonly averageFps: number;
    readonly minimumFps: number;
    readonly maximumFps: number;
    readonly currentFrameTimeMilliseconds: number;
    readonly averageFrameTimeMilliseconds: number;
    readonly minimumFrameTimeMilliseconds: number;
    readonly maximumFrameTimeMilliseconds: number;
    readonly frameSpikeCount: number;
}

const CURRENT_WINDOW_SECONDS = 0.25;

/**
 * Development-only repeatable profiler. A benchmark begins with an excluded
 * warm-up, records only the formal measurement window, then freezes the final
 * result until another benchmark is started or normal runtime is restored.
 */
export class PerformanceMetrics {
    private definition: PerformanceProfilingDefinition =
        DEFAULT_PERFORMANCE_PROFILING_DEFINITION;
    private phase: PerformanceProfilingPhase = "idle";
    private phaseElapsedSeconds = 0;
    private elapsedSeconds = 0;
    private totalFrames = 0;
    private totalFrameTimeSeconds = 0;
    private minimumFrameTimeSeconds = Number.POSITIVE_INFINITY;
    private maximumFrameTimeSeconds = 0;
    private frameSpikeCount = 0;
    private currentWindowTimeSeconds = 0;
    private currentWindowFrames = 0;
    private currentFps = 0;
    private currentFrameTimeMilliseconds = 0;

    public beginProfiling(
        definition: PerformanceProfilingDefinition =
            DEFAULT_PERFORMANCE_PROFILING_DEFINITION,
    ): void {
        validatePerformanceProfilingDefinition(definition);
        this.definition = definition;
        this.clearSamples();
        this.phaseElapsedSeconds = 0;
        this.phase = definition.warmupSeconds > 0 ? "warmup" : "measuring";
    }

    public update(deltaTime: number): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0 || this.phase === "complete") {
            return;
        }

        if (this.phase === "idle") {
            this.recordSample(deltaTime);
            return;
        }

        if (this.phase === "warmup") {
            this.phaseElapsedSeconds += deltaTime;
            if (this.phaseElapsedSeconds >= this.definition.warmupSeconds) {
                this.phase = "measuring";
                this.phaseElapsedSeconds = 0;
                this.clearSamples();
            }
            return;
        }

        this.phaseElapsedSeconds += deltaTime;
        this.recordSample(deltaTime);

        if (this.phaseElapsedSeconds >= this.definition.measurementSeconds) {
            this.phaseElapsedSeconds = this.definition.measurementSeconds;
            this.phase = "complete";
        }
    }

    public reset(): void {
        this.definition = DEFAULT_PERFORMANCE_PROFILING_DEFINITION;
        this.phase = "idle";
        this.phaseElapsedSeconds = 0;
        this.clearSamples();
    }

    public isProfiling(): boolean {
        return this.phase === "warmup" || this.phase === "measuring";
    }

    public getSnapshot(): PerformanceSnapshot {
        const averageFrameTimeSeconds = this.totalFrames > 0
            ? this.totalFrameTimeSeconds / this.totalFrames
            : 0;
        const minimumFrameTimeSeconds = Number.isFinite(this.minimumFrameTimeSeconds)
            ? this.minimumFrameTimeSeconds
            : 0;
        const phaseDuration = this.phase === "warmup"
            ? this.definition.warmupSeconds
            : this.phase === "measuring" || this.phase === "complete"
                ? this.definition.measurementSeconds
                : 0;

        return {
            phase: this.phase,
            phaseElapsedSeconds: this.phaseElapsedSeconds,
            phaseRemainingSeconds: Math.max(0, phaseDuration - this.phaseElapsedSeconds),
            elapsedSeconds: this.elapsedSeconds,
            totalFrames: this.totalFrames,
            currentFps: this.currentFps,
            averageFps: averageFrameTimeSeconds > 0 ? 1 / averageFrameTimeSeconds : 0,
            minimumFps: this.maximumFrameTimeSeconds > 0 ? 1 / this.maximumFrameTimeSeconds : 0,
            maximumFps: minimumFrameTimeSeconds > 0 ? 1 / minimumFrameTimeSeconds : 0,
            currentFrameTimeMilliseconds: this.currentFrameTimeMilliseconds,
            averageFrameTimeMilliseconds: averageFrameTimeSeconds * 1000,
            minimumFrameTimeMilliseconds: minimumFrameTimeSeconds * 1000,
            maximumFrameTimeMilliseconds: this.maximumFrameTimeSeconds * 1000,
            frameSpikeCount: this.frameSpikeCount,
        };
    }

    private recordSample(deltaTime: number): void {
        this.elapsedSeconds += deltaTime;
        this.totalFrames += 1;
        this.totalFrameTimeSeconds += deltaTime;
        this.minimumFrameTimeSeconds = Math.min(this.minimumFrameTimeSeconds, deltaTime);
        this.maximumFrameTimeSeconds = Math.max(this.maximumFrameTimeSeconds, deltaTime);
        if (deltaTime * 1000 > this.definition.frameSpikeThresholdMilliseconds) {
            this.frameSpikeCount += 1;
        }
        this.currentWindowTimeSeconds += deltaTime;
        this.currentWindowFrames += 1;
        if (this.currentWindowTimeSeconds >= CURRENT_WINDOW_SECONDS) {
            this.currentFps = this.currentWindowFrames / this.currentWindowTimeSeconds;
            this.currentFrameTimeMilliseconds =
                (this.currentWindowTimeSeconds / this.currentWindowFrames) * 1000;
            this.currentWindowTimeSeconds = 0;
            this.currentWindowFrames = 0;
        }
    }

    private clearSamples(): void {
        this.elapsedSeconds = 0;
        this.totalFrames = 0;
        this.totalFrameTimeSeconds = 0;
        this.minimumFrameTimeSeconds = Number.POSITIVE_INFINITY;
        this.maximumFrameTimeSeconds = 0;
        this.frameSpikeCount = 0;
        this.currentWindowTimeSeconds = 0;
        this.currentWindowFrames = 0;
        this.currentFps = 0;
        this.currentFrameTimeMilliseconds = 0;
    }
}
