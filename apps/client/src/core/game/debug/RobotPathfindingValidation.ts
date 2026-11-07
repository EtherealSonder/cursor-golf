import { RobotNavigationGrid } from "../navigation/RobotNavigationGrid";
import { RobotAStarPathfinder } from "../navigation/RobotAStarPathfinder";
/** Small deterministic RN-2 connectivity/corner regression suite. */
export function assertRobotPathfindingValidation(): void {
    const grid = new RobotNavigationGrid(0, 0, 24, 7, 7);
    const astar = new RobotAStarPathfinder(grid);
    const path = astar.findPath({ x: 0, y: 0 }, { x: 6, y: 6 });
    if (!path || path.length !== 7 || path[0].x !== 0 || path[path.length - 1].x !== 6) throw new Error("[RN-2] Open-grid route failed");
    grid.setBlocked(1, 0, true); grid.setBlocked(0, 1, true);
    if (astar.findPath({ x: 0, y: 0 }, { x: 6, y: 6 }) !== null) throw new Error("[RN-2] Diagonal corner cutting");
    grid.setBlocked(1, 0, false); grid.setBlocked(0, 1, false);
    for (let y = 0; y < 7; y++) grid.setBlocked(3, y, true);
    if (astar.findPath({ x: 0, y: 3 }, { x: 6, y: 3 }) !== null) throw new Error("[RN-2] Disconnected region accepted");
    grid.setBlocked(3, 3, false);
    if (!astar.findPath({ x: 0, y: 3 }, { x: 6, y: 3 })) throw new Error("[RN-2] Wall opening rejected");
}
