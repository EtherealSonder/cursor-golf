import type { PortalTeleportAdapter } from "./PortalTeleportAdapter";

/** Explicit lifecycle registry. P4-A deliberately registers no gameplay objects. */
export class PortalDynamicAdapterRegistry {
    private readonly adapters = new Map<string, PortalTeleportAdapter>();

    public register(adapter: PortalTeleportAdapter): void {
        if (!adapter.id) throw new Error("Portal adapter requires a stable ID");
        const existing = this.adapters.get(adapter.id);
        if (existing && existing !== adapter) throw new Error(`Duplicate portal adapter ID: ${adapter.id}`);
        this.adapters.set(adapter.id, adapter);

    }

    public unregister(id: string): void { this.adapters.delete(id); }
    public get(id: string): PortalTeleportAdapter | undefined { return this.adapters.get(id); }
    public values(): IterableIterator<PortalTeleportAdapter> { return this.adapters.values(); }
    public get size(): number { return this.adapters.size; }
    public clear(): void { this.adapters.clear(); }
}
