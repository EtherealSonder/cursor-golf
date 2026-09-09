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

    /**
     * Fraction of airborne horizontal velocity retained by standing Water
     * when a sprinkler packet lands.
     */
    readonly impactMomentumRetention: number;

    readonly bodyFillColor: number;
    readonly bodyOutlineColor: number;
    readonly bodyOutlineWidth: number;
    readonly nozzleFillColor: number;

    /** Circular gameplay collider, deliberately matching the small body. */
    readonly collisionRadius: number;

    readonly material: PhysicsMaterial;
    readonly rigidBody: RigidBodyDefinition;
}

export const DEFAULT_SPRINKLER_DEFINITION: SprinklerDefinition = {
    /*
     * Ball physics radius is 10 world px, so the temporary Sprinkler body now
     * occupies approximately the same gameplay footprint as the Ball.
     * Nozzle and airborne Water particle sizes are intentionally unchanged.
     */
    bodyRadius: 10,
    nozzleOffset: 7,
    nozzleRadius: 3.5,
    nozzleCount: 4,

    emissionInterval: 0.12,
    flowRate: 0.4,
    launchSpeed: 420,
    launchElevationRadians: Math.PI / 4,
    windResponse: 0.8,
    impactMomentumRetention:
        getDefaultImpactMomentumRetention(
            WaterSourceType.Sprinkler,
        ),

    bodyFillColor: 0x6f8f8b,
    bodyOutlineColor: 0x403442,
    bodyOutlineWidth: 3,
    nozzleFillColor: 0x55c9df,

    collisionRadius: 10,

    material: {
        restitution: 0.46,
        friction: 0.16,
    },

    /*
     * Fan mass = 6 and FireTube mass = 8 in the current project.
     * The small Sprinkler is deliberately much lighter and therefore responds
     * more strongly to the same Ball impulse.
     */
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
        definition.bodyOutlineWidth,
        definition.collisionRadius,
        definition.rigidBody.mass,
        definition.rigidBody.maximumLinearSpeed,
        definition.rigidBody.maximumAngularSpeed,
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
        throw new Error(
            "SprinklerDefinition impactMomentumRetention must be finite and between 0 and 1.",
        );
    }


    if (
        definition.rigidBody.bodyType !==
        "dynamic"
    ) {
        throw new Error(
            "Phase 8B-5 Sprinkler rigidBody must be dynamic.",
        );
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

    if (
        nonNegativePhysicsValues.some(
            (value): boolean =>
                !Number.isFinite(value) ||
                value < 0,
        )
    ) {
        throw new Error(
            "Sprinkler physics values must be finite and non-negative.",
        );
    }

    if (definition.nozzleCount !== 4) {
        throw new Error("Phase 8B-3 Sprinkler must have exactly four nozzles.");
    }
}
