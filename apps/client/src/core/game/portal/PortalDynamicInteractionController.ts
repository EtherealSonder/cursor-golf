import type { Portal } from "./Portal";
import { PORTAL_DYNAMIC_INTERACTION as D } from "./PortalInteractionDefinition";
import { dynamicPortalExit, dynamicPortalInteractionCleared, dynamicPortalSweptEntry, portalExitSide } from "./PortalInteractionGeometry";
import { getPairedPortal } from "./PortalPairController";
import type { PortalTeleportPose } from "./PortalTeleportAdapter";
import { PortalDynamicAdapterRegistry } from "./PortalDynamicAdapterRegistry";

/** P4-A: independent per-object portal state. No gameplay adapters are registered yet. */
export class PortalDynamicInteractionController {
    private readonly lastPositions = new Map<string, { x: number; y: number }>();
    private readonly protectedDestinations = new Map<string, string>();
    private readonly cooldowns = new Map<string, number>();
    private readonly entryLatches = new Map<string, string>();
    private readonly diagnosticStates = new Map<string, string>();
    private readonly rejectionCounts = new Map<string, number>();
    private readonly postTeleport = new Map<string, { x: number; y: number; vx: number; vy: number }>();
    private trace(id: string, event: string, details: Record<string, unknown> = {}): void {
        const key = event + ":" + String(details.reason ?? details.portal ?? "");
        if (event === "NEAR_PORTAL") return; // proximity is per-frame, not an actionable transition
        if (this.diagnosticStates.get(id) === key && event !== "TELEPORT_SUCCESS") return;
        this.diagnosticStates.set(id, key);
        // P4-C: diagnostics disabled in normal gameplay.
    }

    public constructor(
        private readonly portals: readonly Portal[],
        private readonly registry: PortalDynamicAdapterRegistry,
        /** Must reject overlap with solid world obstacles. P4-B supplies authoritative query. */
        private readonly isExitClear: (x: number, y: number, radius: number, objectId: string) => boolean,
    ) {}

