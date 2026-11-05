/** P-6B: selective physical intangibility. Elemental fields and gameplay triggers remain active. */
export const GHOST_BALL_COLLISION_POLICY = {
    ignoreDynamicPhysicalResponse: true,
    ignoreRobotPerception: true,
    ignoreProximityMineDetection: true,
    ignoreRotatorContact: true,
    ignoreDirectionalBumperContact: true,
    destroyCratesOnContact: true,
} as const;

/** A ghost destroys a crate on physical overlap, without transferring an impulse. */
export function ghostTouchesRotatedCrate(
    ballX: number, ballY: number, ballRadius: number,
    crateX: number, crateY: number, width: number, height: number, rotation: number,
): boolean {
    const dx = ballX - crateX, dy = ballY - crateY;
    const c = Math.cos(rotation), s = Math.sin(rotation);
    const x = c * dx + s * dy, y = -s * dx + c * dy;
    const nearX = Math.max(-width / 2, Math.min(width / 2, x));
    const nearY = Math.max(-height / 2, Math.min(height / 2, y));
    return (x - nearX) ** 2 + (y - nearY) ** 2 <= ballRadius ** 2;
}
