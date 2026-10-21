import type { Crate } from "../crate/Crate";
import type { CourseFootprint } from "../level/CourseBoundaryFootprintQuery";
import type { Entity } from "../entities/Entity";
import type { CourseEnvironmentBoundary } from "../level/CourseEnvironmentBoundary";

/** V1: visual removal is separate from gameplay deactivation and authoritative World teardown. */
export class WorldObjectVoidController {
    private readonly pending = new Map<Entity, { elapsed: number; originalScaleX: number; originalScaleY: number }>();
    public constructor(private readonly boundary: CourseEnvironmentBoundary, private readonly durationSeconds = 0.25) {}

    public isPending(entity: Entity): boolean { return this.pending.has(entity); }
    public update(deltaSeconds: number, candidates: readonly Entity[], deactivate: (entity: Entity) => void, remove: (entity: Entity) => void, footprintOf?: (entity: Entity) => CourseFootprint): void {
        for (const entity of candidates) {
            if (entity.isDestroyed() || this.pending.has(entity)) continue;
            const footprint = footprintOf?.(entity) ?? { kind: "circle" as const, x: entity.getX(), y: entity.getY(), radius: 1 };
            if (this.boundary.isFootprintMostlyOutside(footprint, 0.8)) {
                // Disable physics, sources and AI BEFORE the first shrink frame.
                deactivate(entity);
                const scale = entity.getContainer().scale;
                this.pending.set(entity, { elapsed: 0, originalScaleX: scale.x, originalScaleY: scale.y });
            }
        }
        const dt = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
        for (const [entity, state] of this.pending) {
            state.elapsed += dt;
            const fraction = Math.min(1, state.elapsed / this.durationSeconds);
            const remaining = (1 - fraction) * (1 - fraction);
            if (!entity.isDestroyed()) entity.getContainer().scale.set(state.originalScaleX * remaining, state.originalScaleY * remaining);
            if (fraction >= 1 || entity.isDestroyed()) {
                this.pending.delete(entity);
                if (!entity.isDestroyed()) remove(entity);
            }
        }
    }
    private readonly pendingCrates = new Map<Crate, number>();
    /** Uses the same footprint threshold, easing and duration as entity void removal. */
    public updateCrates(deltaSeconds: number, candidates: readonly Crate[], deactivate: (crate: Crate) => void, remove: (crate: Crate) => void, footprintOf: (crate: Crate) => CourseFootprint): void {
        for (const crate of candidates) {
            if (crate.isDestroyed || crate.isVoidRemoving || this.pendingCrates.has(crate)) continue;
            if (!this.boundary.isFootprintMostlyOutside(footprintOf(crate), 0.8)) continue;
            if (!crate.beginVoidRemoval()) continue;
            deactivate(crate);
            this.pendingCrates.set(crate, 0);
        }
        const dt = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
        for (const [crate, elapsed] of this.pendingCrates) {
            if (crate.isDestroyed) { this.pendingCrates.delete(crate); continue; }
            const next = elapsed + dt;
            const fraction = Math.min(1, next / this.durationSeconds);
            crate.setVoidScale((1 - fraction) * (1 - fraction));
            if (fraction >= 1) {
                this.pendingCrates.delete(crate);
                remove(crate);
            } else this.pendingCrates.set(crate, next);
        }
    }
    public forgetCrate(crate: Crate): void { this.pendingCrates.delete(crate); }
    public forget(entity: Entity): void { this.pending.delete(entity); }
    public clear(): void { this.pending.clear(); this.pendingCrates.clear(); }
}
