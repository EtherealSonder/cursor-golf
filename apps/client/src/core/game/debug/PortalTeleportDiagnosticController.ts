/** P3-D2: Event-driven portal diagnostics. No per-frame console spam. */
export class PortalTeleportDiagnosticController {
    public static readonly enabled = import.meta.env.DEV;
    private static readonly states = new Map<string, string>();
    private static readonly lastEvents = new Map<string, number>();
    private static readonly clock = () => performance.now();

    public static event(kind: string, details: Record<string, unknown>, dedupeKey?: string, throttleMs = 500): void {
        if (!this.enabled) return;
        const key = dedupeKey ?? `${kind}:${String(details.portal ?? details.source ?? "")}`;
        const now = this.clock();
        if (now - (this.lastEvents.get(key) ?? -Infinity) < throttleMs) return;
        this.lastEvents.set(key, now);
        console.info(`[PORTAL] ${kind}`, details);
    }

    /** Only log zone changes, including an outer-vortex visit that never reaches the trigger. */
    public static zone(portal: string, zone: string, details: Record<string, unknown>): void {
        if (!this.enabled) return;
        const previous = this.states.get(portal) ?? "outside";
        if (previous === zone) return;
        this.states.set(portal, zone);
        if (zone === "outside" && previous === "outside") return;
        this.event(zone === "outside" && previous !== "centralVoid" ? "NO_ENTRY_DETECTED" : "ZONE_CHANGE", {
            portal, from: previous, to: zone, ...details,
        }, `zone:${portal}:${previous}:${zone}`, 0);
    }

    public static reset(): void {
        this.states.clear();
        this.lastEvents.clear();
    }
}
