/** P1 is opt-in via ?perfdiag=1. Never changes authoritative simulation. */
export const PERFORMANCE_INVESTIGATION = {
    sampleSeconds: 5,
    automatedPresetCount: 8,
    warmupSeconds: 5,
    reportCount: 5,
    overlayRefreshSeconds: 0.5,
    frameBudgetMilliseconds: 16.67,
    maximumFrameSamples: 1200,
    windIndexDiagnostics: true,
} as const;

export function isPerformanceInvestigationEnabled(): boolean {
    return false; // Retained for future investigations; URL activation disabled.
}
