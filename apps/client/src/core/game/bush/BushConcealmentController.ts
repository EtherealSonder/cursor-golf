import { BUSH_DEFINITION } from "./BushDefinition";

/** Stable gameplay concealment, independent of the B4 visual fade. */
export class BushConcealmentController {
    private concealed = false;
    private coverage = 0;

    public update(coverage: number): void {
        this.coverage = Number.isFinite(coverage) ? Math.max(0, Math.min(1, coverage)) : 0;
        if (this.concealed) {
            if (this.coverage <= BUSH_DEFINITION.concealmentReleaseCoverage) this.concealed = false;
        } else if (this.coverage >= BUSH_DEFINITION.concealmentActivationCoverage) {
            this.concealed = true;
        }
    }

    public get isConcealed(): boolean { return this.concealed; }
    public get currentCoverage(): number { return this.coverage; }
    public reset(): void { this.concealed = false; this.coverage = 0; }
}
