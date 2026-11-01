import { SeededRandom } from "../generation/SeededRandom";
import type { ProceduralSandConfig, ProceduralSandDensity } from "./ProceduralSandConfig";
import type { ProceduralSandLevelContext } from "./ProceduralSandLevelAdapter";
import { generateSandShape, type SandShape } from "./ProceduralSandShapeGenerator";
import { validateSandPlacement } from "./ProceduralSandPlacementValidator";

export interface SandGenerationResult { readonly patches: readonly SandShape[]; readonly attempts: number; readonly rejected: number; readonly coveragePercent: number; }
export function generateProceduralSand(context: ProceduralSandLevelContext, config: ProceduralSandConfig, density: ProceduralSandDensity, random: SeededRandom): SandGenerationResult {
    const target = context.playableArea * config.targetCoverage[density];
    const shape = config.intensityShapePresets[density];
    const patches: SandShape[] = [];
    let area = 0;
    let attempts = 0;
    const maxAttempts = config.maxPlacementAttempts ?? 600;
    const maxPatches = config.maxPatchCount ?? 32;
    const dune = config.duneSurge === true;
    const secondaryStart = Math.floor(maxAttempts * (1 - (config.secondaryPassAttemptFraction ?? 0.58)));
    const span = Math.min(context.bounds.maximumX - context.bounds.minimumX, context.bounds.maximumY - context.bounds.minimumY);
    // Primary dunes use broad polygons. Secondary candidates progressively shrink
    // to occupy available gaps without bypassing the existing placement validator.
    while (area < target && attempts < maxAttempts && patches.length < maxPatches) {
        attempts++;
        const secondary = dune && attempts > secondaryStart;
        const center = {
            x: random.nextRange(context.bounds.minimumX, context.bounds.maximumX),
            y: random.nextRange(context.bounds.minimumY, context.bounds.maximumY),
        };
        const maximum = dune
            ? Math.max(55, Math.min(secondary ? 190 : 480, span * (secondary ? 0.28 : 0.65)))
            : shape.maximumDiameter;
        const minimum = dune
            ? Math.max(35, Math.min(secondary ? 65 : 150, maximum * 0.65))
            : shape.minimumDiameter;
        const diameter = random.nextRange(Math.min(minimum, maximum), maximum);
        const candidate = generateSandShape(random, center, diameter, shape);
        if (!validateSandPlacement(candidate, context, patches, config.minimumPatchSeparation, config.spawnClearance, config.holeClearance)) continue;
        patches.push(candidate);
        area += candidate.area;
    }
    return { patches, attempts, rejected: attempts - patches.length, coveragePercent: 100 * area / context.playableArea };
}
