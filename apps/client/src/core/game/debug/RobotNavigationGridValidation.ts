import { RobotNavigationGrid } from "../navigation/RobotNavigationGrid";
/** Lightweight grid-contract regression. Geometry-specific coverage is inspected in debug mode. */
export function assertRobotNavigationGridValidation(): void {
    const grid = new RobotNavigationGrid(10, 20, 24, 3, 2);
    const check = (condition: boolean, message: string): void => { if (!condition) throw new Error(`RN-1: ${message}`); };
    check(grid.worldToCell(22, 32).x === 0, "world-to-cell conversion");
    check(grid.worldToCell(46, 32).x === 1, "cell boundary conversion");
    check(grid.cellToWorld(1, 0).x === 46, "cell-to-world conversion");
    check(!grid.isTraversable(-1, 0) && !grid.isTraversable(3, 0), "out-of-range blocking");
    grid.setBlocked(1, 0, true);
    check(!grid.isTraversable(1, 0) && grid.isTraversable(0, 0), "blocked-cell occupancy");
    check(grid.getBlockedCount() === 1 && grid.getTraversableCount() === 5, "occupancy counts");
}
