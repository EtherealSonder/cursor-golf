/**
 * Aggregate metrics for one cardinally-connected standing-Water body.
 *
 * area is expressed in world-pixel squared units.
 * volume is depth multiplied by cell area.
 */
export interface PuddleBodyMetrics {
    readonly cellCount: number;
    readonly area: number;
    readonly volume: number;
    readonly maximumDepth: number;
    readonly averageDepth: number;

    /**
     * Diagnostic work count for this query. Useful for proving that the query
     * traversed the connected body rather than scanning the complete field.
     */
    readonly visitedCellCount: number;

    /**
     * True only if maximumVisitedCells stopped traversal before completion.
     * Future hazard logic must never treat a truncated result as complete.
     */
    readonly isTruncated: boolean;
}
