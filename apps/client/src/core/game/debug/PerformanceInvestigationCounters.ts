import { isPerformanceInvestigationEnabled } from "./PerformanceInvestigationDefinition";
/** Aggregate counters only; never logs inside particle/geometry loops. */
export class PerformanceInvestigationCounters {
    public static readonly enabled = isPerformanceInvestigationEnabled();
    private static counts: Record<string, number> = Object.create(null) as Record<string, number>;
    public static add(name: string, amount = 1): void {
        if (!this.enabled) return;
        this.counts[name] = (this.counts[name] ?? 0) + amount;
    }
    /** Pass B counters are accumulated without allocations in hot paths. */
    public static passB(name:string,amount=1):void{this.add(`passB.${name}`,amount);}
    public static snapshot(): Readonly<Record<string,number>> {return {...this.counts};}
    public static get(name: string): number { return this.counts[name] ?? 0; }
    public static reset(): void { this.counts = Object.create(null) as Record<string, number>; }
    public static drain(): Record<string, number> {
        const result = this.counts;
        this.counts = Object.create(null) as Record<string, number>;
        return result;
    }
}
