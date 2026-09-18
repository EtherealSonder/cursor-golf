import {
    getDefaultImpactMomentumRetention,
    WaterSourceType,
} from "./WaterSourceDefinition";

import type {
    PhysicsMaterial,
} from "../physics/PhysicsMaterial";

import type {
    RigidBodyDefinition,
} from "./RigidBodyDefinition";

/** Phase 8B-3 tuning for the first four-nozzle Sprinkler mechanism. */
export interface SprinklerDefinition {
    readonly bodyRadius: number;
    readonly nozzleOffset: number;
    readonly nozzleRadius: number;
    readonly nozzleCount: 4;

    /** Seconds between four-nozzle pulses. */
    readonly emissionInterval: number;
    /** Total Water produced per second across all four nozzles. */
    readonly flowRate: number;
    readonly launchSpeed: number;
    readonly launchElevationRadians: number;
    readonly windResponse: number;

    /** Fraction of airborne horizontal velocity retained on impact. */
    readonly impactMomentumRetention: number;

    /** Circular gameplay collider, independent from sprite dimensions. */
    readonly collisionRadius: number;

    readonly material: PhysicsMaterial;
    readonly rigidBody: RigidBodyDefinition;

    /** Phase 8B-14A presentation-only sprite tuning. */
    readonly visual: {
        readonly spriteWidth: number;
        readonly spriteHeight: number;
        readonly spriteAnchorX: number;
        readonly spriteAnchorY: number;
        readonly spriteOffsetX: number;
        readonly spriteOffsetY: number;
    };
}

export const DEFAULT_SPRINKLER_DEFINITION: SprinklerDefinition = {
    bodyRadius: 10,
    nozzleOffset: 7,
    nozzleRadius: 3.5,
    nozzleCount: 4,

    emissionInterval: 0.12,
    flowRate: 0.2,
    launchSpeed: 420,
    launchElevationRadians: Math.PI / 4,
    windResponse: 0.8,
    impactMomentumRetention:
        getDefaultImpactMomentumRetention(
            WaterSourceType.Sprinkler,
        ),

    collisionRadius: 10,

    material: {
        restitution: 0.46,
        friction: 0.16,
    },

    rigidBody: {
        bodyType: "dynamic",
        mass: 2,
        linearDamping: 1.75,
        angularDamping: 2.15,
        sleepLinearSpeedThreshold: 3,
        sleepAngularSpeedThreshold: 0.06,
        sleepDelay: 0.42,
        maximumLinearSpeed: 720,
        maximumAngularSpeed: 11,
    },

    visual: {
        spriteWidth: 30,
        spriteHeight: 30,
        spriteAnchorX: 0.5,
        spriteAnchorY: 0.5,
        spriteOffsetX: 0,
        spriteOffsetY: 0,
    },
};

export function validateSprinklerDefinition(
    definition: SprinklerDefinition,
): void {
    const positive = [
        definition.bodyRadius,
        definition.nozzleOffset,
        definition.nozzleRadius,
        definition.emissionInterval,
        definition.launchSpeed,
        definition.collisionRadius,
        definition.rigidBody.mass,
        definition.rigidBody.maximumLinearSpeed,
        definition.rigidBody.maximumAngularSpeed,
        definition.visual.spriteWidth,
        definition.visual.spriteHeight,
    ];

    if (positive.some((value): boolean => !Number.isFinite(value) || value <= 0)) {
        throw new Error("SprinklerDefinition positive values must be finite and greater than 0.");
    }

    if (!Number.isFinite(definition.flowRate) || definition.flowRate < 0) {
        throw new Error("SprinklerDefinition flowRate must be finite and >= 0.");
    }

    if (
        !Number.isFinite(definition.launchElevationRadians) ||
        definition.launchElevationRadians < 0 ||
        definition.launchElevationRadians > Math.PI / 2
    ) {
        throw new Error("SprinklerDefinition launchElevationRadians must be between 0 and PI / 2.");
    }

    if (!Number.isFinite(definition.windResponse) || definition.windResponse < 0) {
        throw new Error("SprinklerDefinition windResponse must be finite and >= 0.");
    }

    if (
        !Number.isFinite(definition.impactMomentumRetention) ||
        definition.impactMomentumRetention < 0 ||
        definition.impactMomentumRetention > 1
    ) {
        throw new Error("SprinklerDefinition impactMomentumRetention must be finite and between 0 and 1.");
    }

    if (definition.rigidBody.bodyType !== "dynamic") {
        throw new Error("Phase 8B-5 Sprinkler rigidBody must be dynamic.");
    }

    const nonNegativePhysicsValues = [
        definition.material.restitution,
        definition.material.friction,
        definition.rigidBody.linearDamping,
        definition.rigidBody.angularDamping,
        definition.rigidBody.sleepLinearSpeedThreshold,
        definition.rigidBody.sleepAngularSpeedThreshold,
        definition.rigidBody.sleepDelay,
    ];

    if (nonNegativePhysicsValues.some((value): boolean => !Number.isFinite(value) || value < 0)) {
        throw new Error("Sprinkler physics values must be finite and non-negative.");
    }

    const visualFinite = [
        definition.visual.spriteAnchorX,
        definition.visual.spriteAnchorY,
        definition.visual.spriteOffsetX,
        definition.visual.spriteOffsetY,
    ];

    if (visualFinite.some((value): boolean => !Number.isFinite(value))) {
        throw new Error("Sprinkler visual values must be finite.");
    }

    if (definition.nozzleCount !== 4) {
        throw new Error("Phase 8B-3 Sprinkler must have exactly four nozzles.");
    }
}
