export interface ScalarFieldActiveBoundsOptions {
    readonly columnCount: number;
    readonly rowCount: number;
    readonly minimumColumn: number;
    readonly maximumColumn: number;
    readonly minimumRow: number;
    readonly maximumRow: number;
    readonly isoLevel: number;
    readonly paddingCells: number;
    readonly sampleValueByIndex: (index: number) => number;
}

export interface ScalarFieldActiveBoundsResult {
    readonly minimumColumn: number;
    readonly maximumColumn: number;
    readonly minimumRow: number;
    readonly maximumRow: number;
    readonly candidateCells: number;
    readonly candidateSamples: number;
    readonly activeSamples: number;
    readonly hasActiveSamples: boolean;
}

/**
 * Presentation-only conservative active bounds for scalar contour extraction.
 *
 * The helper never mutates or owns simulation state. It scans each scalar
 * sample in the caller-provided candidate rectangle once, finds samples that
 * can contribute to the requested iso-surface, then expands the result by a
 * safety margin for Marching Squares neighbour access.
 */
export class ScalarFieldActiveBounds {
    public static find(
        options: ScalarFieldActiveBoundsOptions,
    ): ScalarFieldActiveBoundsResult {
        const minColumn = Math.max(
            0,
            Math.min(options.columnCount - 1, options.minimumColumn),
        );
        const maxColumn = Math.max(
            0,
            Math.min(options.columnCount - 1, options.maximumColumn),
        );
        const minRow = Math.max(
            0,
            Math.min(options.rowCount - 1, options.minimumRow),
        );
        const maxRow = Math.max(
            0,
            Math.min(options.rowCount - 1, options.maximumRow),
        );

        const candidateCells =
            Math.max(0, maxColumn - minColumn) *
            Math.max(0, maxRow - minRow);

        let activeMinimumColumn = maxColumn;
        let activeMaximumColumn = minColumn;
        let activeMinimumRow = maxRow;
        let activeMaximumRow = minRow;
        let candidateSamples = 0;
        let activeSamples = 0;

        for (let row = minRow; row <= maxRow; row += 1) {
            const rowOffset = row * options.columnCount;

            for (let column = minColumn; column <= maxColumn; column += 1) {
                candidateSamples += 1;

                const sampled =
                    options.sampleValueByIndex(
                        rowOffset + column,
                    );

                const value =
                    Number.isFinite(sampled)
                        ? sampled
                        : 0;

                if (value < options.isoLevel) {
                    continue;
                }

                activeSamples += 1;
                activeMinimumColumn =
                    Math.min(activeMinimumColumn, column);
                activeMaximumColumn =
                    Math.max(activeMaximumColumn, column);
                activeMinimumRow =
                    Math.min(activeMinimumRow, row);
                activeMaximumRow =
                    Math.max(activeMaximumRow, row);
            }
        }

        if (activeSamples === 0) {
            return {
                minimumColumn: minColumn,
                maximumColumn: minColumn,
                minimumRow: minRow,
                maximumRow: minRow,
                candidateCells,
                candidateSamples,
                activeSamples,
                hasActiveSamples: false,
            };
        }

        const padding =
            Math.max(
                1,
                Math.floor(options.paddingCells),
            );

        return {
            minimumColumn:
                Math.max(
                    minColumn,
                    activeMinimumColumn - padding,
                ),
            maximumColumn:
                Math.min(
                    maxColumn,
                    activeMaximumColumn + padding,
                ),
            minimumRow:
                Math.max(
                    minRow,
                    activeMinimumRow - padding,
                ),
            maximumRow:
                Math.min(
                    maxRow,
                    activeMaximumRow + padding,
                ),
            candidateCells,
            candidateSamples,
            activeSamples,
            hasActiveSamples: true,
        };
    }
}
