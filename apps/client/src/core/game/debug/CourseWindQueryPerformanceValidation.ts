import type { LocalWindObstacleQuery } from "../environment/LocalWindObstacleQuery";

export interface CourseWindQueryPerformanceResult {
    readonly rays: number;
    readonly mismatches: number;
    readonly indexedMilliseconds: number;
    readonly exhaustiveMilliseconds: number;
}
/** Invoke in a diagnostic session with deterministic world-space segments. */
export function validateCourseWindQueryPerformance(
    query: LocalWindObstacleQuery,
    rays: readonly (readonly [number, number, number, number])[],
): CourseWindQueryPerformanceResult {
    let mismatches = 0;
    const indexed: boolean[] = [];
    const startIndexed = performance.now();
    for (const [x0,y0,x1,y1] of rays) indexed.push(query.segmentBlocked(x0,y0,x1,y1));
    const indexedMilliseconds = performance.now() - startIndexed;
    const startExhaustive = performance.now();
    rays.forEach(([x0,y0,x1,y1], i) => {
        if (query.segmentBlockedExhaustive(x0,y0,x1,y1) !== indexed[i]) mismatches++;
    });
    return { rays: rays.length, mismatches, indexedMilliseconds, exhaustiveMilliseconds: performance.now()-startExhaustive };
}
