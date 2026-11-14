import type { LocalWindSystem } from "./LocalWindSystem";
import type { WindManager } from "./WindManager";

/** Read-only wind sampling shared by fire propagation and ground-fire VFX.
 * The session's ordinary global wind is deliberately excluded: only Gale Force
 * contributes prevailing wind, preserving existing behaviour in other worlds.
 */
export class EffectiveFireWindSampler {
    public constructor(
        private readonly localWindSystem: LocalWindSystem,
        private readonly windManager: WindManager,
        private readonly isGaleForceActive: () => boolean,
    ) {}

    public getAccelerationAt(x: number, y: number): { x: number; y: number } {
        const local = this.localWindSystem.getAccelerationAt(x, y);
        if (!this.isGaleForceActive()) return { x: local.x, y: local.y };
        const global = this.windManager.getAcceleration();
        return { x: local.x + global.x, y: local.y + global.y };
    }
}
