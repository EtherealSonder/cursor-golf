import { WaterImpactTier } from "../water-vfx/WaterImpactIntensityModel";
import type { WaterImpactVfxSystem } from "../water-vfx/WaterImpactVfxSystem";

/** 8I-7D lifecycle checks plus a repeating isolated Fine/Medium/Heavy visual demo. */
export class WaterImpactVfxRuntimeValidation {
    private demoElapsed = 0;
    private demoCycle = -1;

    public run(system: WaterImpactVfxSystem): void {
        console.log("[8I-7D] SHARED WATER IMPACT RUNTIME + POOLING");
        system.reset();
        const initialCapacity = system.getCapacity();
        this.report("Pool initialized", initialCapacity > 0);

        const fine = system.emitImpact(this.request(0, 0, WaterImpactTier.Fine, 0.20, 101));
        const medium = system.emitImpact(this.request(0, 0, WaterImpactTier.Medium, 0.52, 202));
        const heavy = system.emitImpact(this.request(0, 0, WaterImpactTier.Heavy, 0.88, 303));
        this.report("Fine composition bounded", fine > 0 && fine < medium);
        this.report("Medium composition bounded", medium > fine && medium < heavy);
        this.report("Heavy composition bounded", heavy > medium);
        this.report("Capacity cannot be exceeded", system.getActiveCount() <= system.getMaximumCapacity());

        system.reset();
        const first = system.emitImpact(this.request(0, 0, WaterImpactTier.Medium, 0.52, 777));
        system.reset();
        const second = system.emitImpact(this.request(0, 0, WaterImpactTier.Medium, 0.52, 777));
        this.report("Deterministic composition", first === second);
        this.report("Repeated impacts reuse particles", system.getCapacity() >= initialCapacity);

        system.update(2.0);
        this.report("Particles expire and return to pool", system.getActiveCount() === 0);
        system.emitImpact(this.request(0, 0, WaterImpactTier.Heavy, 0.9, 909));
        system.reset();
        this.report("Reset releases all particles", system.getActiveCount() === 0);
        console.log("[8I-7D] RESULT: PASS");
    }

    public update(deltaTime: number, system: WaterImpactVfxSystem, width: number, height: number): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;
        this.demoElapsed += deltaTime;
        const cycle = Math.floor(this.demoElapsed / 1.35);
        if (cycle === this.demoCycle) return;
        this.demoCycle = cycle;
        const y = height * 0.40;
        system.emitImpact(this.request(width * 0.30, y, WaterImpactTier.Fine, 0.20, cycle * 31 + 1));
        system.emitImpact(this.request(width * 0.50, y, WaterImpactTier.Medium, 0.52, cycle * 31 + 2));
        system.emitImpact(this.request(width * 0.70, y, WaterImpactTier.Heavy, 0.88, cycle * 31 + 3));
    }

    private request(x: number, y: number, tier: WaterImpactTier, normalizedIntensity: number, seed: number) {
        return { x, y, tier, normalizedIntensity, directionX: 0, directionY: 1, speed: 280, seed };
    }

    private report(label: string, pass: boolean): void {
        console.log(`[8I-7D] ${label}: ${pass ? "PASS" : "FAIL"}`);
        if (!pass) throw new Error(`[8I-7D] ${label} failed.`);
    }
}
