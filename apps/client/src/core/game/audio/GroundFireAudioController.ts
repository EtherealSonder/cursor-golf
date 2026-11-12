import type { World } from "../world/World";
import type { AudioVoiceHandle } from "./AudioDefinition";
import { SpatialAudioManager } from "./SpatialAudioManager";
import { FIRE_AUDIO } from "./FireAudioDefinition";

interface Region { x: number; y: number; count: number; }
interface Emitter { position: { x: number; y: number }; voice: AudioVoiceHandle | null; }
/** One spatial loop per contiguous fire region, bounded by a shared voice budget. */
export class GroundFireAudioController {
    private readonly emitters: Emitter[] = [];
    private elapsed = FIRE_AUDIO.ground.updateSeconds;
    constructor(private readonly world: World, private readonly audio: SpatialAudioManager) {}
    public update(deltaTime: number): void {
        this.elapsed += Math.max(0, deltaTime);
        if (this.elapsed >= FIRE_AUDIO.ground.updateSeconds) {
            this.elapsed = 0;
            this.reconcile(this.findRegions());
        }
        for (const emitter of this.emitters) {
            if (!emitter.voice) emitter.voice = this.audio.playLoop("ground-fire", () => emitter.position, FIRE_AUDIO.ground.gain);
            emitter.voice?.update();
        }
    }
    private findRegions(): Region[] {
        const cells = this.world.getAudioFireCells();
        const byKey = new Map<string, typeof cells[number]>();
        for (const cell of cells) byKey.set(`${cell.getGridX()},${cell.getGridY()}`, cell);
        const visited = new Set<string>();
        const regions: Region[] = [];
        for (const cell of cells) {
            const key = `${cell.getGridX()},${cell.getGridY()}`;
            if (visited.has(key)) continue;
            visited.add(key);
            const queue = [cell];
            let sx = 0, sy = 0, count = 0;
            for (let i = 0; i < queue.length; i++) {
                const current = queue[i];
                sx += current.getWorldCenterX(); sy += current.getWorldCenterY(); count++;
                const x = current.getGridX(), y = current.getGridY();
                for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                    const neighborKey = `${x+dx},${y+dy}`;
                    if (visited.has(neighborKey)) continue;
                    const neighbor = byKey.get(neighborKey);
                    if (!neighbor) continue;
                    visited.add(neighborKey); queue.push(neighbor);
                }
            }
            if (count >= FIRE_AUDIO.ground.minimumCells) regions.push({ x: sx / count, y: sy / count, count });
        }
        return regions.sort((a,b) => b.count - a.count).slice(0, FIRE_AUDIO.ground.maximumEmitters);
    }
    private reconcile(regions: Region[]): void {
        // Greedy nearest-centroid matching preserves loops as the fire expands or moves.
        const remaining = [...this.emitters];
        const next: Emitter[] = [];
        for (const region of regions) {
            let nearest = -1, best = Infinity;
            for (let i = 0; i < remaining.length; i++) {
                const d = Math.hypot(region.x - remaining[i].position.x, region.y - remaining[i].position.y);
                if (d < best) { best = d; nearest = i; }
            }
            const emitter = nearest >= 0 ? remaining.splice(nearest, 1)[0] : { position: { x: region.x, y: region.y }, voice: null };
            emitter.position.x = region.x; emitter.position.y = region.y;
            next.push(emitter);
        }
        for (const emitter of remaining) emitter.voice?.stop();
        this.emitters.splice(0, this.emitters.length, ...next);
    }
    public dispose(): void { for (const emitter of this.emitters) emitter.voice?.stop(); this.emitters.length = 0; }
}
