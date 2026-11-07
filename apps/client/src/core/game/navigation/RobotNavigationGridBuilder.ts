import type { CourseBoundaryDefinition } from "../config/CourseBoundaryDefinition";
import type { LevelNavigationBounds } from "../level/LevelNavigationBounds";
import type { RobotInteractionRegistry } from "../entities/robots/RobotInteractionRegistry";
import { RobotNavigationQuery } from "../entities/robots/RobotNavigationQuery";
import { ROBOT_NAVIGATION_GRID_DEFINITION } from "../config/RobotNavigationGridDefinition";
import { RobotNavigationGrid } from "./RobotNavigationGrid";

/** Rasterize clearance-aware STATIC geometry. Dynamic actors remain local avoidance's job. */
export class RobotNavigationGridBuilder {
    public static build(boundary: CourseBoundaryDefinition, bounds: LevelNavigationBounds | undefined,
        registry: RobotInteractionRegistry): RobotNavigationGrid {
        const d = ROBOT_NAVIGATION_GRID_DEFINITION;
        const cols = Math.ceil((boundary.maximumX - boundary.minimumX) / d.cellSize);
        const rows = Math.ceil((boundary.maximumY - boundary.minimumY) / d.cellSize);
        const grid = new RobotNavigationGrid(boundary.minimumX, boundary.minimumY, d.cellSize, cols, rows);
        const query = new RobotNavigationQuery(registry, boundary, undefined, bounds);
        const clearance = d.robotClearanceRadius + d.safetyPadding;
        // Conservatively include cell-centre clearance. RN-2 must also check traversed segments.
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
            const center = grid.cellToWorld(x, y);
            grid.setBlocked(x, y, !query.isPositionClearAgainstStatic(center.x, center.y, clearance));
        }
        return grid;
    }
}
