/** Exclusive ownership of the performance sampler. Ownership remains latched after completion. */
export type DiagnosticRunOwner = "P0" | "PASS-A" | "PASS-B";
export class PerformanceDiagnosticRunCoordinator {
 private owner: DiagnosticRunOwner | null = null;
 public claim(next: DiagnosticRunOwner): void { this.owner = next; }
 public is(owner: DiagnosticRunOwner): boolean { return this.owner === owner; }
 public get current(): DiagnosticRunOwner | null { return this.owner; }
 public clear(): void { this.owner = null; }
}
