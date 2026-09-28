/** Pure, immediate physical contacts, independent of the mine arming countdown. */
export interface MineContactCircle { readonly id: string; readonly x: number; readonly y: number; readonly radius: number }
export interface MineContactSegment { readonly id: string; readonly startX: number; readonly startY: number; readonly endX: number; readonly endY: number; readonly radius: number }
export function mineCircleContact(x: number, y: number, mineRadius: number, target: MineContactCircle): boolean {
    return Math.hypot(x - target.x, y - target.y) <= mineRadius + target.radius;
}
export function mineSegmentContact(x: number, y: number, mineRadius: number, segment: MineContactSegment): boolean {
    const dx = segment.endX - segment.startX, dy = segment.endY - segment.startY;
    const t = Math.max(0, Math.min(1, ((x - segment.startX) * dx + (y - segment.startY) * dy) / Math.max(1e-8, dx * dx + dy * dy)));
    return Math.hypot(x - segment.startX - t * dx, y - segment.startY - t * dy) <= mineRadius + segment.radius;
}
export function firstMinePhysicalContact(x: number, y: number, radius: number, circles: readonly MineContactCircle[], segments: readonly MineContactSegment[]): string | null {
    for (const target of circles) if (mineCircleContact(x, y, radius, target)) return target.id;
    for (const segment of segments) if (mineSegmentContact(x, y, radius, segment)) return segment.id;
    return null;
}
