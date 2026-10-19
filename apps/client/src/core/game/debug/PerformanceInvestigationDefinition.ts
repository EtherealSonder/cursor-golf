/** P1 is opt-in via ?perfdiag=1. Never changes authoritative simulation. */
export const PERFORMANCE_INVESTIGATION = {
    sampleSeconds: 5,
    automatedPresetCount: 8,
    warmupSeconds: 5,
    reportCount: 12,
    overlayRefreshSeconds: 0.5,
    frameBudgetMilliseconds: 16.67,
    maximumFrameSamples: 1200,
    windIndexDiagnostics: true,
} as const;

export function isWaterVfxIsolationB1(): boolean {
    return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("perfdiag")?.toUpperCase() === "B1";
}

export function isWindVfxIsolationB3(): boolean {
    return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("perfdiag")?.toUpperCase() === "B3";
}

export function isBackgroundAnimationIsolationB4(): boolean {
    return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("perfdiag")?.toUpperCase() === "B4";
}

export function isFrameStallAttributionP3A1(): boolean {
    return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("perfdiag")?.toUpperCase() === "P3A1";
}

export function isBrowserMainThreadTraceP3A2(): boolean {
    return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("perfdiag")?.toUpperCase() === "P3A2";
}

export function isGeometryQueryAttributionP3B1(): boolean {
    return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("perfdiag")?.toUpperCase() === "P3B1";
}

export function isWaterSubphaseProfilingP3C1(): boolean {
    return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("perfdiag")?.toUpperCase() === "P3C1";
}

export function isPixiPresentationProfilingP3C2(): boolean {
    return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("perfdiag")?.toUpperCase() === "P3C2";
}

export function isAllEnabledBaseline(): boolean {
    return typeof window !== "undefined" && new URLSearchParams(window.location.search).get("perfdiag")?.toUpperCase() === "BASELINE";
}

export function isPerformanceInvestigationEnabled(): boolean {
    return typeof window !== "undefined" && ["1", "B1", "B3", "B4", "P3A1", "P3A2", "P3B1", "P3C1", "P3C2", "BASELINE"].includes(new URLSearchParams(window.location.search).get("perfdiag")?.toUpperCase() ?? "");
}

/** Caller stack capture is strictly opt-in; BASELINE and gameplay remain unaffected. */
export function isGeometryCallerSamplingEnabled(): boolean {
    return isGeometryQueryAttributionP3B1();
}
