export interface PhysicsMaterial {
    /**
     * Percentage of normal impact speed preserved
     * after collision.
     */
    readonly restitution: number;

    /**
     * Coulomb-style collision friction coefficient.
     */
    readonly friction: number;

    /** M1 opt-in high-rebound marble contact. Other materials retain minimum restitution. */
    readonly marbleBounce?: boolean;
}

export function combineRestitution(
    first: PhysicsMaterial,
    second: PhysicsMaterial,
): number {

    if (first.marbleBounce || second.marbleBounce) {
        // Opt-in: avoid low-restitution crates/walls suppressing marble ricochets.
        return Math.max(first.restitution, second.restitution);
    }
    return Math.min(first.restitution, second.restitution);
}

export function combineFriction(
    first: PhysicsMaterial,
    second: PhysicsMaterial,
): number {

    return Math.sqrt(
        Math.max(
            0,
            first.friction,
        ) *
        Math.max(
            0,
            second.friction,
        ),
    );
}

export function validatePhysicsMaterial(
    material: PhysicsMaterial,
    label = "Physics material",
): void {

    if (
        !Number.isFinite(
            material.restitution,
        ) ||
        material.restitution < 0 ||
        material.restitution > 1
    ) {
        throw new Error(
            `${label} restitution must be a finite number between 0 and 1.`,
        );
    }

    if (
        !Number.isFinite(
            material.friction,
        ) ||
        material.friction < 0
    ) {
        throw new Error(
            `${label} friction must be a finite non-negative number.`,
        );
    }
}
