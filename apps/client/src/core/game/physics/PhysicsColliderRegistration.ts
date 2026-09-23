import type {
    StaticObstacleDefinition,
} from "../config/ObstacleDefinition";

import type {
    DynamicCollidable,
} from "./DynamicCollidable";

import type {
    FixedCollisionShape,
} from "./DynamicCollidableCollision";

export interface PhysicsColliderParticipation {
    readonly rigidBody: boolean;
    readonly hose: boolean;
    readonly groundWater: boolean;
    readonly airborneWater: boolean;
    readonly impactAwareness: boolean;
}

export const FULL_SOLID_COLLIDER_PARTICIPATION:
    PhysicsColliderParticipation = {

    rigidBody: true,
    hose: true,
    groundWater: true,
    airborneWater: true,
    impactAwareness: true,
};

export interface StaticPhysicsColliderRegistration {
    readonly kind: "static-definition";
    readonly id: string;
    readonly definition: StaticObstacleDefinition;
    readonly participation: PhysicsColliderParticipation;
    readonly ownerSourceIds: readonly string[];
}

export interface DynamicPhysicsColliderRegistration {
    readonly kind: "dynamic";
    readonly id: string;
    readonly body: DynamicCollidable;
    readonly participation: PhysicsColliderParticipation;
    readonly ownerSourceIds: readonly string[];
}

export interface FixedPhysicsColliderRegistration {
    readonly kind: "fixed";
    readonly id: string;
    readonly getShape: () => FixedCollisionShape;
    readonly participation: PhysicsColliderParticipation;
    readonly ownerSourceIds: readonly string[];
}

export interface AirbornePolylinePhysicsColliderRegistration {
    readonly kind: "airborne-polyline";
    readonly id: string;
    readonly radius: number;
    readonly getPoints:
        () => readonly {
            readonly x: number;
            readonly y: number;
        }[];
    readonly participation: PhysicsColliderParticipation;
    readonly ownerSourceIds: readonly string[];
}

export type PhysicsColliderRegistration =
    | StaticPhysicsColliderRegistration
    | DynamicPhysicsColliderRegistration
    | FixedPhysicsColliderRegistration
    | AirbornePolylinePhysicsColliderRegistration;

export interface PhysicsColliderRegistrationOptions {
    readonly participation?: Partial<PhysicsColliderParticipation>;
    readonly ownerSourceIds?: readonly string[];
}

export function resolvePhysicsColliderParticipation(
    partial:
        Partial<PhysicsColliderParticipation> =
        {},
): PhysicsColliderParticipation {

    return {
        rigidBody:
            partial.rigidBody ??
            true,
        hose:
            partial.hose ??
            true,
        groundWater:
            partial.groundWater ??
            true,
        airborneWater:
            partial.airborneWater ??
            true,
        impactAwareness:
            partial.impactAwareness ??
            true,
    };
}
