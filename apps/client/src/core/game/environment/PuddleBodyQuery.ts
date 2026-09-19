import {
    DEFAULT_PUDDLE_BODY_DEFINITION,
    validatePuddleBodyDefinition,
} from "../config/PuddleBodyDefinition";

import type {
    PuddleBodyDefinition,
} from "../config/PuddleBodyDefinition";

import type {
    PuddleBodyMetrics,
} from "./PuddleBodyMetrics";

import type {
    WaterField,
} from "./WaterField";

/**
 * On-demand connected standing-Water body query.
 *
 * Group 3 intentionally does not run this from every Ball physics substep.
 * The reusable generation-stamped visited buffer avoids clearing or allocating
 * a full-field visited set for every query.
 */
export class PuddleBodyQuery {
    private readonly visitedGeneration: Uint32Array;
    private generation = 0;

    private readonly queue: Int32Array;

    constructor(
        private readonly waterField: WaterField,
        private readonly definition:
            PuddleBodyDefinition =
            DEFAULT_PUDDLE_BODY_DEFINITION,
    ) {
        validatePuddleBodyDefinition(definition);

        this.visitedGeneration =
            new Uint32Array(
                waterField.getCellCount(),
            );

        this.queue =
            new Int32Array(
                Math.min(
                    waterField.getCellCount(),
                    definition.maximumVisitedCells,
                ),
            );
    }

    public queryAtWorldPosition(
        worldX: number,
        worldY: number,
    ): PuddleBodyMetrics | null {
        const startIndex =
            this.waterField
                .getGridIndexAtWorldPosition(
                    worldX,
                    worldY,
                );

        if (startIndex === null) {
            return null;
        }

        return this.queryAtIndex(
            startIndex,
        );
    }

    public queryAtIndex(
        startIndex: number,
    ): PuddleBodyMetrics | null {
        if (
            !Number.isInteger(startIndex) ||
            startIndex < 0 ||
            startIndex >=
                this.waterField.getCellCount()
        ) {
            return null;
        }

        if (
            this.waterField.getDepthByIndex(
                startIndex,
            ) <
            this.definition.minimumConnectedDepth
        ) {
            return null;
        }

        const generation =
            this.beginGeneration();

        const columnCount =
            this.waterField.getColumnCount();

        const rowCount =
            this.waterField.getRowCount();

        let queueRead = 0;
        let queueWrite = 0;

        this.queue[queueWrite] =
            startIndex;
        queueWrite += 1;

        this.visitedGeneration[
            startIndex
        ] = generation;

        let cellCount = 0;
        let totalDepth = 0;
        let maximumDepth = 0;
        let visitedCellCount = 0;
        let isTruncated = false;

        while (
            queueRead < queueWrite
        ) {
            const index =
                this.queue[queueRead];

            queueRead += 1;
            visitedCellCount += 1;

            const depth =
                this.waterField
                    .getDepthByIndex(
                        index,
                    );

            if (
                depth <
                this.definition
                    .minimumConnectedDepth
            ) {
                continue;
            }

            cellCount += 1;
            totalDepth += depth;
            maximumDepth =
                Math.max(
                    maximumDepth,
                    depth,
                );

            const gridX =
                index %
                columnCount;

            const gridY =
                Math.floor(
                    index /
                    columnCount,
                );

            const neighbors = [
                gridX > 0
                    ? index - 1
                    : -1,
                gridX + 1 < columnCount
                    ? index + 1
                    : -1,
                gridY > 0
                    ? index - columnCount
                    : -1,
                gridY + 1 < rowCount
                    ? index + columnCount
                    : -1,
            ];

            for (
                const neighborIndex of
                neighbors
            ) {
                if (
                    neighborIndex < 0 ||
                    this.visitedGeneration[
                        neighborIndex
                    ] === generation
                ) {
                    continue;
                }

                this.visitedGeneration[
                    neighborIndex
                ] = generation;

                if (
                    this.waterField
                        .getDepthByIndex(
                            neighborIndex,
                        ) <
                    this.definition
                        .minimumConnectedDepth
                ) {
                    continue;
                }

                if (
                    queueWrite >=
                    this.queue.length
                ) {
                    isTruncated = true;
                    continue;
                }

                this.queue[queueWrite] =
                    neighborIndex;

                queueWrite += 1;
            }
        }

        if (cellCount <= 0) {
            return null;
        }

        const cellSize =
            this.waterField
                .getDefinition()
                .cellSize;

        const cellArea =
            cellSize *
            cellSize;

        return {
            cellCount,
            area:
                cellCount *
                cellArea,
            volume:
                totalDepth *
                cellArea,
            maximumDepth,
            averageDepth:
                totalDepth /
                cellCount,
            visitedCellCount,
            isTruncated,
        };
    }

    private beginGeneration(): number {
        this.generation += 1;

        if (
            this.generation >=
            0xffffffff
        ) {
            this.visitedGeneration.fill(
                0,
            );

            this.generation = 1;
        }

        return this.generation;
    }
}
