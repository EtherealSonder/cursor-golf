import type { WorldPosition } from "../level/LevelCoordinateTransform";
import { SeededRandom } from "../generation/SeededRandom";

export interface SandShape { readonly vertices: readonly WorldPosition[]; readonly center: WorldPosition; readonly width: number; readonly height: number; readonly area: number; }
export function polygonArea(vertices: readonly WorldPosition[]): number {
    let sum = 0;
    for (let i = 0; i < vertices.length; i++) { const a = vertices[i], b = vertices[(i + 1) % vertices.length]; sum += a.x * b.y - b.x * a.y; }
    return Math.abs(sum) * 0.5;
}
/** Low-frequency periodic radial harmonics produce rounded, star-shaped amoebas without self-intersections. */
export interface SandShapeOptions { readonly aspectMinimum: number; readonly aspectMaximum: number; readonly lobeMinimum: number; readonly lobeMaximum: number; readonly irregularity: number }
export function generateSandShape(random: SeededRandom, center: WorldPosition, diameter: number, options: SandShapeOptions = {
    aspectMinimum: 0.73, aspectMaximum: 1.25, lobeMinimum: 3, lobeMaximum: 6, irregularity: 1,
}): SandShape {
    const aspect = random.nextRange(options.aspectMinimum, options.aspectMaximum);
    const width = diameter * aspect, height = diameter / aspect;
    const rotation = random.nextRange(0, Math.PI * 2);
    const phaseA = random.nextRange(0, Math.PI * 2), phaseB = random.nextRange(0, Math.PI * 2);
    const phaseC = random.nextRange(0, Math.PI * 2);
    const lobes = random.nextInteger(options.lobeMinimum, options.lobeMaximum);
    const vertices: WorldPosition[] = [];
    for (let i = 0; i < 64; i++) {
        const t = i * Math.PI * 2 / 64;
        const radius = 1 + options.irregularity * (0.13 * Math.sin(lobes * t + phaseA) + 0.075 * Math.sin((lobes - 1) * t + phaseB) + 0.045 * Math.cos(2 * t + phaseC));
        const x = Math.cos(t) * width * 0.5 * radius, y = Math.sin(t) * height * 0.5 * radius;
        vertices.push({ x: center.x + x * Math.cos(rotation) - y * Math.sin(rotation), y: center.y + x * Math.sin(rotation) + y * Math.cos(rotation) });
    }
    return { center, width, height, vertices, area: polygonArea(vertices) };
}
