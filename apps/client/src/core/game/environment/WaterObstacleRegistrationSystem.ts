import type {
    DynamicObstacleDefinition,
    StaticObstacleDefinition,
} from "../config/ObstacleDefinition";

import type {
    PhysicsColliderRegistration,
    AirbornePolylinePhysicsColliderRegistration,
} from "../physics/PhysicsColliderRegistration";

import type {
    PhysicsWorld,
} from "../physics/PhysicsWorld";

import type {
    WaterObstacleField,
} from "./WaterObstacleField";

import type {
    AirborneWaterCollisionField,
} from "./AirborneWaterCollisionField";

/**
 * Phase 8D-7E Water adapter for PhysicsWorld.
 *
 * Gameplay objects register once with PhysicsWorld. This class now projects
 * only the Water-participating subset into the existing ground-Water and
 * airborne-Water collision caches.
 */
export class WaterObstacleRegistrationSystem {

    public constructor(
        private readonly physicsWorld:
            PhysicsWorld,
        private readonly groundField:
            WaterObstacleField,
        private readonly airborneField:
            AirborneWaterCollisionField,
    ) {
    }

    public getAirborneCollisionField():
        AirborneWaterCollisionField {

        return this.airborneField;
    }

    public clearCaches():
        void {

        this.groundField
            .clear();

        this.airborneField
            .clear();
    }

    public synchronize():
        void {

        this.clearCaches();

        for (
            const registration
            of this.physicsWorld
                .getGroundWaterRegistrations()
        ) {
            this.addGroundRegistration(
                registration,
            );
        }

        for (
            const registration
            of this.physicsWorld
                .getAirborneWaterRegistrations()
        ) {
            this.addAirborneRegistration(
                registration,
            );
        }
    }

    public hasRegistration(
        id:
            string,
    ): boolean {

        return this.physicsWorld
            .hasRegistration(
                id,
            );
    }

    public getStaticRegistrationCount():
        number {

        return this.physicsWorld
            .getRegistrations()
            .filter(
                (registration):
                    boolean =>
                    registration.kind ===
                    "static-definition" &&
                    (
                        registration
                            .participation
                            .groundWater ||
                        registration
                            .participation
                            .airborneWater
                    ),
            )
            .length;
    }

    public getDynamicRegistrationCount():
        number {

        return this.physicsWorld
            .getRegistrations()
            .filter(
                (registration):
                    boolean =>
                    registration.kind ===
                    "dynamic" &&
                    (
                        registration
                            .participation
                            .groundWater ||
                        registration
                            .participation
                            .airborneWater
                    ),
            )
            .length;
    }

    public getCircleProviderCount():
        number {

        return this.physicsWorld
            .getRegistrations()
            .filter(
                (registration):
                    boolean =>
                    registration.kind ===
                    "fixed" &&
                    registration
                        .getShape()
                        .shape ===
                    "circle" &&
                    (
                        registration
                            .participation
                            .groundWater ||
                        registration
                            .participation
                            .airborneWater
                    ),
            )
            .length;
    }

    public getAirbornePolylineProviderCount():
        number {

        return this.physicsWorld
            .getRegistrations()
            .filter(
                (registration):
                    boolean =>
                    registration.kind ===
                    "airborne-polyline" &&
                    registration
                        .participation
                        .airborneWater,
            )
            .length;
    }

    private addGroundRegistration(
        registration:
            PhysicsColliderRegistration,
    ): void {

        switch (
        registration.kind
        ) {
            case "static-definition":
                this.addGroundDefinition(
                    registration.definition,
                    registration
                        .definition
                        .positionX,
                    registration
                        .definition
                        .positionY,
                    0,
                );
                return;

            case "dynamic":
                this.addGroundDefinition(
                    registration.body
                        .getDefinition(),
                    registration.body
                        .getX(),
                    registration.body
                        .getY(),
                    registration.body
                        .getRotationRadians(),
                );
                return;

            case "fixed": {
                const shape =
                    registration
                        .getShape();

                if (
                    shape.shape ===
                    "circle"
                ) {
                    this.groundField
                        .rasterizeCircle(
                            shape.positionX,
                            shape.positionY,
                            shape.radius,
                        );
                } else {
                    this.groundField
                        .rasterizeShape({
                            kind:
                                "orientedRectangle",
                            centerX:
                                shape.positionX,
                            centerY:
                                shape.positionY,
                            width:
                                shape.width,
                            height:
                                shape.height,
                            rotationRadians:
                                shape.rotationRadians,
                        });
                }
                return;
            }

            case "airborne-polyline":
                return;
        }
    }

