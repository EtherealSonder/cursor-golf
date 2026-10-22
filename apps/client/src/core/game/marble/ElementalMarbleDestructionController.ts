import type { CourseEnvironmentBoundary } from "../level/CourseEnvironmentBoundary";
import { ELEMENTAL_MARBLE_PHYSICS } from "./ElementalMarbleDefinition";
import type { ElementalMarble } from "./ElementalMarble";

/** Coordinates OOB shrink and wind-nozzle consumption without elemental discharge. */
export class ElementalMarbleDestructionController {
    private readonly pending = new Map<ElementalMarble, { elapsed: number; duration: number }>();
    constructor(private readonly boundary: CourseEnvironmentBoundary, private readonly voidDuration = 0.25) {}
    public begin(marble: ElementalMarble, duration = this.voidDuration): boolean {
        if (!marble.beginRemoval()) return false;
        this.pending.set(marble, { elapsed: 0, duration: Math.max(0.001, duration) });
        return true;
    }
    public beginCapture(marble: ElementalMarble): boolean {
        return marble.beginRemoval();
    }
    public update(deltaSeconds: number, marbles: readonly ElementalMarble[], deactivate: (marble: ElementalMarble) => void, remove: (marble: ElementalMarble) => void): void {
        for (const marble of marbles) {
            if (marble.isRemoving()) continue;
            if (!this.boundary.isFootprintMostlyOutside({ kind: "circle", x: marble.getX(), y: marble.getY(), radius: ELEMENTAL_MARBLE_PHYSICS.radius }, 0.8)) continue;
            if (this.begin(marble)) deactivate(marble);
        }
        const dt = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
        for (const [marble, state] of this.pending) {
            state.elapsed += dt;
            const t = Math.min(1, state.elapsed / state.duration);
            marble.setRemovalScale((1 - t) * (1 - t));
            if (t >= 1) { this.pending.delete(marble); remove(marble); }
        }
    }
    public forget(marble: ElementalMarble): void { this.pending.delete(marble); }
    public clear(): void { this.pending.clear(); }
}
