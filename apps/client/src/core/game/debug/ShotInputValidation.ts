import { BASIC_CLUB_DEFINITION } from "../config/ClubDefinition";
import { Club } from "../entities/Club";
import { ShotPreparation } from "../shot/ShotPreparation";

interface ShotInputValidationRow {
    readonly dragDistancePx: number;
    readonly expectedPower: number;
    readonly actualPower: number;
    readonly retainedDragDistancePx: number;
    readonly result: "PASS" | "FAIL";
}

/**
 * Temporary 4B validation of the authoritative drag-to-power mapping.
 *
 * This uses ShotPreparation itself, rather than duplicating its formula,
 * so the console result verifies the same path used by gameplay.
 */
export class ShotInputValidation {
    public static validate(): boolean {
        const club = new Club(BASIC_CLUB_DEFINITION);
        const preparation = new ShotPreparation(club);
        const maximum = BASIC_CLUB_DEFINITION.maximumDragDistance;

        const samples = [
            { distance: 0, expected: 0 },
            { distance: 36, expected: 0.10 },
            { distance: 90, expected: 0.25 },
            { distance: 180, expected: 0.50 },
            { distance: 270, expected: 0.75 },
            { distance: 360, expected: 1.00 },
            { distance: 450, expected: 1.00 },
        ] as const;

        const rows: ShotInputValidationRow[] = samples.map(({ distance, expected }) => {
            preparation.updateDrag(distance, 0);
            const actual = preparation.getNormalizedPower();
            const retained = preparation.getDragDistance();
            const pass =
                Math.abs(actual - expected) <= 0.000001 &&
                Math.abs(retained - distance) <= 0.000001 &&
                actual >= 0 &&
                actual <= 1;

            return {
                dragDistancePx: distance,
                expectedPower: expected,
                actualPower: Number(actual.toFixed(4)),
                retainedDragDistancePx: Number(retained.toFixed(2)),
                result: pass ? "PASS" : "FAIL",
            };
        });

        const passed = rows.every((row) => row.result === "PASS");

        console.log("[4B] EXTENDED DRAG INPUT VALIDATION");
        console.log(`[4B] Full-power drag distance: ${maximum} px`);
        console.table(rows);
        console.log(`[4B] 360 px reaches exactly 100%: ${rows[5]?.result ?? "FAIL"}`);
        console.log(`[4B] Over-drag remains clamped to 100%: ${rows[6]?.result ?? "FAIL"}`);
        console.log(`[4B] Raw drag distance remains available beyond full power: ${rows[6]?.retainedDragDistancePx === 450 ? "PASS" : "FAIL"}`);
        console.log(`[4B] RESULT: ${passed ? "PASS" : "FAIL"}`);

        return passed;
    }
}
