import type { HoleFireExclusionDefinition } from "../config/HoleFireExclusionDefinition";

/** Ground-fire exclusion. Directional fire is deliberately not affected. */
export class HoleFireExclusion {
    public readonly radius: number;
    public readonly visualRadius: number;

    public constructor(
        public readonly x: number,
        public readonly y: number,
        holeRadius: number,
        definition: HoleFireExclusionDefinition,
    ) {
        this.radius = Math.max(0, holeRadius + definition.clearance);
        this.visualRadius = this.radius + Math.max(0, definition.visualClearance);
    }

    public contains(x: number, y: number, visual = false): boolean {
        const r = visual ? this.visualRadius : this.radius;
        const dx = x - this.x;
        const dy = y - this.y;
        return dx * dx + dy * dy < r * r;
    }
}
