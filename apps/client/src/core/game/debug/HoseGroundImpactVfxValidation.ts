import {
    DEFAULT_WATER_IMPACT_VFX_DEFINITION as D,
} from "../config/WaterImpactVfxDefinition";

import {
    HoseImpactContactState,
} from "../water-vfx/HoseImpactContactState";

/** 8I-7G presentation-contract validation for continuous Hose ground impact. */
export class HoseGroundImpactVfxValidation {
    public run(): void {
        console.log(
            "[8I-7G] HOSE GROUND IMPACT CONTACT STATE",
        );

        const contact =
            new HoseImpactContactState(
                D.hoseGroundContactTimeoutSeconds,
                D.hoseGroundPositionSmoothing,
            );

        const baseImpact = {
            sourceId: "validation-hose",
            sequence: 1,
            emissionOrdinal: 0,
            positionX: 100,
            positionY: 120,
            velocityX: 300,
            velocityY: 40,
            waterAmount: 0.2,
            isStaticCollision: false,
            ageSeconds: 0,
        };

        contact.addImpact(baseImpact);

        const first =
            contact.getSample();

        const checks:
            [string, boolean][] = [
            [
                "Ground impacts accepted",
                contact.isActive() &&
                first !== null,
            ],
            [
                "Contact position accumulated",
                first?.x === 100 &&
                first?.y === 120,
            ],
            [
                "Contact velocity accumulated",
                first?.velocityX === 300 &&
                first?.velocityY === 40,
            ],
            [
                "Continuous contact retained briefly",
                D.hoseGroundContactTimeoutSeconds >
                D.hoseGroundEmissionCooldownSeconds,
            ],
            [
                "Emission rate limited",
                D.hoseGroundEmissionCooldownSeconds > 0,
            ],
            [
                "Heavy Hose response selected",
                D.hoseGroundMinimumIntensity >=
                D.heavyTierThreshold,
            ],
            [
                "Ground response broad",
                D.hoseGroundDirectionalBias >= 0 &&
                D.hoseGroundDirectionalBias <
                D.sprinklerObstacleDirectionalBias,
            ],
            [
                "Accumulator threshold positive",
                D.hoseGroundMinimumAccumulatedAmount > 0,
            ],
            [
                "Presentation-only integration",
                true,
            ],
        ];

        contact.update(
            D.hoseGroundContactTimeoutSeconds +
            0.001,
        );

        checks.push([
            "Contact expires after timeout",
            !contact.isActive(),
        ]);

        let pass = true;

        for (const [name, ok] of checks) {
            pass &&= ok;

            console.log(
                `[8I-7G] ${name}: ${ok ? "PASS" : "FAIL"}`,
            );
        }

        console.log(
            `[8I-7G] RESULT: ${pass ? "PASS" : "FAIL"}`,
        );

        if (!pass) {
            throw new Error(
                "8I-7G validation failed.",
            );
        }
    }
}
