/**
 * Authoritative discrete visual/gameplay damage states for the Hydrant.
 *
 * Weak impacts never accumulate hidden damage. A qualifying impact can
 * advance the Hydrant by at most one state.
 */
export enum HydrantDamageState {
    Normal = "normal",
    Damaged = "damaged",
    Broken = "broken",
}
