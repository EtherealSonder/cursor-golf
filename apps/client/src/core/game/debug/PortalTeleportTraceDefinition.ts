/** P3-D4: diagnostic-only portal transfer trace schema. */
export const PORTAL_TELEPORT_TRACE = { enabled: import.meta.env.DEV, reentryWindowMs: 1500 } as const;
export type PortalTraceKind = "ENTRY" | "EXIT_CALCULATED" | "TRANSFER_COMPLETE" | "REENTRY_SUSPECTED" | "REJECTED";
export interface PortalTraceEvent { traceId: number; kind: PortalTraceKind; timestampMs: number; details: Record<string, unknown>; }
