import { BUSH_DEFINITION } from "./BushDefinition";
import { BUSH_ALPHA_MASK_ROWS, BUSH_ALPHA_MASK_SIZE, type BushBounds, type BushPoint } from "./BushGeometryDefinition";

/** CPU-side alpha-derived bush footprint; no Pixi texture readback in the game loop. */
export class BushGeometry {
    public readonly bounds: BushBounds;
    public constructor(public readonly center: BushPoint, public readonly size = BUSH_DEFINITION.size, public readonly rotation = 0) {
        const half = size * Math.SQRT2 / 2;
        this.bounds = { minX: center.x - half, minY: center.y - half, maxX: center.x + half, maxY: center.y + half };
    }

    public contains(point: BushPoint, inset = 0): boolean {
        if (this.size <= 0) return false;
        const dx = point.x - this.center.x;
        const dy = point.y - this.center.y;
        const c = Math.cos(this.rotation), s = Math.sin(this.rotation);
        const localX = (dx * c + dy * s) / this.size + 0.5;
        const localY = (-dx * s + dy * c) / this.size + 0.5;
        const margin = inset / this.size;
        if (localX < margin || localY < margin || localX >= 1 - margin || localY >= 1 - margin) return false;
        const ix = Math.floor(localX * BUSH_ALPHA_MASK_SIZE);
        const iy = Math.floor(localY * BUSH_ALPHA_MASK_SIZE);
        if (ix < 0 || iy < 0 || ix >= BUSH_ALPHA_MASK_SIZE || iy >= BUSH_ALPHA_MASK_SIZE) return false;
        // Test the actual alpha-derived mask. Optional inset checks neighbouring points
        // so concealment is conservative at irregular foliage edges.
        if (!this.maskAt(ix, iy)) return false;
        if (inset > 0) {
            const r = Math.ceil(inset * BUSH_ALPHA_MASK_SIZE / this.size);
            for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
                if (x*x + y*y <= r*r && !this.maskAt(ix+x, iy+y)) return false;
            }
        }
        return true;
    }

    private maskAt(x: number, y: number): boolean {
        if (x < 0 || y < 0 || x >= BUSH_ALPHA_MASK_SIZE || y >= BUSH_ALPHA_MASK_SIZE) return false;
        const row = BUSH_ALPHA_MASK_ROWS[y];
        return (parseInt(row[Math.floor(x / 4)], 16) & (8 >> (x % 4))) !== 0;
    }

    /** Shared alpha-mask sampling for fire/scorch presentation. */
    public containsFoliageWorld(x: number, y: number): boolean {
        return this.contains({x, y});
    }

    public circleCoverage(center: BushPoint, radius: number, inset = 0): number {
        if (radius <= 0) return this.contains(center, inset) ? 1 : 0;
        const samples = BUSH_DEFINITION.ballCoverageSamples;
        let inside = 0, total = 0;
        for (let y = 0; y < samples; y++) for (let x = 0; x < samples; x++) {
            const sx = ((x + 0.5) / samples * 2 - 1) * radius;
            const sy = ((y + 0.5) / samples * 2 - 1) * radius;
            if (sx*sx + sy*sy > radius*radius) continue;
            total++;
            if (this.contains({ x: center.x + sx, y: center.y + sy }, inset)) inside++;
        }
        return total ? inside / total : 0;
    }
}
