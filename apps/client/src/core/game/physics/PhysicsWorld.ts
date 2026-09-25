import type {
    StaticObstacleDefinition,
} from "../config/ObstacleDefinition";

import type {
    DynamicCollidable,
} from "./DynamicCollidable";

import type {
    FixedCollisionShape,
} from "./DynamicCollidableCollision";

import type {
    PhysicsColliderParticipation,
    PhysicsColliderRegistration,
    PhysicsColliderRegistrationOptions,
    StaticPhysicsColliderRegistration,
    DynamicPhysicsColliderRegistration,
    FixedPhysicsColliderRegistration,
    AirbornePolylinePhysicsColliderRegistration,
} from "./PhysicsColliderRegistration";

import {
    resolvePhysicsColliderParticipation,
} from "./PhysicsColliderRegistration";

/**
 * Phase 8D-7E authoritative collider registry.
 *
 * Gameplay entities remain owned by World. PhysicsWorld owns only their
 * physical registration and participation metadata. Existing collision
 * solvers continue to own collision mathematics and response.
 */
export class PhysicsWorld {

    private readonly registrations =
        new Map<
            string,
            PhysicsColliderRegistration
        >();

    /*
     * Stable arrays are intentional. Ball receives the dynamic array by
     * reference during construction, so later registrations/removals remain
     * visible without rebuilding Ball or adding object-specific wiring.
     */
    private readonly rigidDynamicCollidables:
        DynamicCollidable[] = [];

    private readonly rigidStaticDefinitions:
        StaticObstacleDefinition[] = [];

    public registerStaticDefinition(
        definition:
            StaticObstacleDefinition,

        options:
            PhysicsColliderRegistrationOptions =
            {},
    ): void {

        const registration:
            StaticPhysicsColliderRegistration = {
                kind:
                    "static-definition",
                id:
                    definition.id,
                definition,
                participation:
                    resolvePhysicsColliderParticipation(
                        options.participation,
                    ),
                ownerSourceIds:
                    [...(
                        options.ownerSourceIds ??
                        []
                    )],
            };

        this.addRegistration(
            registration,
        );
    }

    public registerDynamicCollidable(
        id:
            string,

        body:
            DynamicCollidable,

        options:
            PhysicsColliderRegistrationOptions =
            {},
    ): void {

        const registration:
            DynamicPhysicsColliderRegistration = {
                kind:
                    "dynamic",
                id,
                body,
                participation:
                    resolvePhysicsColliderParticipation(
                        options.participation,
                    ),
                ownerSourceIds:
                    [...(
                        options.ownerSourceIds ??
                        []
                    )],
            };

        this.addRegistration(
            registration,
        );
    }

    /**
     * Fixed providers may return a different transform every frame. DB-1 uses
     * this existing contract for the rotating Directional Bumper while its pivot
     * remains immovable. Collision consumers always receive the current shape.
     */
    public registerFixedShapeProvider(
        id:
            string,

        getShape:
            () => FixedCollisionShape,

        options:
            PhysicsColliderRegistrationOptions =
            {},
    ): void {

        const registration:
            FixedPhysicsColliderRegistration = {
                kind:
                    "fixed",
                id,
                getShape,
                participation:
                    resolvePhysicsColliderParticipation(
                        options.participation,
                    ),
                ownerSourceIds:
                    [...(
                        options.ownerSourceIds ??
                        []
                    )],
            };

        this.addRegistration(
            registration,
        );
    }

    public registerAirbornePolylineProvider(
        id:
            string,

        radius:
            number,

        getPoints:
            () => readonly {
                readonly x: number;
                readonly y: number;
            }[],

        options:
            PhysicsColliderRegistrationOptions =
            {},
    ): void {

        if (
            !Number.isFinite(
                radius,
            ) ||
            radius <= 0
        ) {
            throw new Error(
                "PhysicsWorld airborne polyline radius must be greater than zero.",
            );
        }

        const registration:
            AirbornePolylinePhysicsColliderRegistration = {
                kind:
                    "airborne-polyline",
                id,
                radius,
                getPoints,
                participation:
                    resolvePhysicsColliderParticipation({
                        rigidBody:
                            false,
                        hose:
                            false,
                        groundWater:
                            false,
                        airborneWater:
                            true,
                        ...options.participation,
                    }),
                ownerSourceIds:
                    [...(
                        options.ownerSourceIds ??
                        []
                    )],
            };

        this.addRegistration(
            registration,
        );
    }

    public unregister(
        id:
            string,
    ): boolean {

        const registration =
            this.registrations
                .get(
                    id,
                );

        if (!registration) {
            return false;
        }

        this.registrations
            .delete(
                id,
            );

        this.removeFromStableViews(
            registration,
        );

        return true;
    }

    public unregisterDynamicBody(
        body:
            DynamicCollidable,
    ): boolean {

        for (
            const registration
            of this.registrations
                .values()
        ) {
            if (
                registration.kind ===
                    "dynamic" &&
                registration.body ===
                    body
            ) {
                return this.unregister(
                    registration.id,
                );
            }
        }

        return false;
    }

    public clear():
        void {

        this.registrations
            .clear();

        this.rigidDynamicCollidables
            .length =
            0;

        this.rigidStaticDefinitions
            .length =
            0;
    }

