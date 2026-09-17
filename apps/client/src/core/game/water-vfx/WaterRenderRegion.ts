/**
 * Phase 8I-3 presentation-only Water render-region utilities.
 *
 * WaterField remains authoritative. These helpers partition the simulation
 * grid into fixed local render regions so production Water presentation never
 * needs a permanent full-world texture or full-world draw quad.
 */
export interface WaterRenderRegion {
    readonly key:
        string;

    readonly regionColumn:
        number;

    readonly regionRow:
        number;

    readonly minimumColumn:
        number;

    readonly minimumRow:
        number;

    readonly columnCount:
        number;

    readonly rowCount:
        number;

    readonly minimumWorldX:
        number;

    readonly minimumWorldY:
        number;
}

export class WaterRenderRegionBuilder {
    public static getKeyForCell(
        cellColumn:
            number,

        cellRow:
            number,

        regionSizeCells:
            number,
    ): string {
        const regionColumn =
            Math.floor(
                cellColumn /
                regionSizeCells,
            );

        const regionRow =
            Math.floor(
                cellRow /
                regionSizeCells,
            );

        return `${regionColumn},${regionRow}`;
    }

    public static buildForCell(
        cellColumn:
            number,

        cellRow:
            number,

        worldColumnCount:
            number,

        worldRowCount:
            number,

        regionSizeCells:
            number,

        cellSize:
            number,

        minimumWorldX:
            number,

        minimumWorldY:
            number,
    ): WaterRenderRegion {
        const regionColumn =
            Math.floor(
                cellColumn /
                regionSizeCells,
            );

        const regionRow =
            Math.floor(
                cellRow /
                regionSizeCells,
            );

        const minimumColumn =
            regionColumn *
            regionSizeCells;

        const minimumRow =
            regionRow *
            regionSizeCells;

        const columnCount =
            Math.min(
                regionSizeCells,
                worldColumnCount -
                    minimumColumn,
            );

        const rowCount =
            Math.min(
                regionSizeCells,
                worldRowCount -
                    minimumRow,
            );

        return {
            key:
                `${regionColumn},${regionRow}`,

            regionColumn,
            regionRow,
            minimumColumn,
            minimumRow,
            columnCount,
            rowCount,

            minimumWorldX:
                minimumWorldX +
                minimumColumn *
                    cellSize,

            minimumWorldY:
                minimumWorldY +
                minimumRow *
                    cellSize,
        };
    }
}
