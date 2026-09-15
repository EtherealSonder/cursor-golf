import type {
    WaterField,
} from "./WaterField";

import type {
    WaterObstacleShape,
} from "./WaterObstacleShape";

/**
 * Phase 8D-1 cached solid-occupancy representation for standing Water.
 *
 * This class deliberately does not alter WaterField or WaterFlowSolver yet.
 * Later 8D phases consume these queries to reject occupancy and flow.
 */
export class WaterObstacleField {

    private readonly blocked:
        Uint8Array;

    private readonly columnCount:
        number;

    private readonly rowCount:
        number;

    private readonly cellSize:
        number;

    private readonly minimumWorldX:
        number;

    private readonly minimumWorldY:
        number;

    public constructor(
        waterField:
            WaterField,
    ) {

        this.columnCount =
            waterField.getColumnCount();

        this.rowCount =
            waterField.getRowCount();

        this.cellSize =
            waterField
                .getDefinition()
                .cellSize;

        this.minimumWorldX =
            waterField.getMinimumWorldX();

        this.minimumWorldY =
            waterField.getMinimumWorldY();

        this.blocked =
            new Uint8Array(
                this.columnCount *
                this.rowCount,
            );
    }

    public clear():
        void {

        this.blocked.fill(0);
    }

    public getBlockedCellCount():
        number {

        let count = 0;

        for (
            let index = 0;
            index < this.blocked.length;
            index += 1
        ) {
            count +=
                this.blocked[index] !== 0
                    ? 1
                    : 0;
        }

        return count;
    }

    public isBlockedByIndex(
        index:
            number,
    ): boolean {

        if (
            index < 0 ||
            index >= this.blocked.length
        ) {
            return true;
        }

        return this.blocked[index] !== 0;
    }

    public isBlocked(
        gridX:
            number,

        gridY:
            number,
    ): boolean {

        const index =
            this.getIndex(
                gridX,
                gridY,
            );

        return index === null
            ? true
            : this.isBlockedByIndex(
                index,
            );
    }

    public canOccupy(
        gridX:
            number,

        gridY:
            number,
    ): boolean {

        return !this.isBlocked(
            gridX,
            gridY,
        );
    }

    /**
     * Initial flow-query contract for 8D-3.
     *
     * 8D-1 only exposes and validates this query. WaterFlowSolver does not
     * consume it yet.
     */
    public canFlowBetween(
        fromIndex:
            number,

        toIndex:
            number,
    ): boolean {

        if (
            fromIndex < 0 ||
            toIndex < 0 ||
            fromIndex >=
            this.blocked.length ||
            toIndex >=
            this.blocked.length
        ) {
            return false;
        }

        return (
            !this.isBlockedByIndex(
                fromIndex,
            ) &&
            !this.isBlockedByIndex(
                toIndex,
            )
        );
    }

    /**
     * Resolves a blocked target to the nearest free Water-grid cell.
     *
     * Search is bounded and deterministic. Cardinal/diagonal cells in each
     * square ring are visited in stable top-to-bottom, left-to-right order.
     * The requested cell itself is returned immediately when already free.
     */
    public findNearestOccupiableIndex(
        gridX:
            number,

        gridY:
            number,

        maximumSearchRadius =
            8,
    ): number | null {

        const originIndex =
            this.getIndex(
                gridX,
                gridY,
            );

        if (originIndex === null) {
            return null;
        }

        if (
            !this.isBlockedByIndex(
                originIndex,
            )
        ) {
            return originIndex;
        }

        const safeRadius =
            Math.max(
                0,
                Math.floor(
                    maximumSearchRadius,
                ),
            );

        for (
            let radius = 1;
            radius <= safeRadius;
            radius += 1
        ) {
            for (
                let offsetY = -radius;
                offsetY <= radius;
                offsetY += 1
            ) {
                for (
                    let offsetX = -radius;
                    offsetX <= radius;
                    offsetX += 1
                ) {
                    if (
                        Math.max(
                            Math.abs(offsetX),
                            Math.abs(offsetY),
                        ) !== radius
                    ) {
                        continue;
                    }

                    const candidateIndex =
                        this.getIndex(
                            gridX + offsetX,
                            gridY + offsetY,
                        );

                    if (
                        candidateIndex !== null &&
                        !this.isBlockedByIndex(
                            candidateIndex,
                        )
                    ) {
                        return candidateIndex;
                    }
                }
            }
        }

        return null;
    }

