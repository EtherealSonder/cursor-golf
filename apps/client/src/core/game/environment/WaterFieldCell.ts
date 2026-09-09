/**
 * Read-only WaterField query sample.
 *
 * WaterField stores its authoritative channels in typed arrays rather than
 * allocating one object per grid cell. WaterFieldCell objects are created
 * only when a caller explicitly samples a cell.
 */
export interface WaterFieldCell {
    readonly gridX: number;
    readonly gridY: number;
    readonly index: number;

    readonly worldCenterX: number;
    readonly worldCenterY: number;

    /**
     * Standing-Water depth in simulation depth units.
     */
    readonly depth: number;

    /**
     * Horizontal Water velocity in world-space pixels per second.
     *
     * Phase 8A-1 stores these channels so later solver work does not require
     * changing the authoritative data layout.
     */
    readonly velocityX: number;
    readonly velocityY: number;
}
