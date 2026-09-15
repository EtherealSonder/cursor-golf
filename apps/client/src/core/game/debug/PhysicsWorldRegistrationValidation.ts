import type {
    DynamicObstacleDefinition,
    StaticObstacleDefinition,
} from "../config/ObstacleDefinition";

import type {
    DynamicCollidable,
} from "../physics/DynamicCollidable";

import {
    PhysicsWorld,
} from "../physics/PhysicsWorld";

class ValidationDynamicCollidable
    implements DynamicCollidable {

    private x = 40;
    private y = 50;

    private readonly definition:
        DynamicObstacleDefinition = {
            id:
                "8d7e-validation-dynamic",
            shape:
                "circle",
            positionX:
                40,
            positionY:
                50,
            rotationRadians:
                0,
            radius:
                12,
            fillColor:
                0xffffff,
            outlineColor:
                0x000000,
            outlineWidth:
                0,
            material: {
                restitution:
                    0.4,
                friction:
                    0.2,
            },
            rigidBody: {
                bodyType:
                    "dynamic",
                mass:
                    1,
                linearDamping:
                    0,
                angularDamping:
                    0,
                sleepLinearSpeedThreshold:
                    0,
                sleepAngularSpeedThreshold:
                    0,
                sleepDelay:
                    1,
                maximumLinearSpeed:
                    1000,
                maximumAngularSpeed:
                    20,
            },
        };

    public getDefinition():
        DynamicObstacleDefinition {
        return this.definition;
    }

    public getX(): number {
        return this.x;
    }

    public getY(): number {
        return this.y;
    }

    public getRotationRadians(): number {
        return 0;
    }

    public getVelocityX(): number {
        return 0;
    }

    public getVelocityY(): number {
        return 0;
    }

    public getAngularVelocity(): number {
        return 0;
    }

    public getInverseMass(): number {
        return 1;
    }

    public getInverseMomentOfInertia():
        number {
        return 1;
    }

    public applyImpulseAtWorldPoint():
        void {
    }

    public translate(
        deltaX: number,
        deltaY: number,
    ): void {
        this.x += deltaX;
        this.y += deltaY;
    }
}

export class PhysicsWorldRegistrationValidation {

    public run():
        boolean {

        const world =
            new PhysicsWorld();

        const staticDefinition:
            StaticObstacleDefinition = {
                id:
                    "8d7e-validation-static",
                shape:
                    "rectangle",
                positionX:
                    10,
                positionY:
                    20,
                width:
                    24,
                height:
                    24,
                fillColor:
                    0xffffff,
                outlineColor:
                    0x000000,
                outlineWidth:
                    0,
                material: {
                    restitution:
                        0.4,
                    collisionFriction:
                        0.2,
                },
            };

        const dynamic =
            new ValidationDynamicCollidable();

        world.registerStaticDefinition(
            staticDefinition,
        );

        world.registerDynamicCollidable(
            "8d7e-validation-dynamic",
            dynamic,
        );

        world.registerFixedShapeProvider(
            "8d7e-validation-fixed",
            () => ({
                id:
                    "8d7e-validation-fixed",
                shape:
                    "circle",
                positionX:
                    80,
                positionY:
                    90,
                radius:
                    18,
                material: {
                    restitution:
                        0.3,
                    friction:
                        0.2,
                },
            }),
        );

        world.registerAirbornePolylineProvider(
            "8d7e-validation-polyline",
            4,
            () => [
                { x: 0, y: 0 },
                { x: 20, y: 0 },
            ],
            {
                ownerSourceIds: [
                    "validation-source",
                ],
            },
        );

        const registrationPass =
            world.getRegistrationCount() ===
                4 &&
            world.hasRegistration(
                "8d7e-validation-dynamic",
            );

        this.log(
            "Unified Registration",
            registrationPass,
        );

        const filteringPass =
            world
                .getRigidDynamicCollidables()
                .length ===
                1 &&
            world
                .getRigidStaticDefinitions()
                .length ===
                1 &&
            world
                .getRigidFixedShapes()
                .length ===
                1 &&
            world
                .getAirborneWaterRegistrations()
                .length ===
                4 &&
            world
                .getGroundWaterRegistrations()
                .length ===
                3;

        this.log(
            "Participation Filtering",
            filteringPass,
        );

        const beforeX =
            dynamic.getX();

        dynamic.translate(
            7,
            0,
        );

        const synchronizationPass =
            world
                .getRigidDynamicCollidables()[
                    0
                ]
                ?.getX() ===
                beforeX +
                7;

        this.log(
            "Dynamic Transform Reference",
            synchronizationPass,
        );

        const unregisterPass =
            world.unregister(
                "8d7e-validation-fixed",
            ) &&
            !world.hasRegistration(
                "8d7e-validation-fixed",
            ) &&
            world
                .getRigidFixedShapes()
                .length ===
                0;

        this.log(
            "Unregister",
            unregisterPass,
        );

        world.clear();

        const resetPass =
            world.getRegistrationCount() ===
                0 &&
            world
                .getRigidDynamicCollidables()
                .length ===
                0 &&
            world
                .getRigidStaticDefinitions()
                .length ===
                0;

        this.log(
            "Reset",
            resetPass,
        );

        const passed =
            registrationPass &&
            filteringPass &&
            synchronizationPass &&
            unregisterPass &&
            resetPass;

        console.log(
            `[8D-7E] PhysicsWorld / Unified Collider Registration: ${passed ? "PASS" : "FAIL"}`,
        );

        return passed;
    }

    private log(
        name:
            string,
        passed:
            boolean,
    ): void {

        console.log(
            `[8D-7E] ${name}: ${passed ? "PASS" : "FAIL"}`,
        );
    }
}