    public rasterizeShape(
        shape:
            WaterObstacleShape,
    ): void {

        if (shape.kind === "rectangle") {
            this.rasterizeRectangle(
                shape.centerX,
                shape.centerY,
                shape.width,
                shape.height,
            );
            return;
        }

        if (shape.kind === "orientedRectangle") {
            this.rasterizeOrientedRectangle(
                shape.centerX,
                shape.centerY,
                shape.width,
                shape.height,
                shape.rotationRadians,
            );
            return;
        }

        this.rasterizeCircle(
            shape.centerX,
            shape.centerY,
            shape.radius,
        );
    }

    public rasterizeRectangle(
        centerX:
            number,

        centerY:
            number,

        width:
            number,

        height:
            number,
    ): void {

        if (
            !Number.isFinite(centerX) ||
            !Number.isFinite(centerY) ||
            !Number.isFinite(width) ||
            !Number.isFinite(height) ||
            width <= 0 ||
            height <= 0
        ) {
            return;
        }

        const halfWidth =
            width * 0.5;

        const halfHeight =
            height * 0.5;

        this.forEachCandidateCell(
            centerX - halfWidth,
            centerY - halfHeight,
            centerX + halfWidth,
            centerY + halfHeight,
            (
                gridX,
                gridY,
                cellCenterX,
                cellCenterY,
            ): void => {

                const cellHalf =
                    this.cellSize * 0.5;

                const overlaps =
                    Math.abs(
                        cellCenterX -
                        centerX,
                    ) <=
                    halfWidth +
                    cellHalf &&
                    Math.abs(
                        cellCenterY -
                        centerY,
                    ) <=
                    halfHeight +
                    cellHalf;

                if (overlaps) {
                    this.markBlocked(
                        gridX,
                        gridY,
                    );
                }
            },
        );
    }

    public rasterizeOrientedRectangle(
        centerX: number,
        centerY: number,
        width: number,
        height: number,
        rotationRadians: number,
    ): void {
        if (
            !Number.isFinite(centerX) ||
            !Number.isFinite(centerY) ||
            !Number.isFinite(width) ||
            !Number.isFinite(height) ||
            !Number.isFinite(rotationRadians) ||
            width <= 0 ||
            height <= 0
        ) {
            return;
        }

        const halfWidth = width * 0.5;
        const halfHeight = height * 0.5;
        const cosine = Math.cos(rotationRadians);
        const sine = Math.sin(rotationRadians);
        const extentX = Math.abs(cosine) * halfWidth + Math.abs(sine) * halfHeight;
        const extentY = Math.abs(sine) * halfWidth + Math.abs(cosine) * halfHeight;
        const cellHalf = this.cellSize * 0.5;

        this.forEachCandidateCell(
            centerX - extentX,
            centerY - extentY,
            centerX + extentX,
            centerY + extentY,
            (_gridX, _gridY, cellCenterX, cellCenterY): void => {
                /*
                 * Conservative OBB-vs-cell test. Transform the Water cell centre
                 * into obstacle-local space and expand the OBB by the projected
                 * half extents of the axis-aligned Water cell.
                 */
                const dx = cellCenterX - centerX;
                const dy = cellCenterY - centerY;
                const localX = dx * cosine + dy * sine;
                const localY = -dx * sine + dy * cosine;
                const projectedCellX = cellHalf * (Math.abs(cosine) + Math.abs(sine));
                const projectedCellY = projectedCellX;

                if (
                    Math.abs(localX) <= halfWidth + projectedCellX &&
                    Math.abs(localY) <= halfHeight + projectedCellY
                ) {
                    this.markBlocked(_gridX, _gridY);
                }
            },
        );
    }

