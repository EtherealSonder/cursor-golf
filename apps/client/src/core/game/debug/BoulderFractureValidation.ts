import { DEFAULT_BOULDER_FRACTURE_DEFINITION as D } from "../config/BoulderFractureDefinition";

export class BoulderFractureValidation {
    public static validate(): void {
        if (D.minimumFragmentCount !== 5 || D.maximumFragmentCount !== 6) {
            throw new Error("[R-ROCK-5] Boulder fracture must create 5 to 6 fragments.");
        }
        if (!(D.minimumFragmentRadius >= 11 && D.maximumFragmentRadius <= 16)) {
            throw new Error("[R-ROCK-5] Fragments must stay inside the Small Rock radius range.");
        }
        if (!(D.spawnClearance > 0 &&
              D.minimumRadialImpulse > 0 &&
              D.maximumRadialImpulse >= D.minimumRadialImpulse)) {
            throw new Error("[R-ROCK-5] Invalid fracture spawn/impulse tuning.");
        }
        if (!(D.maximumTangentialImpulseFraction >= 0 &&
              D.maximumTangentialImpulseFraction < 1 &&
              D.impulseLeverArmFraction > 0)) {
            throw new Error("[R-ROCK-5] Invalid tangential/angular fracture tuning.");
        }
    }
}
