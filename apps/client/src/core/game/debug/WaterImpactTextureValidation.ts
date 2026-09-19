import { WaterVfxTextureFactory } from "../water-vfx/WaterVfxTextureFactory";

/** Phase 8I-7C technical validation for generated/cached impact primitives. */
export class WaterImpactTextureValidation {
    public run(): void {
        console.log("[8I-7C] SHARED WATER IMPACT VISUAL PRIMITIVES");
        const results: Array<[string, boolean]> = [];
        const first = WaterVfxTextureFactory.getImpactTextureSet();
        const second = WaterVfxTextureFactory.getImpactTextureSet();

        results.push(["Texture set created", !!first]);
        results.push(["Splash-lobe variants available", first.splashLobes.length >= 3]);
        results.push(["Droplet variants available", first.roundDroplets.length >= 2 && first.teardropDroplets.length >= 2 && first.elongatedDroplets.length >= 2]);
        results.push(["Surface-disturbance variants available", first.surfaceDisturbances.length >= 2]);
        results.push(["Ripple variants available", first.ripples.length >= 2]);
        const all = [...first.splashLobes,...first.roundDroplets,...first.teardropDroplets,...first.elongatedDroplets,...first.surfaceDisturbances,...first.ripples];
        results.push(["Textures have valid dimensions", all.every((t) => t.width > 0 && t.height > 0)]);
        results.push(["Repeated requests reuse cached texture set", first === second]);
        results.push(["Repeated requests reuse texture objects", first.splashLobes[0] === second.splashLobes[0]]);

        for (const [name, pass] of results) {
            console.log(`[8I-7C] ${name}: ${pass ? "PASS" : "FAIL"}`);
        }
        const passed = results.every(([,pass]) => pass);
        console.log(`[8I-7C] RESULT: ${passed ? "PASS" : "FAIL"}`);
        if (!passed) throw new Error("[8I-7C] Water impact texture validation failed.");
    }
}
