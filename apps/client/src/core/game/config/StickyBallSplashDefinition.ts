/** Presentation-only adhesion splash. World-space dimensions are pixels. */
export const STICKY_BALL_SPLASH = Object.freeze({
    lifetimeSeconds: 0.30,
    dropletCount: 6,
    minimumRadius: 2.0,
    maximumRadius: 4.0,
    minimumDistance: 10,
    maximumDistance: 24,
    colors: [0xFF9D34, 0xF27C24, 0xD85C1D] as readonly number[],
    maximumActive: 28,
});
