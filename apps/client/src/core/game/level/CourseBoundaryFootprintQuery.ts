/** Deterministic footprint coverage, sampled in local collider coordinates. */
export type CourseFootprint =
    | { readonly kind: "circle"; readonly x: number; readonly y: number; readonly radius: number }
    | { readonly kind: "rectangle"; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly rotationRadians: number };

export function fractionOutsideFootprint(contains: (x: number, y: number) => boolean, footprint: CourseFootprint, resolution = 41): number {
    const n = Math.max(5, Math.min(81, Math.floor(resolution)));
    if (!Number.isFinite(footprint.x) || !Number.isFinite(footprint.y)) return 1;
    const circle = footprint.kind === "circle";
    const rx = circle ? footprint.radius : footprint.width * 0.5;
    const ry = circle ? footprint.radius : footprint.height * 0.5;
    if (!(rx > 0) || !(ry > 0)) return contains(footprint.x, footprint.y) ? 0 : 1;
    const angle = circle ? 0 : footprint.rotationRadians;
    if (!Number.isFinite(angle)) return 1;
    const c = Math.cos(angle), s = Math.sin(angle);
    let outside = 0, total = 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const u = ((i + 0.5) / n) * 2 - 1, v = ((j + 0.5) / n) * 2 - 1;
        if (circle && u * u + v * v > 1) continue;
        const dx = u * rx, dy = v * ry;
        const x = footprint.x + dx * c - dy * s;
        const y = footprint.y + dx * s + dy * c;
        total++;
        if (!contains(x, y)) outside++;
    }
    return total ? outside / total : 0;
}

/** Return first point along a movement segment exceeding the specified outside fraction. */
export function findFirstOutsideThresholdCrossing(
    contains: (x: number, y: number) => boolean,
    from: {x: number; y: number}, to: {x: number; y: number}, radius: number,
    threshold = 0.8,
): {x: number; y: number; fraction: number} | null {
    const sample = (t: number) => {
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t;
        return {x, y, fraction: fractionOutsideFootprint(contains, {kind: "circle", x, y, radius}, 81)};
    };
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.min(128, Math.ceil(length / Math.max(1, radius * 0.25))));
    let previous = 0;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const result = sample(t);
        if (result.fraction > threshold) {
            let low = previous, high = t;
            for (let j = 0; j < 9; j++) {
                const mid = (low + high) * 0.5;
                if (sample(mid).fraction > threshold) high = mid;
                else low = mid;
            }
            return sample(high);
        }
        previous = t;
    }
    return null;
}
