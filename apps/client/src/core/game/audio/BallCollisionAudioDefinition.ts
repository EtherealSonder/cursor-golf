import type { AudioSoundId } from "./AudioDefinition";

export const BALL_COLLISION_AUDIO = {
    minimumNormalSpeed: 35,
    fullGainNormalSpeed: 650,
    minimumGain: 0.25,
    maximumGain: 1,
    sameColliderCooldownMs: 90,
    stickyCooldownMs: 100,
    // Pitch follows the collision normal speed only for wall and metal impacts.
    minimumImpactPlaybackRate: 0.82,
    maximumImpactPlaybackRate: 1.0,
} as const;

/** Only explicit, approved collider families receive sounds in AUD-2. */
export function classifyBallCollider(type: string, id: string | undefined): AudioSoundId | null {
    if (type === "course-boundary") return "golf-ball-wall-impact";
    if (!id) return null;
    if (/^(?:course-wall-|wall-|rock-|small-rock-|boulder-)/i.test(id)) return "golf-ball-wall-impact";
    if (/^(?:fan-|sprinkler-)/i.test(id)) return "golf-ball-metal-hit";
    if (/robot/i.test(id)) return "golf-ball-robot-hit";
    if (type === "static-obstacle") {
        // Static colliders with special powered responders (bumpers) are reserved for later.
        if (/bumper|rotator|paddle|portal/i.test(id)) return null;
        return "golf-ball-metal-hit";
    }
    return null;
}
