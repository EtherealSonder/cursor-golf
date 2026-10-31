import { PORTAL_TELEPORT_TRACE, type PortalTraceKind } from "./PortalTeleportTraceDefinition";
/** Diagnostic-only, event-driven. Each attempt gets a unique trace ID. */
export class PortalTeleportDiagnosticController {
    public static readonly enabled = PORTAL_TELEPORT_TRACE.enabled;
    private static nextId = 1;
    private static lastTransfer: { at: number; destination: string; id: number } | null = null;
    private static readonly lastRejected = new Map<string, number>();
    public static begin(source: string, details: Record<string, unknown>): number {
        const id = this.nextId++;
        const now = performance.now();
        const previous = this.lastTransfer;
        if (previous && now - previous.at < PORTAL_TELEPORT_TRACE.reentryWindowMs) {
            this.emit(id, "REENTRY_SUSPECTED", { source, previousTraceId: previous.id, previousDestination: previous.destination, elapsedMs: Math.round(now - previous.at) });
        }
        this.emit(id, "ENTRY", { source, ...details });
        return id;
    }
    public static emit(id: number, kind: PortalTraceKind, details: Record<string, unknown>): void {
        if (!this.enabled) return;
        console.info(`[PORTAL #${id}] ${kind}`, { traceId: id, timeMs: Math.round(performance.now()), ...details });
    }
    public static rejected(source: string, reason: string, details: Record<string, unknown>): void {
        if (!this.enabled || reason === "COOLDOWN_ACTIVE") return;
        const key = `${source}:${reason}`;
        const now = performance.now();
        if (now - (this.lastRejected.get(key) ?? -Infinity) < 750) return;
        this.lastRejected.set(key, now);
        const id = this.begin(source, details);
        this.emit(id, "REJECTED", { reason, ...details });
    }
    public static completed(id: number, destination: string, details: Record<string, unknown>): void {
        this.emit(id, "TRANSFER_COMPLETE", { destination, ...details });
        this.lastTransfer = { at: performance.now(), destination, id };
    }
    public static reset(): void { this.nextId = 1; this.lastTransfer = null; this.lastRejected.clear(); }
}
