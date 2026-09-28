import type { ProximityMineExplosionEvent } from "../config/ProximityMineExplosionDefinition";
import { PROXIMITY_MINE_EXPLOSION_FIRE } from "../config/ProximityMineExplosionFireDefinition";

/** Minimal FireManager interface to permit isolated timing tests. */
export interface MinePointFireIgniter {
    igniteArea(x: number, y: number, radius: number, count: number): number;
}

interface PendingMineFire {
    readonly mineId: string;
    readonly x: number;
    readonly y: number;
    remainingSeconds: number;
}

/** Schedules a single ordinary FireManager ignition per detonated mine. */
export class ProximityMineExplosionFireController {
    private readonly pending: PendingMineFire[] = [];
    private readonly scheduledIds = new Set<string>();

    public constructor(private readonly fireManager: MinePointFireIgniter) {}

    public schedule(event: ProximityMineExplosionEvent): boolean {
        if (this.scheduledIds.has(event.mineId)) return false;
        if (!Number.isFinite(event.x) || !Number.isFinite(event.y)) return false;
        this.scheduledIds.add(event.mineId);
        this.pending.push({
            mineId: event.mineId,
            x: event.x,
            y: event.y,
            remainingSeconds: PROXIMITY_MINE_EXPLOSION_FIRE.ignitionDelaySeconds,
        });
        return true;
    }

    public update(deltaSeconds: number): void {
        if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
        // Backwards iteration safely handles simultaneous completions.
        for (let i = this.pending.length - 1; i >= 0; i -= 1) {
            const ignition = this.pending[i];
            ignition.remainingSeconds -= deltaSeconds;
            if (ignition.remainingSeconds > 0) continue;
            this.pending.splice(i, 1);
            this.fireManager.igniteArea(
                ignition.x,
                ignition.y,
                PROXIMITY_MINE_EXPLOSION_FIRE.initialIgnitionRadius,
                PROXIMITY_MINE_EXPLOSION_FIRE.initialIgnitionCount,
            );
        }
    }

    /** Cancel pending ignitions and permit mine IDs to be reused after reset. */
    public reset(): void {
        this.pending.length = 0;
        this.scheduledIds.clear();
    }

    public getPendingCount(): number { return this.pending.length; }
}
