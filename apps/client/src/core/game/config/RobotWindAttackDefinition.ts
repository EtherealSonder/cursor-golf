/**
 * Wind Robot suction attack tuning.
 *
 * Geometry extends outward from the nozzle while flowMode="pull" makes the
 * authoritative acceleration point back toward the nozzle. This keeps the
 * spatial cone and the airflow direction independent.
 */
export interface RobotWindAttackDefinition {
    readonly range: number;
    readonly nozzleHalfWidth: number;
    readonly farHalfWidth: number;
    readonly acceleration: number;
    readonly endStrengthMultiplier: number;
    readonly edgeFalloffFraction: number;
}

export const DEFAULT_ROBOT_WIND_ATTACK_DEFINITION: RobotWindAttackDefinition = {
    range: 520,
    // Match the narrow suction field to the visible nozzle mouth.
    nozzleHalfWidth: 13,
    farHalfWidth: 118,
    acceleration: 2600,
    endStrengthMultiplier: 0.72,
    edgeFalloffFraction: 0.18,
};
