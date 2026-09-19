import {
    Graphics,
} from "pixi.js";

import type {
    StandingWaterPresentationDefinition,
} from "../config/WaterPresentationDefinition";

import type {
    StandingWaterContour,
} from "./StandingWaterContourBuilder";

interface ReflectionPoint {
    readonly x: number;
    readonly y: number;
}

interface ReflectionMark {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly rotation: number;
    invalidRefreshes: number;
}

interface PuddleReflectionState {
    readonly id: number;
    centroidX: number;
    centroidY: number;
    area: number;
    marks: ReflectionMark[];
    matchedThisRefresh: boolean;
    unmatchedRefreshes: number;
    displayedMarkCount: number;
}

/**
 * 8I-8C.1 persistent illustrated reflection decals.
 *
 * Marks are filled pale-cyan ovals anchored in world space. Existing valid
 * marks survive ordinary contour growth/shrinkage. New marks are only added
 * when the connected puddle's area tier requires them.
 */
export class StandingWaterReflectionRenderer {
    private readonly states:
        PuddleReflectionState[] =
        [];

    private nextStateId = 1;

    public clear(): void {
        this.states.length = 0;
        this.nextStateId = 1;
    }

    public draw(
        graphics: Graphics,
        contours: readonly StandingWaterContour[],
        definition: StandingWaterPresentationDefinition,
    ): void {
        if (!definition.reflectionsEnabled) {
            this.clear();
            return;
        }

        for (
            let stateIndex = 0;
            stateIndex < this.states.length;
            stateIndex += 1
        ) {
            this.states[stateIndex]
                .matchedThisRefresh = false;
        }

        for (
            let contourIndex = 0;
            contourIndex < contours.length;
            contourIndex += 1
        ) {
            const contour =
                contours[contourIndex];

            const centroid =
                this.getCentroid(
                    contour.points,
                );

            let state =
                this.findBestState(
                    centroid,
                    contour,
                    definition,
                );

            if (state === null) {
                state = {
                    id: this.nextStateId,
                    centroidX: centroid.x,
                    centroidY: centroid.y,
                    area: contour.area,
                    marks: [],
                    matchedThisRefresh: true,
                    unmatchedRefreshes: 0,
                    displayedMarkCount: 0,
                };

                this.nextStateId += 1;
                this.states.push(state);
            }

            state.matchedThisRefresh = true;
            state.unmatchedRefreshes = 0;
            state.centroidX = centroid.x;
            state.centroidY = centroid.y;
            state.area = contour.area;

            /*
             * Preserve world-space anchors whenever they remain safely inside
             * the current Water contour. This is the key temporal-coherence
             * rule for 8I-8C.1.
             */
            state.marks =
                state.marks.filter((mark) => {
                    if (this.isMarkValid(mark, contour.points, definition)) {
                        mark.invalidRefreshes = 0;
                        return true;
                    }
                    mark.invalidRefreshes += 1;
                    return mark.invalidRefreshes <=
                        definition.reflectionMarkInvalidRetentionRefreshes;
                });

            const requiredCount =
                this.getRequiredMarkCountWithHysteresis(
                    contour.area,
                    state.displayedMarkCount,
                    definition,
                );
            state.displayedMarkCount = requiredCount;

            /*
             * Shrinking to a lower area tier removes only excess marks. Marks
             * that remain valid keep their exact world-space positions.
             */
            while (
                state.marks.length >
                requiredCount
            ) {
                state.marks.pop();
            }

            /*
             * Growth adds new marks without regenerating existing ones.
             */
            this.addMarksUntilCount(
                state,
                contour,
                requiredCount,
                definition,
            );

            this.drawMarks(
                graphics,
                state.marks,
                definition,
            );
        }

        /*
         * A disconnected puddle that vanished this refresh no longer owns
         * reflection state. Ordinary contour changes do not reach this path
         * because region matching tolerates centroid movement.
         */
        for (
            let stateIndex =
                this.states.length - 1;
            stateIndex >= 0;
            stateIndex -= 1
        ) {
            const state = this.states[stateIndex];
            if (!state.matchedThisRefresh) {
                state.unmatchedRefreshes += 1;
                if (state.unmatchedRefreshes >
                    definition.reflectionStateRetentionRefreshes) {
                    this.states.splice(stateIndex, 1);
                }
            }
        }
    }

    private getRequiredMarkCount(
        area: number,
        definition: StandingWaterPresentationDefinition,
    ): number {
        if (
            area <
            definition.reflectionMinimumArea
        ) {
            return 0;
        }

        if (
            area <
            definition.reflectionMediumArea
        ) {
            return Math.min(
                1,
                definition.reflectionMaximumMarks,
            );
        }

        if (
            area <
            definition.reflectionLargeArea
        ) {
            return Math.min(
                2,
                definition.reflectionMaximumMarks,
            );
        }

        if (
            area <
            definition.reflectionVeryLargeArea
        ) {
            return Math.min(
                3,
                definition.reflectionMaximumMarks,
            );
        }

        return Math.min(
            4,
            definition.reflectionMaximumMarks,
        );
    }

