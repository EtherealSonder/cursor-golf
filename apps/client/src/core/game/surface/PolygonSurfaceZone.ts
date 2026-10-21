import { SurfaceType } from "./SurfaceType";
import type { SurfaceSample } from "./SurfaceSample";
import { getSurfaceDefinition } from "./SurfaceDefinition";
import { getSurfaceStateDefinition } from "./SurfaceStateDefinition";

export interface PolygonSurfaceZoneDefinition {
    readonly id: string;
    readonly surfaceType: SurfaceType;
    readonly vertices: readonly { readonly x: number; readonly y: number }[];
}

/** A world-space polygon used for both presentation and physical surface queries. */
export class PolygonSurfaceZone {
    public readonly definition: PolygonSurfaceZoneDefinition;
    private readonly bounds: { minX: number; minY: number; maxX: number; maxY: number };
    constructor(definition: PolygonSurfaceZoneDefinition) {
        if (!definition.id || definition.vertices.length < 3) throw new Error("Invalid polygon surface zone");
        this.definition = { ...definition, vertices: definition.vertices.map(p => ({ x: p.x, y: p.y })) };
        const xs = this.definition.vertices.map(p => p.x);
        const ys = this.definition.vertices.map(p => p.y);
        if (![...xs,...ys].every(Number.isFinite)) throw new Error("Non-finite polygon surface coordinate");
        this.bounds = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
    }
    public containsPoint(x: number, y: number): boolean {
        if (x < this.bounds.minX || x > this.bounds.maxX || y < this.bounds.minY || y > this.bounds.maxY) return false;
        const vertices = this.definition.vertices;
        let inside = false;
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const a = vertices[i], b = vertices[j];
            const cross = (x-a.x)*(b.y-a.y)-(y-a.y)*(b.x-a.x);
            if (Math.abs(cross) < 0.000001 && x >= Math.min(a.x,b.x) && x <= Math.max(a.x,b.x) && y >= Math.min(a.y,b.y) && y <= Math.max(a.y,b.y)) return true;
            if ((a.y > y) !== (b.y > y) && x < (b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x) inside = !inside;
        }
        return inside;
    }
    public sample(): SurfaceSample {
        const surfaceType = this.definition.surfaceType;
        const surfaceState = getSurfaceDefinition(surfaceType).defaultState;
        return { surfaceType, surfaceState, rollingResistanceMultiplier: getSurfaceStateDefinition(surfaceType, surfaceState).rollingResistanceMultiplier, zoneId: this.definition.id };
    }
}
