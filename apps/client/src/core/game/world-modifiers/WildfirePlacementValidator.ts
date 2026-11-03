import type { GeneratedCourseGeometry } from "../level/LevelRuntimeDefinition";
import { containsCourseCircle } from "../level/CourseGeometryQueries";
import type { SurfaceSystem } from "../surface/SurfaceSystem";
import { SurfaceType } from "../surface/SurfaceType";
import { SurfaceState } from "../surface/SurfaceState";
import type { FireManager } from "../environment/FireManager";
import { WILDFIRE_CONFIG } from "./WildfireConfig";

export interface WildfirePoint { readonly x: number; readonly y: number; }

/** WM-5B: read-only bounded checks. No random draws and no fire mutations. */
export class WildfirePlacementValidator {
    public constructor(
        private readonly geometry: GeneratedCourseGeometry,
        private readonly hole: WildfirePoint,
        private readonly spawn: WildfirePoint,
        private readonly surfaces: SurfaceSystem,
        private readonly fire: FireManager,
    ) {}

    public isValid(candidate: WildfirePoint, reservations: readonly WildfirePoint[]): boolean {
        const radius = WILDFIRE_CONFIG.warningRadius;
        if (!containsCourseCircle(this.geometry, candidate, radius)) return false;
        if (Math.hypot(candidate.x - this.hole.x, candidate.y - this.hole.y) < WILDFIRE_CONFIG.holeExclusionRadius + radius) return false;
        if (Math.hypot(candidate.x - this.spawn.x, candidate.y - this.spawn.y) < WILDFIRE_CONFIG.ballSpawnExclusionRadius + radius) return false;
        if (reservations.some(w => Math.hypot(candidate.x - w.x, candidate.y - w.y) < radius * 2)) return false;

        // Center and two concentric rings reject sand/scorch islands inside the warning footprint.
        // Center must also be physically ignitable according to FireManager's authoritative rules.
        if (!this.fire.canIgniteAtPosition(candidate.x, candidate.y)) return false;
        for (const fraction of [0.5, 0.95]) {
            for (let i = 0; i < 12; i++) {
                const angle = i * Math.PI / 6;
                const x = candidate.x + Math.cos(angle) * radius * fraction;
                const y = candidate.y + Math.sin(angle) * radius * fraction;
                const surface = this.surfaces.getSurfaceAt(x, y);
                if (surface.surfaceType !== SurfaceType.Grass || surface.surfaceState === SurfaceState.Scorched) return false;
            }
        }
        // A burning cell anywhere inside the warned area invalidates the candidate.
        // This also avoids warning directly on a nearby established fire front.
        const fireClearance = radius + 24;
        for (const cell of this.fire.getActiveCells()) {
            if (Math.hypot(candidate.x - cell.getWorldCenterX(), candidate.y - cell.getWorldCenterY()) < fireClearance) return false;
        }
        return true;
    }
}
