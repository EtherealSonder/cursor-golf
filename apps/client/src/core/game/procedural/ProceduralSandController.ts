import { SurfaceType } from "../surface/SurfaceType";
import type { SurfaceSystem } from "../surface/SurfaceSystem";
import { SeededRandom } from "../generation/SeededRandom";
import type { RuntimeLevelDefinition } from "../level/LevelRuntimeDefinition";
import { DEFAULT_PROCEDURAL_SAND_CONFIG, createProceduralSandSeed, type ProceduralSandConfig, type ProceduralSandDensity } from "./ProceduralSandConfig";
import { generateProceduralSand } from "./ProceduralSandGenerator";
import { polygonArea } from "./ProceduralSandShapeGenerator";
import { adaptProceduralSandLevel, type ProceduralSandLevelContext } from "./ProceduralSandLevelAdapter";

/** Phase 1 placeholder. Phase 2 will supply actual polygon footprints. */
export interface ProceduralSandPatch {
    readonly id: string;
    readonly vertices: readonly { readonly x: number; readonly y: number }[];
}

export class ProceduralSandController {
    public readonly context: ProceduralSandLevelContext;
    private readonly config: ProceduralSandConfig;
    private random: SeededRandom;
    private seed: number;
    private density: ProceduralSandDensity;
    private patches: ProceduralSandPatch[] = [];
    private destroyed = false;
    private generationCount = 1;

    constructor(level: RuntimeLevelDefinition, config: ProceduralSandConfig = DEFAULT_PROCEDURAL_SAND_CONFIG) {
        this.context = adaptProceduralSandLevel(level);
        this.config = config;
        this.seed = config.seed === undefined ? createProceduralSandSeed() : config.seed >>> 0;
        this.density = config.density;
        this.random = new SeededRandom(this.seed);
        this.generate();
        if (import.meta.env.DEV) console.info("[ProceduralSand:P2] Initialized", this.getDiagnostics());
    }

    public getPatches(): readonly ProceduralSandPatch[] { return this.patches; }
    public getDensity(): ProceduralSandDensity { return this.density; }

    /** Register identical polygon footprints used by the texture renderer. */
    public registerSurfaces(surfaceSystem: SurfaceSystem): void {
        surfaceSystem.clearProceduralPolygonZones();
        for (const patch of this.patches) surfaceSystem.addProceduralPolygonZone({ id: patch.id, surfaceType: SurfaceType.Sand, vertices: patch.vertices });
    }


    public getDiagnostics() {
        return {
            levelId: this.context.levelId,
            density: this.density,
            seed: this.seed,
            vertexCount: this.context.polygon.length,
            playableArea: this.context.playableArea,
            bounds: this.context.bounds,
            spawn: this.context.spawn,
            hole: this.context.hole,
            patchCount: this.patches.length,
            generationCount: this.generationCount,
            coveragePercent: this.patches.reduce((sum, patch) => sum + polygonArea(patch.vertices), 0) * 100 / this.context.playableArea,
        };
    }

    /** Phase 2 generator will consume this stream, without using Math.random(). */
    public nextRandom(): number {
        this.assertAlive();
        return this.random.next();
    }

    public regenerate(seed: number = createProceduralSandSeed(), density: ProceduralSandDensity = this.density): void {
        this.assertAlive();
        if (!Number.isFinite(seed)) throw new Error("[ProceduralSand] Seed must be finite");
        this.seed = seed >>> 0;
        this.density = density;
        this.random = new SeededRandom(this.seed);
        this.generate();
        this.generationCount++;
        if (import.meta.env.DEV) console.info("[ProceduralSand:P4] Regenerated", this.getDiagnostics());
    }

    /** Replace terrain while leaving the rest of the World untouched. */
    public regenerateLive(surfaceSystem: SurfaceSystem, render: (patches: readonly ProceduralSandPatch[]) => void,
        density: ProceduralSandDensity = this.density): void {
        this.regenerate(createProceduralSandSeed(), density);
        // Generation is complete before the previous surfaces or visuals are replaced.
        this.registerSurfaces(surfaceSystem);
        render(this.patches);
        if (import.meta.env.DEV) console.info("[ProceduralSand:P4] Live terrain replaced", this.getDiagnostics());
    }

    private generate(): void {
        const result = generateProceduralSand(this.context, this.config, this.density, this.random);
        this.patches = result.patches.map((patch, index) => ({ id: `sand-${this.seed}-${index}`, vertices: patch.vertices }));
        if (import.meta.env.DEV) console.info("[ProceduralSand:P2] Generation complete", { levelId: this.context.levelId, seed: this.seed, density: this.density, patchCount: this.patches.length, coveragePercent: result.coveragePercent, attempted: result.attempts, rejected: result.rejected });
    }

    public destroy(): void {
        if (this.destroyed) return;
        this.patches = [];
        this.destroyed = true;
    }

    private assertAlive(): void {
        if (this.destroyed) throw new Error("[ProceduralSand] Controller already destroyed");
    }
}
