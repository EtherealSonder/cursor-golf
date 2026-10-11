import { Container, Graphics, Text } from "pixi.js";
import { PerformanceInvestigationCounters } from "./PerformanceInvestigationCounters";
import { PERFORMANCE_INVESTIGATION } from "./PerformanceInvestigationDefinition";
import type { WaterPerformanceSnapshot } from "./WaterPerformanceProfiler";

/** Lightweight presentation-side diagnostic. Uses the existing authoritative world profiler. */
export class PerformanceInvestigationController {
    private readonly root = new Container();
    private readonly background = new Graphics();
    private readonly label = new Text({ text: "P1 collecting...", style: { fontFamily: "monospace", fontSize: 11, fill: 0xffffff, lineHeight: 15 } });
    private readonly frames: number[] = [];
    private elapsed = 0;
    private refreshElapsed = 0;
    private samples = 0;
    private lastReport = "";
    constructor(private readonly mode: string) {
        this.root.eventMode = "none";
        this.root.zIndex = 20000;
        this.root.position.set(12, 40);
        this.label.position.set(9, 8);
        this.root.addChild(this.background, this.label);
    }
    public getContainer(): Container { return this.root; }
    public update(deltaSeconds: number, snapshot: WaterPerformanceSnapshot, extra: { waterPackets: number; windParticles: number; fireParticles: number; backgroundEnabled: boolean }): void {
        if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
        const ms = deltaSeconds * 1000;
        this.frames.push(ms);
        if (this.frames.length > PERFORMANCE_INVESTIGATION.maximumFrameSamples) this.frames.shift();
        this.elapsed += deltaSeconds;
        this.refreshElapsed += deltaSeconds;
        this.samples++;
        if (this.refreshElapsed >= PERFORMANCE_INVESTIGATION.overlayRefreshSeconds) {
            this.refreshElapsed = 0;
            const sorted = [...this.frames].sort((a, b) => a - b);
            const avg = this.frames.reduce((a, b) => a + b, 0) / Math.max(1, this.frames.length);
            const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0;
            const lines = [
                `P3 WIND QUERY PERFORMANCE INVESTIGATION  ${this.mode}`,
                `FPS ${(1000 / Math.max(0.01, avg)).toFixed(1)} | frame ${avg.toFixed(2)} ms | p95 ${p95.toFixed(2)} ms`,
                `World ${snapshot.worldUpdateAverageMilliseconds.toFixed(2)} ms | Pixi render ${snapshot.pixiRenderAverageMilliseconds.toFixed(2)} ms`,
                `Water packets ${extra.waterPackets} | Wind sprites ${extra.windParticles} | Fire particles ${extra.fireParticles}`,
                `Water airborne ${snapshot.airborneWaterAverageMilliseconds.toFixed(2)} | flow ${snapshot.waterSimulationAverageMilliseconds.toFixed(2)} | ground ${snapshot.waterGroundInteractionAverageMilliseconds.toFixed(2)} ms`,
                `Water VFX ${ (snapshot.sprinklerWaterVfxAverageMilliseconds + snapshot.hoseWaterVfxAverageMilliseconds + snapshot.waterVfxCoreAverageMilliseconds).toFixed(2)} ms`,
                `Fire sim ${snapshot.fireSimulationAverageMilliseconds.toFixed(2)} | Wind VFX ${snapshot.windPresentationAverageMilliseconds.toFixed(2)} ms`,
                `Background ${extra.backgroundEnabled ? "ON" : "OFF"} | report every ${PERFORMANCE_INVESTIGATION.sampleSeconds}s`,
            ];
            this.label.text = lines.join("\n");
            this.background.clear().roundRect(0, 0, this.label.width + 18, this.label.height + 16, 6).fill({ color: 0x111722, alpha: 0.9 });
        }
        if (this.elapsed >= PERFORMANCE_INVESTIGATION.sampleSeconds) {
            const sorted = [...this.frames].sort((a, b) => a - b);
            const avg = this.frames.reduce((a, b) => a + b, 0) / Math.max(1, this.frames.length);
            const report = {
                phase: "P3", optimization: "wind-spatial-index", mode: this.mode, seconds: Number(this.elapsed.toFixed(1)),
                fps: Number((1000 / Math.max(0.01, avg)).toFixed(1)),
                frameAvgMs: Number(avg.toFixed(2)),
                frameP95Ms: Number((sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0).toFixed(2)),
                frameMaxMs: Number((sorted[sorted.length - 1] ?? 0).toFixed(2)),
                worldUpdateMs: snapshot.worldUpdateAverageMilliseconds,
                pixiRenderMs: snapshot.pixiRenderAverageMilliseconds,
                waterAirborneMs: snapshot.airborneWaterAverageMilliseconds,
                waterFlowMs: snapshot.waterSimulationAverageMilliseconds,
                waterGroundMs: snapshot.waterGroundInteractionAverageMilliseconds,
                fireSimulationMs: snapshot.fireSimulationAverageMilliseconds,
                windPresentationMs: snapshot.windPresentationAverageMilliseconds,
                ...extra,
                boundaryWorkload: PerformanceInvestigationCounters.drain(),
            };
            this.lastReport = JSON.stringify(report);
            console.info("[P1 PERF REPORT]", this.lastReport);
            this.elapsed = 0;
            this.frames.length = 0;
            this.samples = 0;
        }
    }
    public getLastReport(): string { return this.lastReport; }
    public destroy(): void { this.root.destroy({ children: true }); }
}
