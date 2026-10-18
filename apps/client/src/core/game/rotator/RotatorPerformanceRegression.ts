import { ROTATOR_PERFORMANCE_DEBUG, shouldCollideRotators, shouldRenderRotators } from "./RotatorPerformanceDebug";

/** No runtime mutations: production must always retain normal rotator behavior. */
export function assertRotatorPerformanceRegression(): void {
    if (!ROTATOR_PERFORMANCE_DEBUG.enabled && (!shouldRenderRotators() || !shouldCollideRotators())) {
        throw new Error("[P3] Production rotators must render and collide");
    }
    if (typeof shouldRenderRotators() !== "boolean" || typeof shouldCollideRotators() !== "boolean") {
        throw new Error("[P3] Invalid rotator debug flags");
    }
}
