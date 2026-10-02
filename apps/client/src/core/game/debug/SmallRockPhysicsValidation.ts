import {
    DEFAULT_SMALL_ROCK_PHYSICS_DEFINITION,
    calculateSmallRockMass,
    createSmallRockRigidBodyDefinition,
} from "../config/SmallRockPhysicsDefinition";

export class SmallRockPhysicsValidation {
    public static validate(): void {
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
