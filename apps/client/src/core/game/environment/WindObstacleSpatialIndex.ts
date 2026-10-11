import type { StaticObstacleDefinition } from "../config/ObstacleDefinition";

/** Broad-phase grid for immutable rigid static geometry. Exact collision is still
 * performed by LocalWindObstacleQuery; this class never decides a collision. */
export class WindObstacleSpatialIndex {
    private readonly cells = new Map<string, number[]>();
    private readonly queryMarks: number[] = [];
    private stamp = 0;
    private readonly cellSize = 128;
    public constructor(private readonly obstacles: readonly StaticObstacleDefinition[], private readonly padding: number) {
        obstacles.forEach((obstacle, index) => {
            let radiusX: number;
            let radiusY: number;
            if (obstacle.shape === "circle") {
                radiusX = radiusY = obstacle.radius + padding;
            } else if (obstacle.shape === "rectangle") {
                const c = Math.abs(Math.cos(obstacle.rotationRadians ?? 0));
                const s = Math.abs(Math.sin(obstacle.rotationRadians ?? 0));
                radiusX = c * obstacle.width * 0.5 + s * obstacle.height * 0.5 + padding;
                radiusY = s * obstacle.width * 0.5 + c * obstacle.height * 0.5 + padding;
            } else {
                radiusX = Math.max(...obstacle.points.map(p => Math.abs(p.x))) + padding;
                radiusY = Math.max(...obstacle.points.map(p => Math.abs(p.y))) + padding;
            }
            const minX = Math.floor((obstacle.positionX - radiusX) / this.cellSize);
            const maxX = Math.floor((obstacle.positionX + radiusX) / this.cellSize);
            const minY = Math.floor((obstacle.positionY - radiusY) / this.cellSize);
            const maxY = Math.floor((obstacle.positionY + radiusY) / this.cellSize);
            for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) {
                const key = `${x},${y}`;
                let entries = this.cells.get(key);
                if (!entries) { entries = []; this.cells.set(key, entries); }
                entries.push(index);
            }
        });
    }

    /** Uses a swept AABB to avoid missing thin diagonal or rotated obstacles. */
    public candidates(x0: number, y0: number, x1: number, y1: number): StaticObstacleDefinition[] {
        const minX = Math.floor(Math.min(x0, x1) / this.cellSize);
        const maxX = Math.floor(Math.max(x0, x1) / this.cellSize);
        const minY = Math.floor(Math.min(y0, y1) / this.cellSize);
        const maxY = Math.floor(Math.max(y0, y1) / this.cellSize);
        const stamp = ++this.stamp;
        const result: StaticObstacleDefinition[] = [];
        for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) {
            for (const index of this.cells.get(`${x},${y}`) ?? []) {
                if (this.queryMarks[index] === stamp) continue;
                this.queryMarks[index] = stamp;
                result.push(this.obstacles[index]);
            }
        }
        return result;
    }
}
