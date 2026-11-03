/** WM-7F: fixed-cost, presentation-only electric motes. */
export const OVERDRIVE_VFX = Object.freeze({
    capacity: 120, perSourceCap: 8, cullMargin: 40, maxDelta: 1 / 20,
    minLife: 0.45, maxLife: 0.9, minRise: 25, maxRise: 55,
    minSize: 2, maxSize: 4, primary: 0x34dfff, highlight: 0xb8f6ff,
    emissionRate: 6,
});
export type OverdriveSourceKind = "robot" | "fan" | "paddle" | "rotator" | "radialBumper" | "directionalBumper" | "conveyor";
