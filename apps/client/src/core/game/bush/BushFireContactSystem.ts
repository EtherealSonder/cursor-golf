import { FireSourceType } from "../config/FireSourceDefinition";
import type { FireManager } from "../environment/FireManager";
import type { FireSourceSystem } from "../environment/FireSourceSystem";
import type { Bush } from "./Bush";
import type { BushPoint } from "./BushGeometryDefinition";
import { BUSH_FIRE } from "./BushFireDefinition";

/** Detects gameplay fire contact with foliage; ignition is anchored at bush center. */
export class BushFireContactSystem {
    public constructor(private readonly fire: FireManager, private readonly sources: FireSourceSystem) {}

    public findContact(bush: Bush): BushPoint | null {
        if (bush.isDestroyed) return null;
        const bounds = bush.geometry.bounds;
        const pad = BUSH_FIRE.fireContactPadding;
        for (const cell of this.fire.getActiveCells()) {
            const x = cell.getWorldCenterX(), y = cell.getWorldCenterY();
            if (x < bounds.minX-pad || x > bounds.maxX+pad || y < bounds.minY-pad || y > bounds.maxY+pad) continue;
            const point = this.circleContact(bush, x, y, pad);
            if (point) return { x: bush.x, y: bush.y };
        }
        for (const source of this.sources.getSources()) {
            if (!source.isEnabled()) continue;
            const definition = source.getDefinition();
            const x = source.getPositionX(), y = source.getPositionY();
            if (definition.type === FireSourceType.Directional) {
                const length = this.sources.getDirectionalEffectiveLength(source.getId(), definition.length);
                if (length <= 0) continue;
                const angle = source.getDirectionRadians(), dx = Math.cos(angle), dy = Math.sin(angle);
                const steps = Math.max(2, Math.ceil(length / BUSH_FIRE.directionalContactStep));
                for (let i = 0; i <= steps; i++) {
                    const d = length * i / steps;
                    const point = this.circleContact(bush, x + dx*d, y + dy*d, definition.halfWidth);
                    if (point) return { x: bush.x, y: bush.y };
                }
            } else {
                const point = this.circleContact(bush, x, y, definition.radius);
                if (point) return { x: bush.x, y: bush.y };
            }
        }
        return null;
    }

    private circleContact(bush: Bush, x: number, y: number, radius: number): BushPoint | null {
        if (bush.geometry.contains({ x, y })) return { x, y };
        const n = BUSH_FIRE.contactSamples;
        for (let i = 0; i < n; i++) {
            const a = i * 2 * Math.PI / n;
            const candidate = { x: x + radius * Math.cos(a), y: y + radius * Math.sin(a) };
            if (bush.geometry.contains(candidate)) return candidate;
        }
        return null;
    }
}
