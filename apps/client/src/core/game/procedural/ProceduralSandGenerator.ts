import { SeededRandom } from "../generation/SeededRandom";
import type { ProceduralSandConfig, ProceduralSandDensity } from "./ProceduralSandConfig";
import type { ProceduralSandLevelContext } from "./ProceduralSandLevelAdapter";
import { generateSandShape, type SandShape } from "./ProceduralSandShapeGenerator";
import { validateSandPlacement } from "./ProceduralSandPlacementValidator";

export interface SandGenerationResult { readonly patches: readonly SandShape[]; readonly attempts: number; readonly rejected: number; readonly coveragePercent: number; }
export function generateProceduralSand(context: ProceduralSandLevelContext, config: ProceduralSandConfig, density: ProceduralSandDensity, random: SeededRandom): SandGenerationResult {
    const target = context.playableArea * config.targetCoverage[density];
    const patches: SandShape[] = [];
    let area = 0, attempts = 0;
    const maxAttempts = 600;
    const maxPatches = 32;
    while (area < target && attempts < maxAttempts && patches.length < maxPatches) {
        attempts++;
        const center = { x: random.nextRange(context.bounds.minimumX,context.bounds.maximumX), y: random.nextRange(context.bounds.minimumY,context.bounds.maximumY) };
        const diameter = random.nextRange(config.minimumPatchDiameter, config.maximumPatchDiameter);
        const candidate = generateSandShape(random,center,diameter);
        if (!validateSandPlacement(candidate,context,patches,config.minimumPatchSeparation,config.spawnClearance,config.holeClearance)) continue;
        patches.push(candidate);
        area += candidate.area;
    }
    return { patches, attempts, rejected: attempts-patches.length, coveragePercent: 100*area/context.playableArea };
}
