import type { CourseFootprint } from "../level/CourseBoundaryFootprintQuery";
import type { CourseEnvironmentBoundary } from "../level/CourseEnvironmentBoundary";

/** Records the authoritative trigger frame; death-iris screenshots may show a later frame. */
export class CourseBoundaryDeathDiagnostics {
    public static report(boundary: CourseEnvironmentBoundary, footprint: CourseFootprint, trigger: "ball-death" | "object-removal", id?: string, crossing?: {x: number; y: number; fraction: number} | null): void {
        const outsideFraction = boundary.fractionOutside(footprint);
        console.info("[COURSE EXIT]", { trigger, id, x: footprint.x, y: footprint.y,
            outsideFraction: Number(outsideFraction.toFixed(4)), threshold: trigger === "ball-death" ? 0.8 : 0.8, crossing: crossing ?? null,
            footprint });
    }
}
