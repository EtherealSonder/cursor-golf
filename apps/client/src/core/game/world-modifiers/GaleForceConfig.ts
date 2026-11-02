/** WM-6A: Fixed high-speed prevailing wind, with one random heading per activation. */
export const GALE_FORCE_CONFIG = Object.freeze({
    strengthKph: 90,
    minimumDirectionDegrees: 0,
    maximumDirectionDegrees: 360,
    roundDirectionToInteger: true,
});

/** Screen-space degrees: 0 right, 90 down, 180 left, 270 up. */
export function rollGaleForceDirectionDegrees(): number {
    const { minimumDirectionDegrees: min, maximumDirectionDegrees: max, roundDirectionToInteger } = GALE_FORCE_CONFIG;
    const direction = min + Math.random() * (max - min);
    return roundDirectionToInteger ? Math.floor(direction) : direction;
}
