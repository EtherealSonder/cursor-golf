import type {
    WaterImpactVfxDefinition,
} from "../config/WaterImpactVfxDefinition";

export interface WaterImpactEmissionBudgetSnapshot {
    readonly elapsedInWindowSeconds: number;
    readonly acceptedCompositions: number;
    readonly rejectedCompositions: number;
    readonly acceptedRipples: number;
    readonly rejectedRipples: number;
}

/**
 * 8I-7J presentation-only global safety budget.
 *
 * Source adapters still own semantic aggregation/cooldowns. This class is the
 * final shared limiter and never mutates authoritative Water state.
 */
export class WaterImpactEmissionBudget {
    private elapsedInWindowSeconds = 0;
    private acceptedCompositions = 0;
    private rejectedCompositions = 0;
    private acceptedRipples = 0;
    private rejectedRipples = 0;

    public constructor(
        private readonly definition: WaterImpactVfxDefinition,
    ) { }

    public update(deltaTime: number): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;

        this.elapsedInWindowSeconds += deltaTime;

        if (
            this.elapsedInWindowSeconds >=
            this.definition.impactEmissionBudgetWindowSeconds
        ) {
            this.beginNewWindow();
        }
    }

    public tryConsumeComposition(
        normalizedIntensity: number,
    ): boolean {
        if (
            !Number.isFinite(normalizedIntensity) ||
            normalizedIntensity <
            this.definition.impactMinimumPresentationIntensity
        ) {
            this.rejectedCompositions += 1;
            return false;
        }

        if (
            this.acceptedCompositions >=
            this.definition.impactMaximumCompositionsPerSecond
        ) {
            this.rejectedCompositions += 1;
            return false;
        }

        this.acceptedCompositions += 1;
        return true;
    }

    public tryConsumeRipple(): boolean {
        if (
            this.acceptedRipples >=
            this.definition.impactMaximumRipplesPerSecond
        ) {
            this.rejectedRipples += 1;
            return false;
        }

        this.acceptedRipples += 1;
        return true;
    }

    public getSnapshot(): WaterImpactEmissionBudgetSnapshot {
        return {
            elapsedInWindowSeconds:
                this.elapsedInWindowSeconds,
            acceptedCompositions:
                this.acceptedCompositions,
            rejectedCompositions:
                this.rejectedCompositions,
            acceptedRipples:
                this.acceptedRipples,
            rejectedRipples:
                this.rejectedRipples,
        };
    }

    public reset(): void {
        this.elapsedInWindowSeconds = 0;
        this.acceptedCompositions = 0;
        this.rejectedCompositions = 0;
        this.acceptedRipples = 0;
        this.rejectedRipples = 0;
    }

    private beginNewWindow(): void {
        this.elapsedInWindowSeconds =
            this.elapsedInWindowSeconds %
            this.definition.impactEmissionBudgetWindowSeconds;

        this.acceptedCompositions = 0;
        this.rejectedCompositions = 0;
        this.acceptedRipples = 0;
        this.rejectedRipples = 0;
    }
}
