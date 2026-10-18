/** Temporary R3/P3 development-only isolation switches. No URL routes or logging. */
export const ROTATOR_PERFORMANCE_DEBUG = {
    enabled: import.meta.env.DEV,
    renderEnabled: true,
    collisionEnabled: true,
} as const;

export function shouldRenderRotators(): boolean {
    return !ROTATOR_PERFORMANCE_DEBUG.enabled || ROTATOR_PERFORMANCE_DEBUG.renderEnabled;
}

export function shouldCollideRotators(): boolean {
    return !ROTATOR_PERFORMANCE_DEBUG.enabled || ROTATOR_PERFORMANCE_DEBUG.collisionEnabled;
}
