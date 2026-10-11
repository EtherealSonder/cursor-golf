import { fractionOutsideFootprint } from "../level/CourseBoundaryFootprintQuery";
import { WorldObjectVoidController } from "../world/WorldObjectVoidController";
import type { Entity } from "../entities/Entity";
import type { CourseEnvironmentBoundary } from "../level/CourseEnvironmentBoundary";

/** Minimal lifecycle contract independent of rendering/physics fixtures. */
export function assertCourseObjectVoidValidation(): void {
    const inside = { x: 10, y: 10, scale: { x: 1, y: 1, set(x: number, y: number) { this.x = x; this.y = y; } } };
    let destroyed = false, deactivated = 0, removed = 0;
    const entity = {
        getX: () => inside.x, getY: () => inside.y,
        getContainer: () => ({ scale: inside.scale }), isDestroyed: () => destroyed,
    } as unknown as Entity;
    const boundary = { containsPoint: (x: number, y: number) => x >= 0 && y >= 0 && x <= 20 && y <= 20,
        isFootprintMostlyOutside: (footprint: {x:number;y:number}) => footprint.x < 0 || footprint.x > 20 || footprint.y < 0 || footprint.y > 20 } as CourseEnvironmentBoundary;
    const controller = new WorldObjectVoidController(boundary, 0.25);
    const deactivate = () => { deactivated++; };
    const remove = () => { removed++; destroyed = true; };
    controller.update(0.1, [entity], deactivate, remove);
    if (deactivated || removed) throw new Error("V1: valid object was removed");
    inside.x = 30;
    controller.update(0.1, [entity], deactivate, remove);
    if (deactivated !== 1 || removed || !controller.isPending(entity) || !(inside.scale.x < 1)) throw new Error("V1: crossing did not deactivate and shrink");
    controller.update(0.2, [entity], deactivate, remove);
    if (removed !== 1 || controller.isPending(entity) || inside.scale.x !== 0) throw new Error("V1: final removal failed");
    controller.update(1, [entity], deactivate, remove);
    if (removed !== 1 || deactivated !== 1) throw new Error("V1: duplicate cleanup");
}

/** Regression: grazing the boundary is not equivalent to half of the body leaving. */
export function assertCourseVoidFootprintThreshold(boundary: CourseEnvironmentBoundary): void {
    if (boundary.isFootprintMostlyOutside({ kind: "circle", x: 10, y: 10, radius: 2 }))
        throw new Error("V1: an interior footprint was incorrectly removed");
}

/** 80% area coverage: midpoint is safe, an almost fully outside body is not. */
export function assertCourseVoidEightyPercentThreshold(): void {
    const inside = (x: number, _y: number) => x >= 0;
    for (const centerX of [1, 0, -1]) {
        const fraction = fractionOutsideFootprint(inside, {kind: "circle", x: centerX, y: 0, radius: 10});
        if (fraction > 0.8) throw new Error("V1: partial exit prematurely exceeds 80% threshold");
    }
    const outside = fractionOutsideFootprint(inside, {kind: "circle", x: -9, y: 0, radius: 10});
    if (outside <= 0.8) throw new Error("V1: mostly outside circle must trigger removal");
}
