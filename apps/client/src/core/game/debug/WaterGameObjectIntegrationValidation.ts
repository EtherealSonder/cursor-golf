import type {
    PhysicsWorld,
} from "../physics/PhysicsWorld";

import type {
    WaterObstacleField,
} from "../environment/WaterObstacleField";

import type {
    AirborneWaterCollisionField,
} from "../environment/AirborneWaterCollisionField";

import type {
    WaterObstacleRegistrationSystem,
} from "../environment/WaterObstacleRegistrationSystem";

/**
 * Phase 8D-7 regression validation after 8D-7E.
 *
 * The original checks are retained, but registration authority is now
 * PhysicsWorld rather than object-specific calls in World.
 */
export class WaterGameObjectIntegrationValidation {

    public constructor(
        private readonly physicsWorld:
            PhysicsWorld,
        private readonly registrationSystem:
            WaterObstacleRegistrationSystem,
        private readonly groundField:
            WaterObstacleField,
        private readonly airborneField:
            AirborneWaterCollisionField,
    ) {
    }

    public run():
        boolean {

        const registrations =
            this.physicsWorld
                .getRegistrations();

        const staticPass =
            registrations.some(
                (registration):
                    boolean =>
                    registration.kind ===
                    "static-definition",
            );

        const dynamicPass =
            registrations.some(
                (registration):
                    boolean =>
                    registration.kind ===
                    "dynamic",
            );

        const sprinklerA =
            this.registrationSystem
                .hasRegistration(
                    "sprinkler-1",
                );

        const sprinklerB =
            this.registrationSystem
                .hasRegistration(
                    "sprinkler-2",
                );

        const fanPass =
            registrations.some(
                (registration):
                    boolean =>
                    registration.kind ===
                    "dynamic" &&
                    registration.id
                        .startsWith(
                            "fan-",
                        ),
            );

        const fireTubePass =
            registrations.some(
                (registration):
                    boolean =>
                    registration.kind ===
                    "dynamic" &&
                    registration.id
                        .startsWith(
                            "fire-tube-",
                        ),
            );

        const hydrantPass =
            this.registrationSystem
                .hasRegistration(
                    "hydrant-1",
                );

        const groundPass =
            this.groundField
                .getBlockedCellCount() >
            0;

        const airbornePass =
            this.airborneField
                .getShapeCount() >
            0;

        const checks = [
            ["Static Object Registration", staticPass],
            ["Dynamic Object Registration", dynamicPass],
            ["Sprinkler A Registration", sprinklerA],
            ["Sprinkler B Registration", sprinklerB],
            ["Fan Registration", fanPass],
            ["Fire Tube Registration", fireTubePass],
            ["Hydrant Registration", hydrantPass],
            ["Ground-Water Occupancy Cache", groundPass],
            ["Airborne-Water Collision Cache", airbornePass],
        ] as const;

        for (
            const [
                name,
                passed,
            ]
            of checks
        ) {
            console.log(
                `[8D-7] ${name}: ${passed ? "PASS" : "FAIL"}`,
            );
        }

        const passed =
            checks.every(
                (
                    check,
                ): boolean =>
                    check[1],
            );

        console.log(
            `[8D-7] Actual Game Object Integration: ${passed ? "PASS" : "FAIL"}`,
        );

        return passed;
    }
}
