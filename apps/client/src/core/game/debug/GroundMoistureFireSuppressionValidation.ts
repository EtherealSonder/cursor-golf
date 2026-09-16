import type {
    FireManager,
    FireMoistureResponse,
} from "../environment/FireManager";

interface MoistureCase {
    readonly label: string;
    readonly moisture: number;
}

/**
 * Phase 8F-6 deterministic validation for continuous ground-moisture Fire
 * suppression. It is read-only. The validator queries the same response
 * curves FireManager uses during ignition, spread, and established burning.
 */
export class GroundMoistureFireSuppressionValidation {
    private static readonly CASES:
        readonly MoistureCase[] = [
            { label: "Dry", moisture: 0.08 },
            { label: "Slightly damp", moisture: 0.30 },
            { label: "Moderately wet", moisture: 0.55 },
            { label: "Very wet", moisture: 0.80 },
            { label: "Saturated", moisture: 1.00 },
        ];

    public static run(
        fireManager: FireManager,
    ): void {
        console.log(
            "[8F-6] GROUND MOISTURE x FIRE SUPPRESSION",
        );

        const responses =
            this.CASES.map(
                (testCase) => ({
                    ...testCase,
                    response:
                        fireManager.getMoistureResponse(
                            testCase.moisture,
                            1,
                        ),
                }),
            );

        console.table(
            responses.map(
                ({ label, response }) => ({
                    state: label,
                    moisture:
                        response.moisture.toFixed(2),
                    dryness:
                        response.dryness.toFixed(3),
                    ignitionScore:
                        response.ignitionCombustibility.toFixed(3),
                    canIgnite:
                        response.canIgnite,
                    spreadMultiplier:
                        response.spreadMultiplier.toFixed(3),
                    combustionMultiplier:
                        response.combustionMultiplier.toFixed(3),
                }),
            ),
        );

        const ignitionMonotonic =
            this.isNonIncreasing(
                responses.map(
                    ({ response }) =>
                        response.ignitionCombustibility,
                ),
            );

        const spreadMonotonic =
            this.isNonIncreasing(
                responses.map(
                    ({ response }) =>
                        response.spreadMultiplier,
                ),
            );

        const combustionMonotonic =
            this.isNonIncreasing(
                responses.map(
                    ({ response }) =>
                        response.combustionMultiplier,
                ),
            );

        const dry =
            responses[0]?.response;

        const saturated =
            responses[responses.length - 1]
                ?.response;

        this.check(
            "Increasing moisture monotonically reduces ignition score",
            ignitionMonotonic,
        );

        this.check(
            "Increasing moisture monotonically reduces spread multiplier",
            spreadMonotonic,
        );

        this.check(
            "Increasing moisture monotonically reduces established-fire combustion",
            combustionMonotonic,
        );

        this.check(
            "Dry baseline Grass remains ignitable with full fuel",
            dry?.canIgnite === true,
        );

        this.check(
            "Saturated Grass rejects new ignition with full fuel",
            saturated?.canIgnite === false,
        );

        this.check(
            "Saturated ground retains a non-zero established-fire floor instead of deleting Fire",
            Boolean(
                saturated &&
                saturated.combustionMultiplier > 0 &&
                saturated.combustionMultiplier <
                (dry?.combustionMultiplier ?? 0),
            ),
        );

        this.check(
            "Saturated ground strongly suppresses spread",
            Boolean(
                saturated &&
                saturated.spreadMultiplier <= 0.05,
            ),
        );

        const slightlyDamp =
            responses[1]?.response;

        const moderatelyWet =
            responses[2]?.response;

        const veryWet =
            responses[3]?.response;

        this.check(
            "Moderately wet ground cuts spread to a clearly reduced level",
            Boolean(
                dry &&
                moderatelyWet &&
                moderatelyWet.spreadMultiplier <=
                dry.spreadMultiplier * 0.40,
            ),
        );

        this.check(
            "Very wet ground strongly suppresses spread before saturation",
            Boolean(
                veryWet &&
                veryWet.spreadMultiplier <= 0.10,
            ),
        );

        this.check(
            "Moderately wet ground noticeably weakens established combustion",
            Boolean(
                dry &&
                moderatelyWet &&
                moderatelyWet.combustionMultiplier <=
                dry.combustionMultiplier * 0.55,
            ),
        );

        this.check(
            "Very wet ground strongly weakens established combustion",
            Boolean(
                veryWet &&
                veryWet.combustionMultiplier <= 0.20,
            ),
        );

        this.check(
            "Moisture bands have meaningful gameplay separation",
            Boolean(
                slightlyDamp &&
                moderatelyWet &&
                veryWet &&
                slightlyDamp.spreadMultiplier >
                moderatelyWet.spreadMultiplier &&
                moderatelyWet.spreadMultiplier >
                veryWet.spreadMultiplier
            ),
        );

        console.log(
            "[8F-6] Ground Moisture x Fire Suppression: PASS",
        );
    }

    private static isNonIncreasing(
        values: readonly number[],
    ): boolean {
        for (let index = 1; index < values.length; index += 1) {
            const previous = values[index - 1];
            const current = values[index];

            if (
                previous === undefined ||
                current === undefined ||
                current > previous + 0.000000001
            ) {
                return false;
            }
        }

        return true;
    }

    private static check(
        label: string,
        passed: boolean,
    ): void {
        console.log(
            `[8F-6] ${label}: ${passed ? "PASS" : "FAIL"}`,
        );

        if (!passed) {
            throw new Error(
                `[8F-6] Validation failed: ${label}`,
            );
        }
    }
}
