/** CB1: visual-only directional conveyor configuration. */
export const CONVEYOR_BELT_DEFINITION = {
    width: 200,
    height: 89,
    platformWidth: 61,
    platformHeight: 60,
    baseTextureKey: "conveyorBeltBase",
    platformTextureKey: "conveyorBeltDirection",
} as const;

export const CONVEYOR_CARDINAL_ROTATIONS = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2] as const;
/** Accept full-turn equivalent angles emitted by Figma, with a small numeric tolerance. */
export function normalizeConveyorRotation(rotation: number): number | null {
    if (!Number.isFinite(rotation)) return null;
    const turn = 2 * Math.PI;
    const normalized = ((rotation % turn) + turn) % turn;
    for (const cardinal of CONVEYOR_CARDINAL_ROTATIONS) {
        if (Math.abs(normalized - cardinal) < 1e-5 || Math.abs(normalized - cardinal - turn) < 1e-5) return cardinal;
    }
    return null;
}
