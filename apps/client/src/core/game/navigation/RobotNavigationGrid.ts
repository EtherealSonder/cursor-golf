/** RN-1 immutable, world-space occupancy raster. RN-2 will consume this for routing. */
export class RobotNavigationGrid {
    private readonly blocked: Uint8Array;
    public constructor(
        public readonly originX: number, public readonly originY: number,
        public readonly cellSize: number, public readonly columns: number, public readonly rows: number,
    ) { this.blocked = new Uint8Array(columns * rows); }
    public containsCell(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < this.columns && y < this.rows; }
    public worldToCell(x: number, y: number): { x: number; y: number } {
        return { x: Math.floor((x - this.originX) / this.cellSize), y: Math.floor((y - this.originY) / this.cellSize) };
    }
    public cellToWorld(x: number, y: number): { x: number; y: number } {
        return { x: this.originX + (x + 0.5) * this.cellSize, y: this.originY + (y + 0.5) * this.cellSize };
    }
    public setBlocked(x: number, y: number, blocked: boolean): void {
        if (this.containsCell(x, y)) this.blocked[y * this.columns + x] = blocked ? 1 : 0;
    }
    public isTraversable(x: number, y: number): boolean {
        return this.containsCell(x, y) && this.blocked[y * this.columns + x] === 0;
    }
    public isWorldTraversable(x: number, y: number): boolean {
        const cell = this.worldToCell(x, y); return this.isTraversable(cell.x, cell.y);
    }
    public getBlockedCount(): number { let n = 0; for (const value of this.blocked) n += value; return n; }
    public getTraversableCount(): number { return this.columns * this.rows - this.getBlockedCount(); }
}
