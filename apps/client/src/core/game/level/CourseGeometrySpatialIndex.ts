import { CourseGeometryAccelerationProfiler as Geo } from "../debug/CourseGeometryAccelerationProfiler";
import type { WorldPosition } from "./LevelCoordinateTransform";
import type { GeneratedCourseGeometry } from "./LevelRuntimeDefinition";

/** Immutable conservative uniform-grid index. Candidate order matches original geometry order. */
export class CourseGeometrySpatialIndex {
    private readonly boundaryCells = new Map<string, number[]>();
    private readonly wallCells = new Map<string, number[]>();
    private readonly size: number;
    constructor(private readonly geometry: GeneratedCourseGeometry, cellSize = 128) {
        this.size = cellSize;
        geometry.edges.forEach((edge, index) => this.insert(this.boundaryCells, edge.start, edge.end, index));
        geometry.wallSegments.forEach((wall, index) => this.insert(this.wallCells, wall.start, wall.end, index));
    }
    private insert(map: Map<string, number[]>, a: WorldPosition, b: WorldPosition, index: number): void {
        const minX = Math.floor(Math.min(a.x,b.x)/this.size), maxX = Math.floor(Math.max(a.x,b.x)/this.size);
        const minY = Math.floor(Math.min(a.y,b.y)/this.size), maxY = Math.floor(Math.max(a.y,b.y)/this.size);
        for (let x=minX; x<=maxX; x++) for (let y=minY; y<=maxY; y++) {
            const key = `${x}:${y}`;
            let bucket = map.get(key);
            if (!bucket) { bucket=[]; map.set(key,bucket); }
            bucket.push(index);
        }
    }
    private candidates(map: Map<string, number[]>, a: WorldPosition, b: WorldPosition, total: number): number[] {
        // Lightweight counters are opt-in; no high-resolution timing in this hot path.
        Geo.add("spatialIndexQueries");
        if (![a.x,a.y,b.x,b.y].every(Number.isFinite)) {Geo.add("spatialIndexFallbacks");Geo.add("spatialIndexCandidates",total);return Array.from({length:total},(_,i)=>i);}
        const minX=Math.floor(Math.min(a.x,b.x)/this.size), maxX=Math.floor(Math.max(a.x,b.x)/this.size);
        const minY=Math.floor(Math.min(a.y,b.y)/this.size), maxY=Math.floor(Math.max(a.y,b.y)/this.size);
        // Avoid pathological traversal on huge queries; exact full scan is always safe.
        if ((maxX-minX+1)*(maxY-minY+1)>4096) {Geo.add("spatialIndexFallbacks");Geo.add("spatialIndexCandidates",total);return Array.from({length:total},(_,i)=>i);}
        const seen=new Set<number>();
        for(let x=minX;x<=maxX;x++) for(let y=minY;y<=maxY;y++) {
            const bucket=map.get(`${x}:${y}`);
            if(bucket) for(const index of bucket) seen.add(index);
        }
        Geo.add("spatialIndexCandidates",seen.size);Geo.add("spatialIndexRejected",Math.max(0,total-seen.size));
        return [...seen].sort((x,y)=>x-y);
    }
    boundaryCandidates(a: WorldPosition,b: WorldPosition): number[] {
        return this.candidates(this.boundaryCells,a,b,this.geometry.edges.length);
    }
    wallCandidates(a: WorldPosition,b: WorldPosition): number[] {
        return this.candidates(this.wallCells,a,b,this.geometry.wallSegments.length);
    }
}
