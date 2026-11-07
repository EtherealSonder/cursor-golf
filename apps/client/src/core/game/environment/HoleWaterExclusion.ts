import type { HoleWaterExclusionDefinition } from "../config/HoleWaterExclusionDefinition";

/** Ground-water-only cup mask. Does not obstruct airborne water or physical objects. */
export class HoleWaterExclusion {
    public constructor(
        public readonly x: number,
        public readonly y: number,
        public readonly radius: number,
        public readonly settings: HoleWaterExclusionDefinition,
    ) {}

    public getBlockedRadius(): number {
        return Math.max(0, this.radius + this.settings.clearance + this.settings.cellEdgeTolerance);
    }

    public contains(x: number, y: number): boolean {
        const dx = x - this.x;
        const dy = y - this.y;
        const radius = this.getBlockedRadius();
        return dx * dx + dy * dy <= radius * radius;
    }
}
