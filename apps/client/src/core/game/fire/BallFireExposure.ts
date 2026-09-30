import type { Ball } from "../entities/Ball";
import type { FireManager } from "../environment/FireManager";
import type { FireSourceSystem } from "../environment/FireSourceSystem";
import { FireSourceType } from "../config/FireSourceDefinition";

/**
 * Converts existing authoritative Fire simulation around the Ball into a
 * normalized exposure value. Fire VFX is deliberately never sampled.
 */
export class BallFireExposure {
    constructor(
        private readonly fireManager: FireManager,
        private readonly fireSourceSystem: FireSourceSystem,
    ) {}

    public sample(ball: Ball): number {
        const x = ball.getX();
        const y = ball.getY();
        const radius = ball.getRadius();
        const cellSize = this.fireManager.getDefinition().cellSize;
        const cellReach = radius + cellSize * Math.SQRT2 * 0.5;
        const cellReachSquared = cellReach * cellReach;

        let exposure = 0;
        for (const cell of this.fireManager.getActiveCells()) {
            const dx = x - cell.getWorldCenterX();
            const dy = y - cell.getWorldCenterY();
            if (dx * dx + dy * dy <= cellReachSquared) {
                exposure = Math.max(exposure, cell.getIntensity());
            }
        }

        // Directional sources are authoritative gameplay heat emitters. Their
        // jet can overlap the Ball before/without a coarse ground cell existing.
        for (const source of this.fireSourceSystem.getSources()) {
            if (!source.isEnabled() || source.getType() !== FireSourceType.Directional) {
                continue;
            }
            const definition = source.getDefinition();
            if (definition.type !== FireSourceType.Directional) continue;

            const dx = x - source.getPositionX();
            const dy = y - source.getPositionY();
            const cos = Math.cos(source.getDirectionRadians());
            const sin = Math.sin(source.getDirectionRadians());
            const forward = dx * cos + dy * sin;
            const lateral = -dx * sin + dy * cos;

            if (
                forward >= -radius &&
                forward <= definition.length + radius &&
                Math.abs(lateral) <= definition.halfWidth + radius
            ) {
                const normalizedForward = Math.min(1, Math.max(0, forward / definition.length));
                const directionalIntensity =
                    1 - normalizedForward * (1 - definition.endHeatMultiplier);
                exposure = Math.max(exposure, directionalIntensity);
            }
        }

        return Math.min(1, Math.max(0, exposure));
    }
}
