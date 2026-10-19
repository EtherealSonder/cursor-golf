import { WaterField } from "../environment/WaterField";
import { WaterConservationValidation } from "./WaterConservationValidation";
import { WaterGroundLifecycleValidation } from "./WaterGroundLifecycleValidation";

/** O2-B invariant and determinism checks. True pre/post equivalence requires a reference build. */
export class WaterSimulationEquivalenceValidation {
    public static run(): { passed: boolean; checks: readonly { name: string; passed: boolean; detail: string }[] } {
        const checks: { name: string; passed: boolean; detail: string }[] = [];
        const simulate = (): Float64Array => {
            const field = new WaterField();
            field.injectWaterWithMomentum(240, 240, 7, 100, 0);
            field.injectWater(256, 240, 3);
            for (let i = 0; i < 120; i += 1) field.update(1 / 60);
            const result = new Float64Array(field.getCellCount());
            for (let i = 0; i < result.length; i += 1) result[i] = field.getDepthByIndex(i);
            return result;
        };
        const first = simulate(), second = simulate();
        let maxDifference = 0;
        for (let i = 0; i < first.length; i += 1) maxDifference = Math.max(maxDifference, Math.abs(first[i] - second[i]));
        checks.push({ name: "Repeatable deterministic flow", passed: maxDifference <= 1e-7, detail: `maximumCellDifference=${maxDifference.toExponential(3)}` });
        const conservation = WaterConservationValidation.run();
        checks.push({ name: "Standing-water conservation", ...conservation });
        const lifecycle = WaterGroundLifecycleValidation.run();
        checks.push(...lifecycle.checks);
        const passed = checks.every(c => c.passed);
        console.group(`[O2-B VALIDATION] RESULT: ${passed ? "PASS" : "FAIL"}`);
        for (const c of checks) console.log(`[O2-B VALIDATION] ${c.name}: ${c.passed ? "PASS" : "FAIL"} — ${c.detail}`);
        console.info("[O2-B VALIDATION] Invariant/determinism tests only; pre-O2-B equivalence and full conservation with external sinks are NOT established.");
        console.groupEnd();
        return { passed, checks };
    }
}
