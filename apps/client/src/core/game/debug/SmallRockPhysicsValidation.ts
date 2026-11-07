import {
    DEFAULT_SMALL_ROCK_PHYSICS_DEFINITION,
    calculateSmallRockMass,
    createSmallRockRigidBodyDefinition,
} from "../config/SmallRockPhysicsDefinition";
import { DEFAULT_ROCK_SIZE_DISTRIBUTION, sampleSmallRockRadius } from "../config/RockSizeDistributionDefinition";

export class SmallRockPhysicsValidation {
    public static validate(): void {
        const bands = DEFAULT_ROCK_SIZE_DISTRIBUTION.bands;
        const weightSum = bands.reduce((sum, band) => sum + band.weight, 0);
        if (Math.abs(weightSum - 1) > 0.000001 || bands.some(b => b.minimumRadius <= 0 || b.maximumRadius <= b.minimumRadius)) {
            throw new Error("[RK-1] Invalid rock size distribution.");
        }
        for (const sample of [0.01, 0.4, 0.95]) {
            const radius = sampleSmallRockRadius(() => sample);
            if (radius < 4 || radius > 20) throw new Error("[RK-1] Rock size sample out of range.");
        }
        const definition =
            DEFAULT_SMALL_ROCK_PHYSICS_DEFINITION;

        const smallMass =
            calculateSmallRockMass(11, definition);
        const largeMass =
            calculateSmallRockMass(16, definition);

        if (!(largeMass > smallMass * 2)) {
            throw new Error(
                "[R-ROCK-2] Radius-squared mass scaling is not active.",
            );
        }

        const rigid =
            createSmallRockRigidBodyDefinition(13, definition);

        if (
            rigid.bodyType !== "dynamic" ||
            rigid.mass <= 0 ||
            rigid.linearDamping <= 0 ||
            rigid.angularDamping <= 0
        ) {
            throw new Error(
                "[R-ROCK-2] Small Rock rigid-body contract is invalid.",
            );
        }

        const pebble = createSmallRockRigidBodyDefinition(5, definition);
        const medium = createSmallRockRigidBodyDefinition(18, definition);
        if (!(medium.mass > pebble.mass && medium.linearDamping < pebble.linearDamping)) {
            throw new Error("[RK-1] Size-dependent mass/damping contract failed.");
        }
        if (
            definition.material.restitution >= 0.3 ||
            definition.material.friction <= 0.5
        ) {
            throw new Error(
                "[R-ROCK-2] Rock material must remain dull and high-friction.",
            );
        }

        if (
            definition.roughSettleLinearSpeed <= 0 ||
            definition.roughSettleAngularSpeed <= 0
        ) {
            throw new Error(
                "[R-ROCK-2] Rough-settling thresholds must be positive.",
            );
        }
    }
}