    private addAirborneRegistration(
        registration:
            PhysicsColliderRegistration,
    ): void {

        switch (
        registration.kind
        ) {
            case "static-definition":
                this.addAirborneDefinition(
                    registration.definition,
                    registration
                        .definition
                        .positionX,
                    registration
                        .definition
                        .positionY,
                    0,
                    registration.id,
                    registration
                        .ownerSourceIds,
                );
                return;

            case "dynamic":
                this.addAirborneDefinition(
                    registration.body
                        .getDefinition(),
                    registration.body
                        .getX(),
                    registration.body
                        .getY(),
                    registration.body
                        .getRotationRadians(),
                    registration.id,
                    registration
                        .ownerSourceIds,
                );
                return;

            case "fixed": {
                const shape =
                    registration
                        .getShape();

                if (
                    shape.shape ===
                    "circle"
                ) {
                    this.airborneField
                        .addCircle(
                            shape.positionX,
                            shape.positionY,
                            shape.radius,
                            registration.id,
                            registration
                                .ownerSourceIds,
                        );
                } else {
                    this.airborneField
                        .addShape({
                            kind:
                                "orientedRectangle",
                            centerX:
                                shape.positionX,
                            centerY:
                                shape.positionY,
                            width:
                                shape.width,
                            height:
                                shape.height,
                            rotationRadians:
                                shape.rotationRadians,
                            colliderId:
                                registration.id,
                            ownerSourceIds:
                                registration
                                    .ownerSourceIds,
                        });
                }
                return;
            }

            case "airborne-polyline":
                this.addAirbornePolyline(
                    registration,
                );
                return;
        }
    }

    private addGroundDefinition(
        definition:
            StaticObstacleDefinition |
            DynamicObstacleDefinition,

        centerX:
            number,

        centerY:
            number,

        rotationRadians:
            number,
    ): void {

        switch (
        definition.shape
        ) {
            case "rectangle":
                if (
                    Math.abs(
                        rotationRadians,
                    ) <=
                    1e-10
                ) {
                    this.groundField
                        .rasterizeRectangle(
                            centerX,
                            centerY,
                            definition.width,
                            definition.height,
                        );
                } else {
                    this.groundField
                        .rasterizeShape({
                            kind:
                                "orientedRectangle",
                            centerX,
                            centerY,
                            width:
                                definition.width,
                            height:
                                definition.height,
                            rotationRadians,
                        });
                }
                return;

            case "circle":
                this.groundField
                    .rasterizeCircle(
                        centerX,
                        centerY,
                        definition.radius,
                    );
                return;

            case "triangle":
                return;
        }
    }

    private addAirborneDefinition(
        definition:
            StaticObstacleDefinition |
            DynamicObstacleDefinition,

        centerX:
            number,

        centerY:
            number,

        rotationRadians:
            number,

        colliderId:
            string,

        ownerSourceIds:
            readonly string[],
    ): void {

        switch (
        definition.shape
        ) {
            case "rectangle":
                if (
                    Math.abs(
                        rotationRadians,
                    ) <=
                    1e-10
                ) {
                    this.airborneField
                        .addRectangle(
                            centerX,
                            centerY,
                            definition.width,
                            definition.height,
                            colliderId,
                            ownerSourceIds,
                        );
                } else {
                    this.airborneField
                        .addShape({
                            kind:
                                "orientedRectangle",
                            centerX,
                            centerY,
                            width:
                                definition.width,
                            height:
                                definition.height,
                            rotationRadians,
                            colliderId,
                            ownerSourceIds,
                        });
                }
                return;

            case "circle":
                this.airborneField
                    .addCircle(
                        centerX,
                        centerY,
                        definition.radius,
                        colliderId,
                        ownerSourceIds,
                    );
                return;

            case "triangle":
                return;
        }
    }

    private addAirbornePolyline(
        registration:
            AirbornePolylinePhysicsColliderRegistration,
    ): void {

        const points =
            registration
                .getPoints();

        if (
            points.length ===
            0
        ) {
            return;
        }

        const spacing =
            Math.max(
                1,
                registration.radius *
                1.5,
            );

        for (
            let segmentIndex = 0;
            segmentIndex <
            points.length -
            1;
            segmentIndex +=
            1
        ) {
            const first =
                points[
                segmentIndex
                ]!;

            const second =
                points[
                segmentIndex +
                1
                ]!;

            const length =
                Math.hypot(
                    second.x -
                    first.x,
                    second.y -
                    first.y,
                );

            const samples =
                Math.max(
                    1,
                    Math.ceil(
                        length /
                        spacing,
                    ),
                );

            for (
                let sample = 0;
                sample <
                samples;
                sample +=
                1
            ) {
                const interpolation =
                    sample /
                    samples;

                this.airborneField
                    .addCircle(
                        first.x +
                        (
                            second.x -
                            first.x
                        ) *
                        interpolation,
                        first.y +
                        (
                            second.y -
                            first.y
                        ) *
                        interpolation,
                        registration.radius,
                        `${registration.id}-segment-${segmentIndex}-sample-${sample}`,
                        registration
                            .ownerSourceIds,
                    );
            }
        }

        const last =
            points[
            points.length -
            1
            ]!;

        this.airborneField
            .addCircle(
                last.x,
                last.y,
                registration.radius,
                `${registration.id}-nozzle`,
                registration
                    .ownerSourceIds,
            );
    }
}
