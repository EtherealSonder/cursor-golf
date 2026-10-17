/** CB6 presentation-only conveyor rules. No environmental simulation changes. */
export const CONVEYOR_BELT_RENDERING = {
    // A solid interior bed prevents ground scorch/fire from showing between moving tiles.
    bedColor: 0x55515f,
    bedInsetX: 9,
    bedInsetY: 13.5,
    groundFireOcclusion: true,
    windAffected: false,
    flammable: false,
} as const;

/** Rotated rectangular surface test, shared by ground-fire presentation. */
export function conveyorOccludesGroundPoint(
    pointX: number, pointY: number, centerX: number, centerY: number,
    rotation: number, width: number, height: number,
): boolean {
    const dx = pointX - centerX, dy = pointY - centerY;
    const c = Math.cos(rotation), s = Math.sin(rotation);
    return Math.abs(c * dx + s * dy) <= width / 2 &&
        Math.abs(-s * dx + c * dy) <= height / 2;
}
