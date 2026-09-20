import { FIRE_ART_DIRECTION } from "../config/FireArtDirectionDefinition";
import { TOP_DOWN_FIRE_VFX_DEFINITION } from "../config/TopDownFireVfxDefinition";
import {
    DIRECTIONAL_FIRE_PRESENTATION_CONTRACT,
    GROUND_FIRE_PRESENTATION_CONTRACT,
} from "../fire-vfx/FirePresentationContract";

export class TopDownFireVfxValidation {
    public static run(): void {
        const d = TOP_DOWN_FIRE_VFX_DEFINITION;
        const r = FIRE_ART_DIRECTION.rendering;

        const checks: readonly [string, boolean][] = [
            ["Ground footprint orientation", d.ground.footprintOriented && d.ground.orientationNeutralLocalShapes],
            ["Ground has no global screen-up grammar", !d.perspective.screenUpIsFlameDirection && !d.perspective.verticalBaseToTipGrammar && !d.ground.dominantGlobalDirection],
            ["Ground local turbulence contract", d.ground.localRadialTurbulence && d.ground.denseOverlappingClusters],
            ["Ground thermal nesting contract", d.ground.hotCentersInsideCoolerStructures && r.thermalNesting],
            ["Directional macro-flow contract", d.directional.sourceToTargetMacroFlow],
            ["Directional continuous-plume contract", d.directional.continuousBody && !d.directional.chainOfFlameSprites],
            ["Directional local turbulence contract", d.directional.irregularLateralTurbulence && d.directional.denseOverlappingHotRegions],
            ["Directional breakup contract", d.directional.progressiveEdgeBreakup && d.directional.progressiveEndBreakup],
            ["Shared crisp rendering contract", d.shared.hardAlpha && d.shared.flatColor && !d.shared.softGlow && !d.shared.featheredEdges && !d.shared.volumetricSmoke && r.pureTopDownPerspective],
            ["Legacy Wind-tongue model superseded", d.legacy.windTongueGroundModelSuperseded && d.legacy.rootedVerticalFlameGrammarSuperseded && !d.perspective.wholeSpriteWindLean],
            ["Presentation-only authority", d.shared.presentationOnly && GROUND_FIRE_PRESENTATION_CONTRACT.topDownVisualModel === d && DIRECTIONAL_FIRE_PRESENTATION_CONTRACT.topDownVisualModel === d],
        ];

        console.log("[F-4] REFERENCE-LOCKED TOP-DOWN FIRE CONTRACT");
        for (const [label, ok] of checks) console.log(`[F-4] ${label}: ${ok ? "PASS" : "FAIL"}`);
        const passed = checks.every(([, ok]) => ok);
        console.log(`[F-4] RESULT: ${passed ? "PASS" : "FAIL"}`);
        if (!passed) throw new Error("[F-4] Top-down Fire presentation contract validation failed.");
    }
}
