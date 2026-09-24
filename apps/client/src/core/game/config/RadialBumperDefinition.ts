import type { ObstaclePhysicsMaterial } from "./ObstacleDefinition";

export interface RadialBumperDefinition {
    readonly textureKey: string;
    /** World-space diameter. Kept close to the current Fan body width. */
    readonly renderSize: number;
    /** Fair circular collider, slightly inset from the painted outline. */
    readonly colliderRadius: number;
    /** Powered radial rebound = incoming Ball speed * this multiplier. */
    readonly bounceSpeedMultiplier: number;
    readonly material: ObstaclePhysicsMaterial;

    /** RB-2 presentation. Collider remains fixed while the artwork pulses. */
    readonly impactExpandScale: number;
    readonly impactExpandDurationSeconds: number;
    readonly impactContractDurationSeconds: number;
    readonly centerRadius: number;
    readonly centerBrightColor: number;
    /** Maximum alpha of the impact-only bright centre overlay. Zero at idle. */
    readonly centerBrightOverlayMaxAlpha: number;
    readonly shockwaveStartRadius: number;
    readonly shockwaveEndRadius: number;
    readonly shockwaveDurationSeconds: number;
    readonly shockwaveLineWidth: number;
    readonly shockwaveColor: number;
    readonly shockwaveStartAlpha: number;
}

export const DEFAULT_RADIAL_BUMPER_DEFINITION: RadialBumperDefinition = {
    textureKey: "radialBumper",
    renderSize: 84,
    colliderRadius: 39,
    bounceSpeedMultiplier: 1.35,
    material: {
        restitution: 1,
        collisionFriction: 0,
    },

    impactExpandScale: 1.20,
    impactExpandDurationSeconds: 0.085,
    impactContractDurationSeconds: 0.17,
    centerRadius: 17,
    centerBrightColor: 0xfff2c7,
    centerBrightOverlayMaxAlpha: 0.72,
    shockwaveStartRadius: 43,
    shockwaveEndRadius: 68,
    shockwaveDurationSeconds: 0.24,
    shockwaveLineWidth: 3,
    shockwaveColor: 0xffffff,
    shockwaveStartAlpha: 0.9,
};
