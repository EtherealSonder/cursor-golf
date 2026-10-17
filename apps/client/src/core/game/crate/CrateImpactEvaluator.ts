import { CRATE_DESTRUCTION, type CrateDestructionCause } from "./CrateDestructionDefinition";
export interface CrateCollisionSeverity {
    readonly closingNormalSpeed: number;
    readonly effectiveMass: number;
    readonly normalImpulseMagnitude: number;
}
export function evaluateCrateImpact(source: "ball" | "other" | "wall", impact: CrateCollisionSeverity): CrateDestructionCause | null {
    if (!Number.isFinite(impact.closingNormalSpeed) || !Number.isFinite(impact.normalImpulseMagnitude) || !Number.isFinite(impact.effectiveMass)) return null;
    if (impact.closingNormalSpeed <= 0 || impact.normalImpulseMagnitude <= 0 || impact.effectiveMass <= 0) return null;
    if (source === "ball") return impact.closingNormalSpeed >= CRATE_DESTRUCTION.ballMaximumSpeed * CRATE_DESTRUCTION.ballNormalSpeedFraction && impact.normalImpulseMagnitude >= CRATE_DESTRUCTION.minimumBallImpulse ? "ballImpact" : null;
    return impact.closingNormalSpeed >= CRATE_DESTRUCTION.otherMinimumClosingSpeed && impact.normalImpulseMagnitude >= CRATE_DESTRUCTION.otherMinimumImpulse ? (source === "wall" ? "wallImpact" : "objectImpact") : null;
}
