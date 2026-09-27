import { Container, Graphics } from 'pixi.js';
import { PROXIMITY_MINE_DEFINITION as D } from '../../config/ProximityMineDefinition';
interface Ring { graphics: Graphics; age: number; color: number; }
/** Presentation only: each ring retains its emission color and reaches the detection boundary. */
export class ProximityMineWarningVfx {
    public readonly container = new Container();
    private readonly rings: Ring[] = [];
    public emit(color: number = D.sonarIdleColor): void {
        if (this.rings.length >= D.sonarMaximumCount) {
            const oldest = this.rings.shift();
            if (oldest) { this.container.removeChild(oldest.graphics); oldest.graphics.destroy(); }
        }
        const graphics = new Graphics();
        this.container.addChild(graphics);
        this.rings.push({ graphics, age: 0, color });
    }
    public update(dt: number): void {
        for (let i = this.rings.length - 1; i >= 0; i--) {
            const ring = this.rings[i];
            ring.age += Math.max(0, dt);
            const t = Math.min(1, ring.age / D.sonarDurationSeconds);
            // Draw the terminal radius once before removing on the next update.
            ring.graphics.clear().circle(0, 0, D.bodyRadius + t * (D.detectionRadius - D.bodyRadius))
                .stroke({ color: ring.color, width: 2.5 * (1 - t) + 0.4, alpha: Math.pow(1 - t, 1.35) * 0.85 });
            if (ring.age > D.sonarDurationSeconds) {
                this.container.removeChild(ring.graphics);
                ring.graphics.destroy();
                this.rings.splice(i, 1);
            }
        }
    }
    public destroy(): void {
        for (const ring of this.rings) ring.graphics.destroy();
        this.rings.length = 0;
        this.container.destroy();
    }
}
