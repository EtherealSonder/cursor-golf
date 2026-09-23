export type RobotImpactReactionPhase = "IDLE" | "TURN_TO_IMPACT" | "SCANNING";

export interface RobotImpactReactionSnapshot {
    readonly phase: RobotImpactReactionPhase;
    readonly active: boolean;
    readonly impactX: number | null;
    readonly impactY: number | null;
    readonly scanHeadingRadians: number | null;
    readonly elapsedSeconds: number;
}

/** Shared, element-agnostic awareness response used by every robot type. */
export class RobotImpactReactionController {
    private phase: RobotImpactReactionPhase = "IDLE";
    private impactX: number | null = null;
    private impactY: number | null = null;
    private baseHeading = 0;
    private elapsedSeconds = 0;
    private scanDirection: 1 | -1 = 1;

    // Contacts from one continuous source are one stimulus episode. A source
    // must be absent for this long before a later contact may trigger a fresh
    // investigation. Kept presentation/AI-local so elemental systems do not
    // need packet-specific throttling.
    private static readonly CONTACT_REARM_SECONDS = 0.65;
    private readonly contactSilenceSeconds = new Map<string, number>();

    public constructor(
        private readonly durationSeconds: number,
        private readonly totalScanAngleRadians: number,
    ) {}

    public updateContactEpisodes(deltaTime: number): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;
        for (const [key, silence] of this.contactSilenceSeconds) {
            const next = silence + deltaTime;
            if (next >= RobotImpactReactionController.CONTACT_REARM_SECONDS) {
                this.contactSilenceSeconds.delete(key);
            } else {
                this.contactSilenceSeconds.set(key, next);
            }
        }
    }

    /**
     * Records a contact and returns true only when it starts a new stimulus
     * episode. Repeated packets/field samples from the same source merely keep
     * that episode alive and cannot restart or redirect an investigation.
     */
    public observeContact(sourceKind: string, sourceId?: string): boolean {
        const normalizedKind = sourceKind.trim().toLowerCase() || "unknown";
        const normalizedId = sourceId?.trim() || `${normalizedKind}-continuous`;
        const key = `${normalizedKind}:${normalizedId}`;
        const alreadyActive = this.contactSilenceSeconds.has(key);
        this.contactSilenceSeconds.set(key, 0);
        return !alreadyActive;
    }

    public begin(robotX: number, robotY: number, impactX: number, impactY: number): void {
        if (![robotX, robotY, impactX, impactY].every(Number.isFinite)) return;
        this.impactX = impactX;
        this.impactY = impactY;
        this.baseHeading = Math.atan2(impactY - robotY, impactX - robotX);
        // Deterministic alternation avoids every investigation sweeping identically.
        this.scanDirection = this.scanDirection === 1 ? -1 : 1;
        this.elapsedSeconds = 0;
        this.phase = "TURN_TO_IMPACT";
    }

    public markFacingImpact(): void {
        if (this.phase !== "TURN_TO_IMPACT") return;
        this.phase = "SCANNING";
        this.elapsedSeconds = 0;
    }

    public updateScan(deltaTime: number): boolean {
        if (this.phase !== "SCANNING") return false;
        this.elapsedSeconds = Math.min(this.durationSeconds, this.elapsedSeconds + Math.max(0, deltaTime));
        if (this.elapsedSeconds < this.durationSeconds) return false;
        this.clear();
        return true;
    }

    public getImpactHeadingRadians(): number { return this.baseHeading; }

    public getScanHeadingRadians(): number {
        if (this.phase !== "SCANNING") return this.baseHeading;
        const progress = Math.min(1, this.elapsedSeconds / Math.max(0.0001, this.durationSeconds));
        const half = this.totalScanAngleRadians * 0.5;
        const from = -half * this.scanDirection;
        const to = half * this.scanDirection;
        return this.baseHeading + from + (to - from) * progress;
    }

    public isActive(): boolean { return this.phase !== "IDLE"; }
    public getPhase(): RobotImpactReactionPhase { return this.phase; }
    public clear(): void {
        this.phase = "IDLE";
        this.impactX = null;
        this.impactY = null;
        this.elapsedSeconds = 0;
    }

    public getSnapshot(): RobotImpactReactionSnapshot {
        return {
            phase: this.phase,
            active: this.isActive(),
            impactX: this.impactX,
            impactY: this.impactY,
            scanHeadingRadians: this.isActive() ? this.getScanHeadingRadians() : null,
            elapsedSeconds: this.elapsedSeconds,
        };
    }
}
