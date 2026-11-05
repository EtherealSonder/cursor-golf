/** P-4A: attachment policy only. Collision integration starts in P-4B. */
export const STICKY_BALL = Object.freeze({
    temporaryAttachmentSeconds: 4.5,
    releaseSeparationPixels: 2,
    sameTargetCooldownSeconds: 0.15,
    fireDangerRateMultiplier: 1,
    waterDangerRateMultiplier: 1,
    aimLengthMultiplier: 1,
});
export type StickyAttachmentKind = "static" | "rotating" | "robot" | "conveyor";
export type StickyCollisionKind = StickyAttachmentKind | "crate" | "bush" | "marble" | "mine" | "portal-opening" | "terrain" | "fire" | "water" | "wind" | "hole" | "out-of-bounds";
export function isStickyEligible(kind: StickyCollisionKind): kind is StickyAttachmentKind {
    return kind === "static" || kind === "rotating" || kind === "robot" || kind === "conveyor";
}
