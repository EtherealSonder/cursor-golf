/**
 * Temporary Fire-source placement modes used by the development
 * validation UI.
 *
 * Directional and Sweeping modes will be added in Phase 4B-6C/6D.
 */
export enum FireSourcePlacementMode {
    None = "none",
    Point = "point",
    Persistent = "persistent",
    Directional = "directional",
    Sweeping = "sweeping",
}

export type FireSourcePlacementModeListener =
    (
        mode: FireSourcePlacementMode,
    ) => void;
