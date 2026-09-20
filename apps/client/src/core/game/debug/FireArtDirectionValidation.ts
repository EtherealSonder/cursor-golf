import { FIRE_ART_DIRECTION } from "../config/FireArtDirectionDefinition";
import { DEFAULT_FIRE_PARTICLE_VFX_DEFINITION } from "../config/FireParticleVfxDefinition";
import {
    DIRECTIONAL_FIRE_PRESENTATION_CONTRACT,
    GROUND_FIRE_PRESENTATION_CONTRACT,
} from "../fire-vfx/FirePresentationContract";

export class FireArtDirectionValidation {
    public static run(): void {
        const p = FIRE_ART_DIRECTION.palette;
        const r = FIRE_ART_DIRECTION.rendering;
        const palette =
            p.hotCore === 0xfff1a6 && p.hot === 0xffd34e &&
            p.body === 0xff8435 && p.coolOuter === 0xe94b3c &&
            DEFAULT_FIRE_PARTICLE_VFX_DEFINITION.thermalRoles.hot.tint === p.hot &&
            DEFAULT_FIRE_PARTICLE_VFX_DEFINITION.thermalRoles.body.tint === p.body &&
            DEFAULT_FIRE_PARTICLE_VFX_DEFINITION.thermalRoles.cool.tint === p.coolOuter;
        const ground =
            GROUND_FIRE_PRESENTATION_CONTRACT.artDirection === FIRE_ART_DIRECTION;
        const directional =
            DIRECTIONAL_FIRE_PRESENTATION_CONTRACT.artDirection === FIRE_ART_DIRECTION;
        const rules =
            r.hardSilhouettes && r.crispAlpha && r.flatColors &&
            !r.blurredEdges && !r.softGlow && !r.volumetricFire &&
            r.limitedTransparency && r.organicCurves &&
            r.handDrawnIrregularity && r.clearLargeShapes && r.sparseSmallDetails;
        const checks: readonly [string, boolean][] = [
            ["Shared palette", palette],
            ["Ground Fire contract", ground],
            ["Directional Fire contract", directional],
            ["Rendering rules", rules],
            ["Presentation-only contract", ground && directional && rules],
        ];
        console.log("[F-3] SHARED FIRE ART-DIRECTION CONTRACT");
        for (const [label, ok] of checks) {
            console.log(`[F-3] ${label}: ${ok ? "PASS" : "FAIL"}`);
        }
        const passed = checks.every(([, ok]) => ok);
        console.log(`[F-3] RESULT: ${passed ? "PASS" : "FAIL"}`);
        if (!passed) throw new Error("[F-3] Shared Fire art-direction validation failed.");
    }
}