    public update(dt: number): void {
        if (!Number.isFinite(dt) || dt <= 0) return;
        const active = new Set<string>();
        for (const adapter of this.registry.values()) {
            active.add(adapter.id);
            const pending = this.postTeleport.get(adapter.id);
            if (pending) {
                const actual = adapter.getPose();
                this.trace(adapter.id, "POST_TELEPORT", { expected: pending, actual, displacement: Math.hypot(actual.x - pending.x, actual.y - pending.y) });
                this.postTeleport.delete(adapter.id);
            }
            if (!adapter.canTeleport()) {
                this.lastPositions.delete(adapter.id);
                this.protectedDestinations.delete(adapter.id);
                this.cooldowns.delete(adapter.id);
                this.entryLatches.delete(adapter.id);
                this.trace(adapter.id, "ENTRY_REJECTED", { reason: "INELIGIBLE" });
                continue;
            }
            const pose = adapter.getPose();
            const radius = adapter.getCollisionRadius();
            if (![pose.x, pose.y, pose.vx, pose.vy, radius].every(Number.isFinite) || radius <= 0) { this.trace(adapter.id, "ENTRY_REJECTED", { reason: "INVALID_POSE_OR_RADIUS", pose, radius }); continue; }
            const previous = this.lastPositions.get(adapter.id);
            this.lastPositions.set(adapter.id, { x: pose.x, y: pose.y });
            const protectedId = this.protectedDestinations.get(adapter.id);
            if (protectedId) {
                const destination = this.portals.find(p => p.id === protectedId);
                if (!destination || dynamicPortalInteractionCleared(destination, pose.x, pose.y, radius)) {
                    this.protectedDestinations.delete(adapter.id);
                }
            }
            const cooldown = Math.max(0, (this.cooldowns.get(adapter.id) ?? 0) - dt);
            if (cooldown > 0) this.cooldowns.set(adapter.id, cooldown);
            else this.cooldowns.delete(adapter.id);
            // Clear the entry latch after the object leaves its source vortex.
            const latchedId = this.entryLatches.get(adapter.id);
            if (latchedId) {
                const latched = this.portals.find(p => p.id === latchedId);
                if (!latched || dynamicPortalInteractionCleared(latched, pose.x, pose.y, radius)) {
                    this.entryLatches.delete(adapter.id);
                }
            }
            if (cooldown > 0) { this.trace(adapter.id, "ENTRY_REJECTED", { reason: "COOLDOWN", cooldown }); continue; }
            // On the first registered frame, infer only the preceding movement
            // interval. This avoids missing an entry on a newly spawned object
            // while still requiring motion through the physical central gap.
            const from = previous ?? { x: pose.x - pose.vx * dt, y: pose.y - pose.vy * dt };
            const speed = Math.hypot(pose.vx, pose.vy);
            if (speed < D.minimumEntrySpeed || speed > D.maximumEntrySpeed) {
                this.trace(adapter.id, "ENTRY_REJECTED", { reason: "SPEED", speed, min: D.minimumEntrySpeed, max: D.maximumEntrySpeed });
                continue;
            }
            for (const source of this.portals) {
                if (this.protectedDestinations.get(adapter.id) === source.id) { this.trace(adapter.id, "ENTRY_REJECTED", { reason: "DESTINATION_PROTECTED", portal: source.id }); continue; }
                if (this.entryLatches.get(adapter.id) === source.id) { this.trace(adapter.id, "ENTRY_REJECTED", { reason: "ENTRY_LATCHED", portal: source.id }); continue; }
                const distance = Math.hypot(pose.x - source.getX(), pose.y - source.getY());
                if (distance < 190 + radius) this.trace(adapter.id, "NEAR_PORTAL", { portal: source.id, distance: +distance.toFixed(1), radius, speed: +speed.toFixed(1), from, pose });
                if (!dynamicPortalSweptEntry(source, from.x, from.y, pose.x, pose.y, radius, pose.vx, pose.vy)) {
                    if (distance < 115 + radius) this.trace(adapter.id, "ENTRY_REJECTED", { reason: "ENTRY_GEOMETRY", portal: source.id, distance, radius, from, pose });
                    continue;
                }
                this.trace(adapter.id, "ENTRY_ACCEPTED", { portal: source.id, from, pose, radius });
                const destination = getPairedPortal(this.portals, source);
                if (!destination) { this.trace(adapter.id, "ENTRY_REJECTED", { reason: "PAIR_MISSING", portal: source.id }); continue; }
                const delta = destination.getRotation() - source.getRotation();
                const c = Math.cos(delta), s = Math.sin(delta);
                const vx = pose.vx * c - pose.vy * s;
                const vy = pose.vx * s + pose.vy * c;
                const localNormal = -pose.vx * Math.sin(source.getRotation()) + pose.vy * Math.cos(source.getRotation());
                const fallback: 1 | -1 = localNormal >= 0 ? 1 : -1;
                const side = portalExitSide(destination, vx, vy, fallback);
                // Search progressively outward on the exit normal. The first
                // candidate is preferred, but nearby blockers must not silently
                // disable otherwise valid transfers.
                let exit: { x: number; y: number } | null = null;
                for (let step = 0; step <= D.exitSearchSteps; step++) {
                    const candidate = dynamicPortalExit(destination, radius + step * D.exitSearchStep, side);
                    if (this.isExitClear(candidate.x, candidate.y, radius, adapter.id)) {
                        exit = candidate;
                        break;
                    }
                }
                if (!exit) { this.trace(adapter.id, "EXIT_BLOCKED", { portal: source.id, destination: destination.id, radius, steps: D.exitSearchSteps + 1 }); continue; }
                const relocated: PortalTeleportPose = { x: exit.x, y: exit.y, vx, vy };
                adapter.applyTeleport(relocated);
                // The adapter is authoritative; reject any relocation it could not commit.
                const committed = adapter.getPose();
                if (Math.hypot(committed.x - exit.x, committed.y - exit.y) > 0.5) { this.trace(adapter.id, "ENTRY_REJECTED", { reason: "COMMIT_MISMATCH", expected: exit, committed }); continue; }
                this.trace(adapter.id, "TELEPORT_SUCCESS", { source: source.id, destination: destination.id, from: pose, to: committed });
                this.postTeleport.set(adapter.id, { x: committed.x, y: committed.y, vx: committed.vx, vy: committed.vy });
                this.lastPositions.set(adapter.id, { x: committed.x, y: committed.y });
                this.protectedDestinations.set(adapter.id, destination.id);
                this.entryLatches.set(adapter.id, source.id);
                this.cooldowns.set(adapter.id, D.reentryCooldownSeconds);
                break;
            }
        }
        // Remove state for adapters unregistered since the previous frame.
        for (const id of this.lastPositions.keys()) if (!active.has(id)) this.lastPositions.delete(id);
        for (const id of this.protectedDestinations.keys()) if (!active.has(id)) this.protectedDestinations.delete(id);
        for (const id of this.cooldowns.keys()) if (!active.has(id)) this.cooldowns.delete(id);
        for (const id of this.entryLatches.keys()) if (!active.has(id)) this.entryLatches.delete(id);
        for (const id of this.diagnosticStates.keys()) if (!active.has(id)) this.diagnosticStates.delete(id);
    }

    public dispose(): void {
        this.lastPositions.clear();
        this.protectedDestinations.clear();
        this.cooldowns.clear();
        this.entryLatches.clear();
        this.diagnosticStates.clear();
        this.rejectionCounts.clear();
        this.postTeleport.clear();
    }
}
