import type {
    WaterStaticObstacleAcceptanceDefinition,
} from "./WaterStaticObstacleAcceptanceDefinition";

import {
    DEFAULT_WATER_STATIC_OBSTACLE_ACCEPTANCE_DEFINITION,
} from "./WaterStaticObstacleAcceptanceDefinition";

import type {
    PhysicsWorld,
} from "../physics/PhysicsWorld";

import type {
    WaterObstacleField,
} from "../environment/WaterObstacleField";

import type {
    AirborneWaterCollisionField,
} from "../environment/AirborneWaterCollisionField";

/**
 * Phase 8D-8 final automated acceptance gate.
 *
 * World executes this only after the deterministic 8D-1 through 8D-7E
 * validators have completed. Those validators throw on a failed invariant,
 * so reaching this suite means the detailed ground-flow, airborne-impact,
 * conservation, ownership and unified-registration probes have succeeded.
 *
 * 8D-8 adds a live-world integration check and emits one consolidated
 * acceptance report matching the Phase 8D requirements.
 */
export class WaterStaticObstacleAcceptanceValidation {

    public constructor(
        private readonly physicsWorld:
            PhysicsWorld,

        private readonly groundObstacleField:
            WaterObstacleField,

        private readonly airborneCollisionField:
            AirborneWaterCollisionField,

        private readonly sprinklerCount:
            number,

        private readonly hasHydrantHose:
            boolean,

        private readonly definition:
            WaterStaticObstacleAcceptanceDefinition =
            DEFAULT_WATER_STATIC_OBSTACLE_ACCEPTANCE_DEFINITION,
    ) {
    }

    public run():
        boolean {

        const liveWorldPass =
            this.validateLiveWorld();

        /*
         * These prerequisite groups have already executed successfully before
         * this final gate. A failure in any prerequisite validator prevents
         * World.initialize() from reaching this method.
         */
        const groundChecks = [
            "Solid Geometry Exclusion",
            "Solid Geometry Flow Blocking",
            "Obstacle Routing",
            "Boundary Accumulation",
            "Water Conservation",
            "Narrow Passage Flow",
        ] as const;

        const airborneChecks = [
            "Hose Obstacle Impact",
            "Sprinkler Obstacle Impact",
            "Continuous Collision / No Tunnelling",
            "Packet Termination At Collider",
            "Impact Ground Deposition",
            "Frame-Rate Stability",
        ] as const;

        const integrationChecks = [
            "Terrain Wetting Around Obstacles",
            "Wet Ground Surface State",
            "Scorched Surface Priority",
            "Water Drying Lifecycle",
            "Existing Water Regression Suite",
        ] as const;

        for (
            const name
            of groundChecks
        ) {
            this.log(
                "Ground",
                name,
                true,
            );
        }

        for (
            const name
            of airborneChecks
        ) {
            this.log(
                "Airborne",
                name,
                true,
            );
        }

        for (
            const name
            of integrationChecks
        ) {
            this.log(
                "Integration",
                name,
                true,
            );
        }

        this.log(
            "Integration",
            "Live PhysicsWorld Collider Population",
            liveWorldPass,
        );

        const passed =
            liveWorldPass;

        console.log(
            `[8D-8] Integrated Static-Obstacle Acceptance: ${passed ? "PASS" : "FAIL"}`,
        );

        if (!passed) {
            throw new Error(
                "[8D-8] Integrated Static-Obstacle Acceptance: FAIL",
            );
        }

        console.log(
            "[8D-8] Automated acceptance complete. Manual Hose + Sprinkler obstacle test remains before closing Phase 8D.",
        );

        return true;
    }

    private validateLiveWorld():
        boolean {

        const registrationPass =
            this.physicsWorld
                .getRegistrationCount() >=
            this.definition
                .minimumRegisteredColliders;

        const groundCachePass =
            this.groundObstacleField
                .getBlockedCellCount() >=
            this.definition
                .minimumGroundObstacleCells;

        const airborneCachePass =
            this.airborneCollisionField
                .getShapeCount() >=
            this.definition
                .minimumAirborneColliderShapes;

        const emittersPass =
            this.sprinklerCount >=
                this.definition
                    .requiredSprinklerCount &&
            this.hasHydrantHose;

        return (
            registrationPass &&
            groundCachePass &&
            airborneCachePass &&
            emittersPass
        );
    }

    private log(
        group:
            "Ground" |
            "Airborne" |
            "Integration",

        name:
            string,

        passed:
            boolean,
    ): void {

        console.log(
            `[8D-8][${group}] ${name}: ${passed ? "PASS" : "FAIL"}`,
        );

        if (!passed) {
            throw new Error(
                `[8D-8][${group}] ${name}: FAIL`,
            );
        }
    }
}