    public rasterizeCircle(
        centerX:
            number,

        centerY:
            number,

        radius:
            number,
    ): void {

        if (
            !Number.isFinite(centerX) ||
            !Number.isFinite(centerY) ||
            !Number.isFinite(radius) ||
            radius <= 0
        ) {
            return;
        }

        this.forEachCandidateCell(
            centerX - radius,
            centerY - radius,
            centerX + radius,
            centerY + radius,
            (
                gridX,
                gridY,
                cellCenterX,
                cellCenterY,
            ): void => {

                const cellHalf =
                    this.cellSize * 0.5;

                const nearestX =
                    Math.max(
                        cellCenterX -
                        cellHalf,
                        Math.min(
                            centerX,
                            cellCenterX +
                            cellHalf,
                        ),
                    );

                const nearestY =
                    Math.max(
                        cellCenterY -
                        cellHalf,
                        Math.min(
                            centerY,
                            cellCenterY +
                            cellHalf,
                        ),
                    );

                const dx =
                    centerX -
                    nearestX;

                const dy =
                    centerY -
                    nearestY;

                if (
                    dx * dx +
                    dy * dy <=
                    radius * radius
                ) {
                    this.markBlocked(
                        gridX,
                        gridY,
                    );
                }
            },
        );
    }

    private markBlocked(
        gridX:
            number,

        gridY:
            number,
    ): void {

        const index =
            this.getIndex(
                gridX,
                gridY,
            );

        if (index !== null) {
            this.blocked[index] = 1;
        }
    }

    private getIndex(
        gridX:
            number,

        gridY:
            number,
    ): number | null {

        if (
            gridX < 0 ||
            gridY < 0 ||
            gridX >=
            this.columnCount ||
            gridY >=
            this.rowCount
        ) {
            return null;
        }

        return (
            gridY *
            this.columnCount +
            gridX
        );
    }

    private forEachCandidateCell(
        minimumX:
            number,

        minimumY:
            number,

        maximumX:
            number,

        maximumY:
            number,

        visitor:
            (
                gridX: number,
                gridY: number,
                centerX: number,
                centerY: number,
            ) => void,
    ): void {

        const minimumGridX =
            Math.max(
                0,
                Math.floor(
                    (
                        minimumX -
                        this.minimumWorldX
                    ) /
                    this.cellSize,
                ) - 1,
            );

        const minimumGridY =
            Math.max(
                0,
                Math.floor(
                    (
                        minimumY -
                        this.minimumWorldY
                    ) /
                    this.cellSize,
                ) - 1,
            );

        const maximumGridX =
            Math.min(
                this.columnCount - 1,
                Math.floor(
                    (
                        maximumX -
                        this.minimumWorldX
                    ) /
                    this.cellSize,
                ) + 1,
            );

        const maximumGridY =
            Math.min(
                this.rowCount - 1,
                Math.floor(
                    (
                        maximumY -
                        this.minimumWorldY
                    ) /
                    this.cellSize,
                ) + 1,
            );

        for (
            let gridY =
                minimumGridY;
            gridY <=
            maximumGridY;
            gridY += 1
        ) {
            for (
                let gridX =
                    minimumGridX;
                gridX <=
                maximumGridX;
                gridX += 1
            ) {
                visitor(
                    gridX,
                    gridY,
                    this.minimumWorldX +
                    (
                        gridX + 0.5
                    ) *
                    this.cellSize,
                    this.minimumWorldY +
                    (
                        gridY + 0.5
                    ) *
                    this.cellSize,
                );
            }
        }
    }
}
