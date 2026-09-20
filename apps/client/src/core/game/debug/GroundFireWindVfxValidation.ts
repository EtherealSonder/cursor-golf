import {
    GROUND_FIRE_WIND_VFX_DEFINITION,
    getGroundFireWindBandName,
    getGroundFireWindVisualStrength,
} from "../config/GroundFireWindVfxDefinition";

export class GroundFireWindVfxValidation {
    public static run(): void {
        const d = GROUND_FIRE_WIND_VFX_DEFINITION;
        const b = d.bands;

        const checks: readonly [string, boolean][] = [
            [
                "Calm favors normal vocabulary",
                b.calm.normalMaskWeight > 0.90 &&
                b.calm.curvedMaskWeight === 0,
            ],
            [
                "Moderate introduces Wind tongues",
                b.moderate.narrowMaskWeight > b.calm.narrowMaskWeight &&
                b.moderate.curvedMaskWeight > 0,
            ],
            [
                "High favors Wind-safe vocabulary",
                b.high.narrowMaskWeight + b.high.curvedMaskWeight >
                b.high.normalMaskWeight,
            ],
            [
                "Very High/Extreme suppress upright vocabulary",
                b.veryHigh.normalMaskWeight <= 0.10 &&
                b.extreme.normalMaskWeight <= 0.05,
            ],
            [
                "Wind deformation progression",
                b.calm.stretch < b.high.stretch &&
                b.high.stretch < b.extreme.stretch &&
                getGroundFireWindVisualStrength(20) <
                getGroundFireWindVisualStrength(65) &&
                getGroundFireWindVisualStrength(65) <
                getGroundFireWindVisualStrength(90),
            ],
            [
                "Wind category mapping",
                getGroundFireWindBandName(20) === "calm" &&
                getGroundFireWindBandName(45) === "moderate" &&
                getGroundFireWindBandName(65) === "high" &&
                getGroundFireWindBandName(80) === "veryHigh" &&
                getGroundFireWindBandName(90) === "extreme",
            ],
            [
                "Root anchoring",
                d.rootAnchored === true &&
                d.translateGroundParticlesWithWind === false,
            ],
            [
                "No whole-sprite velocity rotation",
                d.orientGroundParticlesToVelocity === false,
            ],
            [
                "Presentation-only behaviour",
                d.accelerationPerKmh > 0 &&
                b.extreme.lateralSkew <= 0.30,
            ],
        ];

        console.log("[F-4] GROUND FIRE WIND-SAFE VOCABULARY - CORRECTED");
        for (const [label, ok] of checks) {
            console.log(`[F-4] ${label}: ${ok ? "PASS" : "FAIL"}`);
        }

        const passed = checks.every(([, ok]) => ok);
        console.log(`[F-4] RESULT: ${passed ? "PASS" : "FAIL"}`);

        if (!passed) {
            throw new Error(
                "[F-4] Corrected Ground Fire Wind VFX validation failed.",
            );
        }
    }
}
