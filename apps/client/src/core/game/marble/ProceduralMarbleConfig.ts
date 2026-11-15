/** M4 density uses playable polygon area, not the bounding rectangle. */
export const PROCEDURAL_MARBLE_CONFIG = {
    /** One possible marble at each 100k px², before the independent 0–100 roll. */
    areaPerMarble: 100_000,
    minimum: 0,
    maximum: 30,
    radius: 7.5,
    boundaryClearance: 8,
    spawnClearance: 65,
    holeClearance: 55,
    marbleClearance: 12,
    objectClearance: 10,
    attemptsPerMarble: 90,
} as const;
export function marbleTargetForArea(area: number, config: {minimum:number;maximum:number;areaPerMarble:number} = {minimum:PROCEDURAL_MARBLE_CONFIG.minimum,maximum:PROCEDURAL_MARBLE_CONFIG.maximum,areaPerMarble:PROCEDURAL_MARBLE_CONFIG.areaPerMarble}): number {
    if (!Number.isFinite(area) || area <= 0) return 0;
    return Math.max(config.minimum,
        Math.min(config.maximum, Math.round(area / config.areaPerMarble)));
}