    private getRequiredMarkCountWithHysteresis(
        area: number,
        previousCount: number,
        definition: StandingWaterPresentationDefinition,
    ): number {
        const rising = this.getRequiredMarkCount(area, definition);
        if (rising >= previousCount) return rising;

        const exitScale = definition.reflectionTierExitScale;
        if (previousCount >= 4 &&
            area >= definition.reflectionVeryLargeArea * exitScale) return 4;
        if (previousCount >= 3 &&
            area >= definition.reflectionLargeArea * exitScale) return Math.min(3, definition.reflectionMaximumMarks);
        if (previousCount >= 2 &&
            area >= definition.reflectionMediumArea * exitScale) return Math.min(2, definition.reflectionMaximumMarks);
        if (previousCount >= 1 &&
            area >= definition.reflectionMinimumArea * exitScale) return Math.min(1, definition.reflectionMaximumMarks);
        return rising;
    }

    private findBestState(
        centroid: ReflectionPoint,
        contour: StandingWaterContour,
        definition: StandingWaterPresentationDefinition,
    ): PuddleReflectionState | null {
        let best:
            PuddleReflectionState | null =
            null;

        let bestDistanceSquared =
            Number.POSITIVE_INFINITY;

        const maximumDistanceSquared =
            definition
                .reflectionRegionMatchDistance *
            definition
                .reflectionRegionMatchDistance;

        for (
            let index = 0;
            index < this.states.length;
            index += 1
        ) {
            const state =
                this.states[index];

            if (state.matchedThisRefresh) {
                continue;
            }

            /*
             * Existing mark containment is a stronger identity signal than
             * centroid distance when a puddle grows asymmetrically.
             */
            let retainedMarkInside = false;

            for (
                let markIndex = 0;
                markIndex < state.marks.length;
                markIndex += 1
            ) {
                if (
                    this.isPointInside(
                        state.marks[markIndex].x,
                        state.marks[markIndex].y,
                        contour.points,
                    )
                ) {
                    retainedMarkInside = true;
                    break;
                }
            }

            const dx =
                centroid.x -
                state.centroidX;
            const dy =
                centroid.y -
                state.centroidY;
            const distanceSquared =
                dx * dx +
                dy * dy;

            if (
                !retainedMarkInside &&
                distanceSquared >
                maximumDistanceSquared
            ) {
                continue;
            }

            const score =
                retainedMarkInside
                    ? distanceSquared * 0.25
                    : distanceSquared;

            if (
                score <
                bestDistanceSquared
            ) {
                bestDistanceSquared =
                    score;
                best = state;
            }
        }

        return best;
    }

    private addMarksUntilCount(
        state: PuddleReflectionState,
        contour: StandingWaterContour,
        requiredCount: number,
        definition: StandingWaterPresentationDefinition,
    ): void {
        if (
            state.marks.length >=
            requiredCount
        ) {
            return;
        }

        const bounds =
            this.getBounds(
                contour.points,
            );

        const width =
            Math.max(
                1,
                bounds.maximumX -
                bounds.minimumX,
            );
        const height =
            Math.max(
                1,
                bounds.maximumY -
                bounds.minimumY,
            );

        /*
         * The persistent state id is stable for the lifetime of this puddle.
         * Candidate positions therefore do not change merely because contour
         * area, bounds, point count, or centroid changes.
         */
        const seed =
            state.id * 19.371;

        let candidateIndex = 0;
        const maximumCandidates = 96;

        while (
            state.marks.length <
            requiredCount &&
            candidateIndex <
            maximumCandidates
        ) {
            const u =
                this.hash01(
                    seed +
                    candidateIndex * 3.17,
                );
            const v =
                this.hash01(
                    seed +
                    candidateIndex * 5.91 +
                    7.4,
                );

            /*
             * Candidate coordinates use the current contour only when a new
             * decal is first created. Once accepted, its world position is
             * stored permanently in ReflectionMark.
             */
            const x =
                bounds.minimumX +
                width *
                (0.18 + u * 0.64);
            const y =
                bounds.minimumY +
                height *
                (0.18 + v * 0.64);

            const markWidth =
                definition
                    .reflectionMinimumWidth +
                this.hash01(
                    seed +
                    candidateIndex * 2.31 +
                    3.8,
                ) *
                (
                    definition
                        .reflectionMaximumWidth -
                    definition
                        .reflectionMinimumWidth
                );

            const markHeight =
                definition
                    .reflectionMinimumHeight +
                this.hash01(
                    seed +
                    candidateIndex * 4.27 +
                    12.1,
                ) *
                (
                    definition
                        .reflectionMaximumHeight -
                    definition
                        .reflectionMinimumHeight
                );

            const rotation =
                (
                    this.hash01(
                        seed +
                        candidateIndex * 8.17 +
                        1.9,
                    ) -
                    0.5
                ) *
                0.28;

            const mark: ReflectionMark = {
                x,
                y,
                width: markWidth,
                height: markHeight,
                rotation,
                invalidRefreshes: 0,
            };

            if (
                this.isMarkValid(
                    mark,
                    contour.points,
                    definition,
                ) &&
                this.isFarEnoughFromMarks(
                    mark,
                    state.marks,
                    definition
                        .reflectionMinimumSpacing,
                )
            ) {
                state.marks.push(mark);
            }

            candidateIndex += 1;
        }
    }

