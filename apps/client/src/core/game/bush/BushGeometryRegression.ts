import { BushMovementController } from "./BushMovementController";
import { BushGeometry } from "./BushGeometry";
import { BushSpatialQueries } from "./BushSpatialQueries";

/** B2 geometry smoke tests, callable without a Pixi renderer. */
export function assertBushGeometryRegression(): void {
    const bush = new BushGeometry({ x: 500, y: 800 });
    const check = (ok: boolean, label: string): void => { if (!ok) throw new Error(`B2 bush geometry regression: ${label}`); };
    check(bush.contains({ x: 500, y: 800 }), "center inside");
    check(!bush.contains({ x: 0, y: 0 }), "distant point outside");
    check(bush.circleCoverage({ x: 500, y: 800 }, 8) > 0.8, "center ball covered");
    check(bush.circleCoverage({ x: 0, y: 0 }, 8) === 0, "outside ball uncovered");
    check(BushSpatialQueries.circleCoverage([bush, bush], { x: 500, y: 800 }, 8) <= 1, "union coverage bounded");
    const rotated = new BushGeometry({ x: 500, y: 800 }, 136, Math.PI / 3);
    check(rotated.contains({ x: 500, y: 800 }), "rotated center inside");
    check(BushSpatialQueries.nearby([bush], { x: 0, y: 0 }).length === 0, "broad phase rejects distant bush");
    const movement = new BushMovementController((center, radius) =>
        BushSpatialQueries.coverage([bush], center, radius).traversal);
    const centerResistance = movement.getAdditionalRollingDeceleration({ x: 500, y: 800 }, 10, 100);
    check(centerResistance > 0, "center has extra resistance");
    check(movement.getAdditionalRollingDeceleration({ x: 0, y: 0 }, 10, 100) === 0, "outside has no resistance");
    check(movement.getAdditionalRollingDeceleration({ x: 500, y: 800 }, 10, 100) === centerResistance, "resistance deterministic");
    check(movement.getAdditionalRollingDeceleration({ x: 500, y: 800 }, 10, 0) === 0, "zero base deceleration safe");
}
