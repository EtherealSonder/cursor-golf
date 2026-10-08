import type { LevelPoint } from "./LevelDefinition";

export interface GeometryProblem {
    readonly code: string;
    readonly message: string;
    readonly path: string;
}

const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const point = (v: unknown): v is LevelPoint =>
    typeof v === "object" && v !== null && !Array.isArray(v) &&
    finite((v as LevelPoint).x) && finite((v as LevelPoint).y);
const cross = (a: LevelPoint, b: LevelPoint, c: LevelPoint): number =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const onSegment = (a: LevelPoint, b: LevelPoint, p: LevelPoint): boolean =>
    Math.abs(cross(a,b,p)) < 1e-9 && p.x >= Math.min(a.x,b.x) - 1e-9 &&
    p.x <= Math.max(a.x,b.x) + 1e-9 && p.y >= Math.min(a.y,b.y) - 1e-9 &&
    p.y <= Math.max(a.y,b.y) + 1e-9;
const intersects = (a: LevelPoint,b: LevelPoint,c: LevelPoint,d: LevelPoint): boolean => {
    const x=cross(a,b,c), y=cross(a,b,d), z=cross(c,d,a), w=cross(c,d,b);
    return (x*y<0 && z*w<0) || onSegment(a,b,c) || onSegment(a,b,d) ||
        onSegment(c,d,a) || onSegment(c,d,b);
};

/** Checks a simple, non-degenerate closed polygon. First vertex is not repeated. */
export function validatePolygonGeometry(vertices: unknown, width: number, height: number): GeometryProblem[] {
    const problems: GeometryProblem[] = [];
    const fail = (code: string, message: string, path="course.vertices") =>
        problems.push({code,message,path});
    if (!Array.isArray(vertices) || vertices.length < 3) {
        fail("INVALID_POLYGON_VERTICES", "Polygon needs at least three vertices.");
        return problems;
    }
    if (!vertices.every(point)) {
        fail("INVALID_POLYGON_VERTEX", "All polygon vertices must have finite x/y values.");
        return problems;
    }
    const v: LevelPoint[] = vertices;
    const n=v.length;
    for (let i=0;i<n;i++) {
        const a=v[i], b=v[(i+1)%n];
        if (a.x===b.x && a.y===b.y) fail("ZERO_LENGTH_POLYGON_EDGE", `Edge ${i} has zero length.`, `course.vertices[${i}]`);
        if (a.x<0 || a.x>width || a.y<0 || a.y>height)
            fail("POLYGON_VERTEX_OUTSIDE_FRAME", `Vertex ${i} is outside the course frame.`, `course.vertices[${i}]`);
    }
    let twiceArea=0;
    for (let i=0;i<n;i++) twiceArea += v[i].x*v[(i+1)%n].y-v[(i+1)%n].x*v[i].y;
    if (Math.abs(twiceArea)<1e-9) fail("DEGENERATE_POLYGON", "Polygon area must be nonzero.");
    for (let i=0;i<n;i++) for (let j=i+1;j<n;j++) {
        if (j===i+1 || (i===0 && j===n-1)) continue;
        if (intersects(v[i],v[(i+1)%n],v[j],v[(j+1)%n]))
            fail("SELF_INTERSECTING_POLYGON", `Edges ${i} and ${j} intersect.`);
    }
    return problems;
}

/** Boundary counts as inside, consistent with rectangular anchor checks. */
export function pointInPolygon(p: LevelPoint, vertices: readonly LevelPoint[]): boolean {
    let inside=false;
    for (let i=0,j=vertices.length-1;i<vertices.length;j=i++) {
        const a=vertices[j], b=vertices[i];
        if (onSegment(a,b,p)) return true;
        if ((a.y>p.y)!==(b.y>p.y) && p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x) inside=!inside;
    }
    return inside;
}