    private isMarkValid(
        mark: ReflectionMark,
        contourPoints:
            readonly ReflectionPoint[],
        definition: StandingWaterPresentationDefinition,
    ): boolean {
        const halfWidth =
            mark.width * 0.5;
        const halfHeight =
            mark.height * 0.5;

        const clearance =
            definition
                .reflectionEdgeClearance;

        const radiusX =
            halfWidth +
            clearance;
        const radiusY =
            halfHeight +
            clearance;

        const diagonalX =
            radiusX * 0.70710678;
        const diagonalY =
            radiusY * 0.70710678;

        const offsets = [
            [0, 0],
            [radiusX, 0],
            [-radiusX, 0],
            [0, radiusY],
            [0, -radiusY],
            [diagonalX, diagonalY],
            [-diagonalX, diagonalY],
            [diagonalX, -diagonalY],
            [-diagonalX, -diagonalY],
        ];

        for (
            let index = 0;
            index < offsets.length;
            index += 1
        ) {
            if (
                !this.isPointInside(
                    mark.x +
                    offsets[index][0],
                    mark.y +
                    offsets[index][1],
                    contourPoints,
                )
            ) {
                return false;
            }
        }

        return true;
    }

    private isFarEnoughFromMarks(
        candidate: ReflectionMark,
        marks: readonly ReflectionMark[],
        minimumSpacing: number,
    ): boolean {
        const minimumDistanceSquared =
            minimumSpacing *
            minimumSpacing;

        for (
            let index = 0;
            index < marks.length;
            index += 1
        ) {
            const dx =
                candidate.x -
                marks[index].x;
            const dy =
                candidate.y -
                marks[index].y;

            if (
                dx * dx +
                dy * dy <
                minimumDistanceSquared
            ) {
                return false;
            }
        }

        return true;
    }

    private drawMarks(
        graphics: Graphics,
        marks: readonly ReflectionMark[],
        definition: StandingWaterPresentationDefinition,
    ): void {
        for (
            let index = 0;
            index < marks.length;
            index += 1
        ) {
            const mark =
                marks[index];

            /*
             * Filled oval only. No stroke, streak, curve, dash field, texture,
             * particle effect, or animation.
             */
            graphics
                .ellipse(
                    mark.x,
                    mark.y,
                    mark.width * 0.5,
                    mark.height * 0.5,
                )
                .fill({
                    color:
                        definition
                            .reflectionColor,
                    alpha:
                        definition
                            .reflectionAlpha,
                });
        }
    }

    private getCentroid(
        points: readonly ReflectionPoint[],
    ): ReflectionPoint {
        let x = 0;
        let y = 0;

        for (
            let index = 0;
            index < points.length;
            index += 1
        ) {
            x += points[index].x;
            y += points[index].y;
        }

        return {
            x: x / points.length,
            y: y / points.length,
        };
    }

    private getBounds(
        points: readonly ReflectionPoint[],
    ): {
        readonly minimumX: number;
        readonly maximumX: number;
        readonly minimumY: number;
        readonly maximumY: number;
    } {
        let minimumX =
            Number.POSITIVE_INFINITY;
        let maximumX =
            Number.NEGATIVE_INFINITY;
        let minimumY =
            Number.POSITIVE_INFINITY;
        let maximumY =
            Number.NEGATIVE_INFINITY;

        for (
            let index = 0;
            index < points.length;
            index += 1
        ) {
            minimumX =
                Math.min(
                    minimumX,
                    points[index].x,
                );
            maximumX =
                Math.max(
                    maximumX,
                    points[index].x,
                );
            minimumY =
                Math.min(
                    minimumY,
                    points[index].y,
                );
            maximumY =
                Math.max(
                    maximumY,
                    points[index].y,
                );
        }

        return {
            minimumX,
            maximumX,
            minimumY,
            maximumY,
        };
    }

    private isPointInside(
        x: number,
        y: number,
        points: readonly ReflectionPoint[],
    ): boolean {
        let inside = false;

        for (
            let currentIndex = 0,
            previousIndex =
                points.length - 1;
            currentIndex < points.length;
            previousIndex = currentIndex,
            currentIndex += 1
        ) {
            const current =
                points[currentIndex];
            const previous =
                points[previousIndex];

            const crosses =
                (current.y > y) !==
                (previous.y > y) &&
                x <
                (
                    (previous.x - current.x) *
                    (y - current.y) /
                    (previous.y - current.y) +
                    current.x
                );

            if (crosses) {
                inside = !inside;
            }
        }

        return inside;
    }

    private hash01(
        value: number,
    ): number {
        const hashed =
            Math.sin(
                value * 12.9898,
            ) *
            43758.5453;

        return hashed -
            Math.floor(hashed);
    }
}