    public hasRegistration(
        id:
            string,
    ): boolean {

        return this.registrations
            .has(
                id,
            );
    }

    public getRegistration(
        id:
            string,
    ):
        PhysicsColliderRegistration |
        null {

        return this.registrations
            .get(
                id,
            ) ??
            null;
    }

    public getRegistrationCount():
        number {

        return this.registrations
            .size;
    }

    public getRigidDynamicCollidables():
        readonly DynamicCollidable[] {

        return this.rigidDynamicCollidables;
    }

    /** RB-3 movable subset used by powered fixed mechanisms such as Radial Bumper. */
    public getMovableRigidDynamicCollidables(): readonly DynamicCollidable[] {
        return this.rigidDynamicCollidables.filter((body) => body.getInverseMass() > 0);
    }

    /** R-9 colliders that opt into non-physical impact awareness. */
    public getImpactAwareDynamicCollidables(): readonly DynamicCollidable[] {
        return [...this.registrations.values()]
            .filter((registration): registration is DynamicPhysicsColliderRegistration =>
                registration.kind === "dynamic" && registration.participation.impactAwareness)
            .map((registration) => registration.body);
    }

    public getRigidStaticDefinitions():
        readonly StaticObstacleDefinition[] {

        return this.rigidStaticDefinitions;
    }

    public getRigidFixedShapes():
        readonly FixedCollisionShape[] {

        const shapes:
            FixedCollisionShape[] =
            [];

        for (
            const registration
            of this.registrations
                .values()
        ) {
            if (
                registration.kind !==
                    "fixed" ||
                !registration
                    .participation
                    .rigidBody
            ) {
                continue;
            }

            shapes.push(
                registration
                    .getShape(),
            );
        }

        return shapes;
    }

    public getHoseStaticDefinitions():
        readonly StaticObstacleDefinition[] {

        const result:
            StaticObstacleDefinition[] =
            [];

        for (
            const registration
            of this.registrations
                .values()
        ) {
            if (
                registration.kind ===
                    "static-definition" &&
                registration
                    .participation
                    .hose
            ) {
                result.push(
                    registration
                        .definition,
                );
            }
        }

        return result;
    }

    public getHoseDynamicCollidables():
        readonly DynamicCollidable[] {

        const result:
            DynamicCollidable[] =
            [];

        for (
            const registration
            of this.registrations
                .values()
        ) {
            if (
                registration.kind ===
                    "dynamic" &&
                registration
                    .participation
                    .hose
            ) {
                result.push(
                    registration.body,
                );
            }
        }

        return result;
    }

    public getGroundWaterRegistrations():
        readonly PhysicsColliderRegistration[] {

        return this.getRegistrationsFor(
            "groundWater",
        );
    }

    public getAirborneWaterRegistrations():
        readonly PhysicsColliderRegistration[] {

        return this.getRegistrationsFor(
            "airborneWater",
        );
    }

    public getRegistrations():
        readonly PhysicsColliderRegistration[] {

        return [
            ...this.registrations
                .values(),
        ];
    }

    private addRegistration(
        registration:
            PhysicsColliderRegistration,
    ): void {

        if (
            registration.id
                .trim()
                .length ===
            0
        ) {
            throw new Error(
                "PhysicsWorld collider registration id cannot be empty.",
            );
        }

        if (
            this.registrations
                .has(
                    registration.id,
                )
        ) {
            throw new Error(
                `PhysicsWorld collider '${registration.id}' is already registered.`,
            );
        }

        this.registrations
            .set(
                registration.id,
                registration,
            );

        this.addToStableViews(
            registration,
        );
    }

    private addToStableViews(
        registration:
            PhysicsColliderRegistration,
    ): void {

        if (
            registration.kind ===
                "dynamic" &&
            registration
                .participation
                .rigidBody
        ) {
            this.rigidDynamicCollidables
                .push(
                    registration.body,
                );
        }

        if (
            registration.kind ===
                "static-definition" &&
            registration
                .participation
                .rigidBody
        ) {
            this.rigidStaticDefinitions
                .push(
                    registration
                        .definition,
                );
        }
    }

    private removeFromStableViews(
        registration:
            PhysicsColliderRegistration,
    ): void {

        if (
            registration.kind ===
            "dynamic"
        ) {
            const index =
                this.rigidDynamicCollidables
                    .indexOf(
                        registration.body,
                    );

            if (index >= 0) {
                this.rigidDynamicCollidables
                    .splice(
                        index,
                        1,
                    );
            }
        }

        if (
            registration.kind ===
            "static-definition"
        ) {
            const index =
                this.rigidStaticDefinitions
                    .indexOf(
                        registration
                            .definition,
                    );

            if (index >= 0) {
                this.rigidStaticDefinitions
                    .splice(
                        index,
                        1,
                    );
            }
        }
    }

    private getRegistrationsFor(
        participationKey:
            keyof PhysicsColliderParticipation,
    ):
        readonly PhysicsColliderRegistration[] {

        const result:
            PhysicsColliderRegistration[] =
            [];

        for (
            const registration
            of this.registrations
                .values()
        ) {
            if (
                registration
                    .participation[
                        participationKey
                    ]
            ) {
                result.push(
                    registration,
                );
            }
        }

        return result;
    }
}
