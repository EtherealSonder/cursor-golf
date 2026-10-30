/** Development-only, finite diagnostic for the six-portal Figma level. */
export const PORTAL_DIAGNOSTIC = {
    levelId: "level-00", durationSeconds: 30, reportEverySeconds: 5,
    frameBudgetMilliseconds: 16.67, overlayRefreshSeconds: 0.25,
    showPortalColliders: false,
    enablePerformanceReports: false,
} as const;
export function isPortalDiagnosticLevel(levelId: string): boolean {
    return import.meta.env.DEV && levelId === PORTAL_DIAGNOSTIC.levelId;
}
