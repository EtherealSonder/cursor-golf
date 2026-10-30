import { PORTAL_DIAGNOSTIC } from "./PortalPerformanceDiagnosticDefinition";
export type PortalDiagnosticSection = "portalIntegration" | "portalRotationStatic" | "portalRotationDynamic" | "portalAnimation" | "dynamicCollision" | "staticCollision" | "compoundNarrowPhase";
type Stat = { milliseconds: number; calls: number };
/** Opt-in singleton: disabled outside level-00; no allocation on inactive hot paths. */
export class PortalPerformanceDiagnosticController {
    public static active: PortalPerformanceDiagnosticController | null = null;
    private elapsed = 0;
    private nextReport = PORTAL_DIAGNOSTIC.reportEverySeconds;
    private finished = false;
    private readonly frames: number[] = [];
    private readonly updateFrames: number[] = [];
    private readonly renderFrames: number[] = [];
    private readonly totals = new Map<PortalDiagnosticSection, Stat>();
    private readonly counters = new Map<string, number>();
    private portalCount = 0;
    private animationCount = 0;
    private lastOverlay = 0;
    public setPortalCount(n: number): void { this.portalCount = n; }
    public setAnimationCount(n: number): void { this.animationCount = n; }
    public count(name: string, amount = 1): void { if (!this.finished) this.counters.set(name, (this.counters.get(name) ?? 0) + amount); }
    public measure<T>(section: PortalDiagnosticSection, fn: () => T): T {
        if (this.finished) return fn();
        const start = performance.now();
        try { return fn(); } finally {
            const stat = this.totals.get(section) ?? {milliseconds:0,calls:0};
            stat.milliseconds += performance.now() - start; stat.calls++;
            this.totals.set(section, stat);
        }
    }
    public recordPresentation(updateMs: number, renderMs: number): void {
        if (this.finished) return;
        if (Number.isFinite(updateMs)) this.updateFrames.push(updateMs);
        if (Number.isFinite(renderMs)) this.renderFrames.push(renderMs);
    }
    public frame(dt: number): void {
        if (this.finished || !Number.isFinite(dt) || dt <= 0) return;
        const seconds = Math.min(dt, 1);
        this.elapsed += seconds;
        this.frames.push(seconds * 1000);
        if (this.elapsed + 1e-6 >= this.nextReport) {
            this.report(`interval-${this.nextReport}s`);
            this.nextReport += PORTAL_DIAGNOSTIC.reportEverySeconds;
        }
        if (this.elapsed >= PORTAL_DIAGNOSTIC.durationSeconds) {
            this.finished = true;
            this.report("FINAL-30s");
        }
    }
    private summary(values: readonly number[]): {average:number;p95:number;max:number} {
        if (!values.length) return {average:0,p95:0,max:0};
        const sorted = [...values].sort((a,b)=>a-b);
        return {average: values.reduce((a,b)=>a+b,0)/values.length,p95:sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.95)-1)],max:sorted[sorted.length-1]};
    }
    public snapshot(): string {
        const f = this.summary(this.frames);
        const u = this.summary(this.updateFrames);
        const r = this.summary(this.renderFrames);
        const fps = f.average > 0 ? 1000/f.average : 0;
        const slow = this.frames.filter(ms=>ms>PORTAL_DIAGNOSTIC.frameBudgetMilliseconds).length;
        const sections = [...this.totals.entries()].map(([name,s])=>`${name}: ${(s.milliseconds/Math.max(1,this.frames.length)).toFixed(3)} ms/frame (${s.calls} calls)`).join("\n");
        const staticKeys = ["staticPairsTested", "staticPairsRejected", "staticPairsAccepted", "staticStationaryAnchorsSkipped", "rotationStaticPairsTested", "rotationStaticPairsRejected", "rotationStaticNarrowPhaseChecks"];
        const staticCounters = staticKeys.map(k=>`${k}: ${this.counters.get(k) ?? 0}`).join(" | ");
        const portalKeys = ["portalOuterVortexEntries","portalCentralEntryAttempts","portalCentralEntryEligible","portalHousingContacts","portalCollisionEntryRejected","portalTeleports","portalEdgeRejections","portalStuckEjections","portalExitBlocked","portalReentryPrevented"];
        const portalCounters = portalKeys.map(k=>`${k}: ${this.counters.get(k) ?? 0}`).join(" | ");
        const counters = [...this.counters.entries()].filter(([k])=>!staticKeys.includes(k)).map(([k,v])=>`${k}: ${v}`).join(" | ");
        return `PORTAL P2-C5 ${this.finished?'COMPLETE':'RECORDING'} ${Math.min(30,this.elapsed).toFixed(1)}/30s\n`+
          `Portals ${this.portalCount} | animated ${this.animationCount} | frames ${this.frames.length}\n`+
          `FPS ${fps.toFixed(1)} | frame avg ${f.average.toFixed(2)}ms p95 ${f.p95.toFixed(2)}ms max ${f.max.toFixed(2)}ms | over budget ${slow}\n`+
          `Game update avg ${u.average.toFixed(2)}ms | Pixi render avg ${r.average.toFixed(2)}ms\n${sections}\n${staticCounters}\n${portalCounters}\n${counters}`;
    }
    public isFinished(): boolean { return this.finished; }
    public shouldRefreshOverlay(): boolean {
        if (this.finished) return false;
        if (this.elapsed - this.lastOverlay < PORTAL_DIAGNOSTIC.overlayRefreshSeconds) return false;
        this.lastOverlay = this.elapsed; return true;
    }
    private report(label: string): void { console.log(`[P2-C5 ${label}]\n${this.snapshot()}`); }
    public destroy(): void { if (PortalPerformanceDiagnosticController.active === this) PortalPerformanceDiagnosticController.active = null; }
}
