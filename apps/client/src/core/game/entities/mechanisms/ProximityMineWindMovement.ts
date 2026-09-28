import type { LocalWindSystem } from "../../environment/LocalWindSystem";
import type { ProximityMine } from "./ProximityMine";
import { PROXIMITY_MINE_DEFINITION as D } from "../../config/ProximityMineDefinition";
/** Only suction-wind robot sources displace mines; environmental fans are excluded. */
export class ProximityMineWindMovement {
    private readonly velocities = new Map<string, { x: number; y: number }>();
    public update(mines: readonly ProximityMine[], wind: LocalWindSystem, dt: number): void {
        if (dt <= 0) return;
        for (const mine of mines) {
            if (mine.getState() === "DETONATED") continue;
            const sample = wind.sampleAt(mine.getX(), mine.getY());
            const robotSources = wind.getSources().filter(source => source.enabled && source.flowMode === "pull" && source.id.endsWith("-suction-wind") && sample.contributingSourceIds.includes(source.id));
            const velocity = this.velocities.get(mine.mineId) ?? { x: 0, y: 0 };
            if (robotSources.length) {
                // Pull explicitly toward the active suction nozzle; do not use unrelated fan acceleration.
                let ax = 0, ay = 0;
                for (const source of robotSources) {
                    const dx = source.positionX - mine.getX(), dy = source.positionY - mine.getY();
                    const length = Math.max(1, Math.hypot(dx, dy));
                    ax += dx / length * D.windPullAcceleration;
                    ay += dy / length * D.windPullAcceleration;
                }
                velocity.x += ax * dt; velocity.y += ay * dt;
            } else {
                const damping = Math.exp(-D.windVelocityDamping * dt);
                velocity.x *= damping; velocity.y *= damping;
            }
            const speed = Math.hypot(velocity.x, velocity.y);
            if (speed > D.windMaximumSpeed) { velocity.x *= D.windMaximumSpeed / speed; velocity.y *= D.windMaximumSpeed / speed; }
            mine.setPosition(mine.getX() + velocity.x * dt, mine.getY() + velocity.y * dt);
            this.velocities.set(mine.mineId, velocity);
        }
    }
    public forget(id: string): void { this.velocities.delete(id); }
    public reset(): void { this.velocities.clear(); }
}
