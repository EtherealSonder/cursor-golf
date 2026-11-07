import type { RobotInteractionEntry, RobotInteractionShape } from "./RobotInteractionRegistry";
import { ROBOT_VISION_OCCLUSION_DEFINITION as CONFIG } from "../../config/RobotVisionOcclusionDefinition";

export interface RobotVisionPoint { readonly x: number; readonly y: number; }
export interface RobotVisionOccluderSnapshot {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly shape: RobotInteractionShape;
}

/** Freeze live shapes once per presentation update, avoiding inconsistent geometry within a cone. */
export function snapshotVisionOccluders(entries: readonly RobotInteractionEntry[], excludedId?: string): RobotVisionOccluderSnapshot[] {
    return entries.filter(entry => entry.id !== excludedId && entry.capabilities.visionOccluder)
        .map(entry => ({ id: entry.id, x: entry.getX(), y: entry.getY(), shape: entry.getShape?.() ?? entry.shape }));
}

function hitCircle(ox: number, oy: number, dx: number, dy: number, cx: number, cy: number, radius: number): number | null {
    const fx = ox - cx, fy = oy - cy, b = fx * dx + fy * dy;
    const c = fx * fx + fy * fy - radius * radius;
    const discriminant = b * b - c;
    if (discriminant < 0) return null;
    const root = Math.sqrt(discriminant);
    const near = -b - root, far = -b + root;
    return near >= 0 ? near : far >= 0 ? 0 : null;
}

function hitRectangle(ox: number, oy: number, dx: number, dy: number, cx: number, cy: number, width: number, height: number, rotation: number): number | null {
    const c = Math.cos(rotation), s = Math.sin(rotation);
    const px = (ox - cx) * c + (oy - cy) * s, py = -(ox - cx) * s + (oy - cy) * c;
    const vx = dx * c + dy * s, vy = -dx * s + dy * c;
    let near = -Infinity, far = Infinity;
    for (const [p, v, half] of [[px, vx, width / 2], [py, vy, height / 2]] as const) {
        if (Math.abs(v) < 1e-10) { if (Math.abs(p) > half) return null; continue; }
        const a = (-half - p) / v, b = (half - p) / v;
        near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
        if (near > far) return null;
    }
    return far < 0 ? null : Math.max(0, near);
}

/** Distance along a unit ray to the nearest contact with a registered shape. */
export function visionRayShapeHit(ox: number, oy: number, dx: number, dy: number, item: RobotVisionOccluderSnapshot): number | null {
    const shape = item.shape;
    if (shape.kind === "circle") return hitCircle(ox, oy, dx, dy, item.x, item.y, shape.radius);
    if (shape.kind === "rectangle" || shape.kind === "orientedRectangle") {
        return hitRectangle(ox, oy, dx, dy, item.x, item.y, shape.width, shape.height, shape.kind === "orientedRectangle" ? shape.rotation : 0);
    }
    const sx = shape.x2 - shape.x1, sy = shape.y2 - shape.y1;
    const length = Math.hypot(sx, sy);
    const a = hitCircle(ox, oy, dx, dy, shape.x1, shape.y1, shape.radius);
    const b = hitCircle(ox, oy, dx, dy, shape.x2, shape.y2, shape.radius);
    const body = length > 1e-8 ? hitRectangle(ox, oy, dx, dy,
        (shape.x1 + shape.x2) / 2, (shape.y1 + shape.y2) / 2,
        length, shape.radius * 2, Math.atan2(sy, sx)) : null;
    const hits = [a, b, body].filter((hit): hit is number => hit !== null);
    return hits.length ? Math.min(...hits) : null;
}

function silhouettePoints(item: RobotVisionOccluderSnapshot): RobotVisionPoint[] {
    const shape = item.shape;
    if (shape.kind === "circle") {
        const points: RobotVisionPoint[] = [];
        for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; points.push({ x: item.x + shape.radius * Math.cos(a), y: item.y + shape.radius * Math.sin(a) }); }
        return points;
    }
    if (shape.kind === "capsule") {
        const points: RobotVisionPoint[] = [];
        for (const center of [{x:shape.x1,y:shape.y1},{x:shape.x2,y:shape.y2}]) {
            for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; points.push({x:center.x + shape.radius * Math.cos(a),y:center.y + shape.radius * Math.sin(a)}); }
        }
        return points;
    }
    const angle = shape.kind === "orientedRectangle" ? shape.rotation : 0;
    const c = Math.cos(angle), s = Math.sin(angle);
    const points: RobotVisionPoint[] = [];
    for (const x of [-shape.width / 2, shape.width / 2]) for (const y of [-shape.height / 2, shape.height / 2]) {
        points.push({ x: item.x + x * c - y * s, y: item.y + x * s + y * c });
    }
    return points;
}

/** World-space visibility perimeter ordered from left cone edge to right cone edge. */
export function buildVisibleConePerimeter(
    ox: number, oy: number, heading: number, range: number, halfAngle: number,
    occluders: readonly RobotVisionOccluderSnapshot[], excludedId?: string,
): RobotVisionPoint[] {
    const radius = Math.max(0, range), half = Math.max(0, Math.min(Math.PI, halfAngle));
    if (!radius || !half) return [];
    const angles: number[] = [];
    const base = CONFIG.baseAngularSamples;
    for (let i = 0; i <= base; i++) angles.push(-half + 2 * half * i / base);
    const candidates = occluders.filter(item => item.id !== excludedId);
    const adaptive: number[] = [];
    for (const item of candidates) {
        const distance = Math.hypot(item.x - ox, item.y - oy);
        // Avoid sampling distant blockers outside the cone's maximum reach.
        let extent = 0;
        for (const point of silhouettePoints(item)) extent = Math.max(extent, Math.hypot(point.x - item.x, point.y - item.y));
        if (distance - extent > radius) continue;
        for (const point of silhouettePoints(item)) {
            const angle = Math.atan2(point.y - oy, point.x - ox);
            const relative = Math.atan2(Math.sin(angle - heading), Math.cos(angle - heading));
            for (const offset of [-CONFIG.edgeAngleOffsetRadians, 0, CONFIG.edgeAngleOffsetRadians]) {
                const a = relative + offset;
                if (a > -half && a < half) adaptive.push(a);
            }
        }
    }
    // Always preserve the uniform samples and select a bounded subset of silhouette samples.
    const remaining = Math.max(0, CONFIG.maximumRays - angles.length);
    if (adaptive.length > remaining && remaining > 0) {
        adaptive.sort((a,b)=>a-b);
        for (let i = 0; i < remaining; i++) angles.push(adaptive[Math.floor(i * adaptive.length / remaining)]);
    } else angles.push(...adaptive.slice(0,remaining));
    angles.sort((a,b)=>a-b);
    const result: RobotVisionPoint[] = [];
    let previous = Number.NaN;
    for (const angle of angles) {
        if (Math.abs(angle - previous) < 1e-7) continue;
        previous = angle;
        const direction = heading + angle, dx = Math.cos(direction), dy = Math.sin(direction);
        let distance = radius;
        for (const item of candidates) {
            const hit = visionRayShapeHit(ox, oy, dx, dy, item);
            if (hit !== null && hit < distance) distance = Math.max(0, hit - CONFIG.intersectionTolerance);
        }
        result.push({x: ox + dx * distance, y: oy + dy * distance});
    }
    return result;
}
