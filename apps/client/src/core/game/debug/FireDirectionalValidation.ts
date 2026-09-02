import {
    Graphics,
} from "pixi.js";

import type {
    FireManager,
} from "../environment/FireManager";

export type FireDirectionalValidationClassification =
    | "NO_WIND"
    | "EAST"
    | "SOUTH_EAST"
    | "SOUTH"
    | "SOUTH_WEST"
    | "WEST"
    | "NORTH_WEST"
    | "NORTH"
    | "NORTH_EAST"
    | "WEAK";

export interface FireDirectionalValidationState {
    readonly active: boolean;

    readonly ignitionX: number;
    readonly ignitionY: number;

    readonly windX: number;
    readonly windY: number;
    readonly windMagnitude: number;

    readonly centroidX: number;
    readonly centroidY: number;

    readonly displacementX: number;
    readonly displacementY: number;
    readonly displacementMagnitude: number;

    readonly activeCellCount: number;
    readonly historicalCellCount: number;

    readonly maximumDownwindReach: number;
    readonly maximumUpwindReach: number;
    readonly downwindToUpwindRatio: number | null;

    readonly measuredDirection:
    FireDirectionalValidationClassification;

    readonly alignmentWithWind: number | null;

    readonly passesDirectionalCheck: boolean | null;
}

export type FireDirectionalValidationStateListener = (
    state:
        FireDirectionalValidationState,
) => void;

/**
 * Development-only diagnostic for local-Wind-biased Fire spread.
 *
 * It never modifies Fire simulation. It reads FireManager state,
 * measures the active-cell centroid relative to the ignition point,
 * and draws the exact Wind vector sampled when ignition began.
 */
export class FireDirectionalValidation {

    private readonly graphics:
        Graphics;

    private readonly listeners:
        Set<FireDirectionalValidationStateListener> =
        new Set();

    private state:
        FireDirectionalValidationState;

    private readonly historicalCells:
        Map<string, { readonly x: number; readonly y: number }> =
        new Map();

    private destroyed =
        false;

    constructor(
        private readonly fireManager:
            FireManager,

        private readonly minimumDirectionalDisplacement:
            number,

        private readonly directionMatchThreshold:
            number,

        private readonly minimumDownwindToUpwindRatio:
            number,

        private readonly debugArrowLength:
            number,

        private readonly debugArrowHeadLength:
            number,
    ) {
        this.graphics =
            new Graphics();

        this.state =
            this.createEmptyState();
    }

    public getGraphics():
        Graphics {

        return this.graphics;
    }

    public getState():
        FireDirectionalValidationState {

        return {
            ...this.state,
        };
    }

    public subscribe(
        listener:
            FireDirectionalValidationStateListener,
    ): () => void {

        this.listeners.add(
            listener,
        );

        listener(
            this.getState(),
        );

        return (): void => {
            this.listeners.delete(
                listener,
            );
        };
    }

    public begin(
        ignitionX: number,
        ignitionY: number,
        windX: number,
        windY: number,
    ): void {

        this.historicalCells.clear();

        const windMagnitude =
            Math.hypot(
                windX,
                windY,
            );

        this.state = {
            active: true,

            ignitionX,
            ignitionY,

            windX,
            windY,
            windMagnitude,

            centroidX:
                ignitionX,

            centroidY:
                ignitionY,

            displacementX: 0,
            displacementY: 0,
            displacementMagnitude: 0,

            activeCellCount:
                this.fireManager
                    .getActiveCellCount(),

            historicalCellCount: 0,

            maximumDownwindReach: 0,
            maximumUpwindReach: 0,
            downwindToUpwindRatio:
                windMagnitude > 0
                    ? 0
                    : null,

            measuredDirection:
                windMagnitude > 0
                    ? "WEAK"
                    : "NO_WIND",

            alignmentWithWind:
                windMagnitude > 0
                    ? 0
                    : null,

            passesDirectionalCheck:
                windMagnitude > 0
                    ? false
                    : null,
        };

        this.captureActiveCells();
        this.recalculateHistoricalMetrics();
        this.drawDebugGraphics();

        this.notify();
    }

    public update():
        void {

        if (
            this.destroyed ||
            !this.state.active
        ) {
            return;
        }

        this.captureActiveCells();

        if (
            this.historicalCells.size <=
            0
        ) {
            return;
        }

        this.recalculateHistoricalMetrics();
        this.drawDebugGraphics();

        this.notify();
    }

    public reset():
        void {

        this.historicalCells.clear();

        this.state =
            this.createEmptyState();

        this.graphics.clear();

        this.notify();
    }

    public destroy():
        void {

        if (this.destroyed) {
            return;
        }

        this.destroyed =
            true;

        this.historicalCells.clear();
        this.listeners.clear();

        this.graphics
            .removeFromParent();

        this.graphics
            .destroy();
    }

    private captureActiveCells():
        void {

        const cells =
            this.fireManager
                .getActiveCells();

        for (
            const cell
            of cells
        ) {
            const x =
                cell.getWorldCenterX();

            const y =
                cell.getWorldCenterY();

            const key =
                `${Math.round(x * 1000)}:${Math.round(y * 1000)}`;

            if (
                this.historicalCells
                    .has(
                        key,
                    )
            ) {
                continue;
            }

            this.historicalCells
                .set(
                    key,
                    {
                        x,
                        y,
                    },
                );
        }
    }

    private recalculateHistoricalMetrics():
        void {

        const historicalCellCount =
            this.historicalCells.size;

        if (
            historicalCellCount <=
            0
        ) {
            return;
        }

        let totalX = 0;
        let totalY = 0;

        this.historicalCells
            .forEach(
                (
                    cell,
                ): void => {

                    totalX +=
                        cell.x;

                    totalY +=
                        cell.y;
                },
            );

        const centroidX =
            totalX /
            historicalCellCount;

        const centroidY =
            totalY /
            historicalCellCount;

        const displacementX =
            centroidX -
            this.state.ignitionX;

        const displacementY =
            centroidY -
            this.state.ignitionY;

        const displacementMagnitude =
            Math.hypot(
                displacementX,
                displacementY,
            );

        const measuredDirection =
            this.state.windMagnitude <=
                0
                ? "NO_WIND"
                : this.classifyDirection(
                    displacementX,
                    displacementY,
                    displacementMagnitude,
                );

        let alignmentWithWind:
            number | null =
            null;

        let maximumDownwindReach = 0;
        let maximumUpwindReach = 0;

        let downwindToUpwindRatio:
            number | null =
            null;

        let passesDirectionalCheck:
            boolean | null =
            null;

        if (
            this.state.windMagnitude >
            0
        ) {
            const windDirectionX =
                this.state.windX /
                this.state.windMagnitude;

            const windDirectionY =
                this.state.windY /
                this.state.windMagnitude;

            this.historicalCells
                .forEach(
                    (
                        cell,
                    ): void => {

                        const relativeX =
                            cell.x -
                            this.state.ignitionX;

                        const relativeY =
                            cell.y -
                            this.state.ignitionY;

                        const projection =
                            relativeX *
                            windDirectionX +
                            relativeY *
                            windDirectionY;

                        maximumDownwindReach =
                            Math.max(
                                maximumDownwindReach,
                                projection,
                            );

                        maximumUpwindReach =
                            Math.max(
                                maximumUpwindReach,
                                -projection,
                            );
                    },
                );

            downwindToUpwindRatio =
                maximumUpwindReach >
                    0.001
                    ? maximumDownwindReach /
                    maximumUpwindReach
                    : maximumDownwindReach >
                        0
                        ? Number.POSITIVE_INFINITY
                        : 0;

            if (
                displacementMagnitude >
                0
            ) {
                alignmentWithWind =
                    (
                        displacementX *
                        this.state.windX +
                        displacementY *
                        this.state.windY
                    ) /
                    (
                        displacementMagnitude *
                        this.state.windMagnitude
                    );

                alignmentWithWind =
                    Math.min(
                        1,
                        Math.max(
                            -1,
                            alignmentWithWind,
                        ),
                    );
            } else {
                alignmentWithWind = 0;
            }

            passesDirectionalCheck =
                displacementMagnitude >=
                this.minimumDirectionalDisplacement &&
                alignmentWithWind >=
                this.directionMatchThreshold &&
                downwindToUpwindRatio >=
                this.minimumDownwindToUpwindRatio;
        }

        this.state = {
            ...this.state,

            centroidX,
            centroidY,

            displacementX,
            displacementY,
            displacementMagnitude,

            activeCellCount:
                this.fireManager
                    .getActiveCellCount(),

            historicalCellCount,

            maximumDownwindReach,
            maximumUpwindReach,
            downwindToUpwindRatio,

            measuredDirection,

            alignmentWithWind,

            passesDirectionalCheck,
        };
    }

    private drawDebugGraphics():
        void {

        this.graphics.clear();

        const {
            ignitionX,
            ignitionY,
            windX,
            windY,
            windMagnitude,
        } =
            this.state;

        this.graphics
            .circle(
                ignitionX,
                ignitionY,
                5,
            )
            .fill({
                color: 0xffffff,
                alpha: 0.95,
            });

        if (windMagnitude <= 0) {
            this.graphics
                .circle(
                    ignitionX,
                    ignitionY,
                    11,
                )
                .stroke({
                    width: 2,
                    color: 0xffffff,
                    alpha: 0.8,
                });

            this.drawCentroidMarker();

            return;
        }

        const directionX =
            windX /
            windMagnitude;

        const directionY =
            windY /
            windMagnitude;

        const endX =
            ignitionX +
            directionX *
            this.debugArrowLength;

        const endY =
            ignitionY +
            directionY *
            this.debugArrowLength;

        this.graphics
            .moveTo(
                ignitionX,
                ignitionY,
            )
            .lineTo(
                endX,
                endY,
            )
            .stroke({
                width: 3,
                color: 0xffd84a,
                alpha: 0.95,
                cap: "round",
            });

        const perpendicularX =
            -directionY;

        const perpendicularY =
            directionX;

        const arrowBaseX =
            endX -
            directionX *
            this.debugArrowHeadLength;

        const arrowBaseY =
            endY -
            directionY *
            this.debugArrowHeadLength;

        const halfHead =
            this.debugArrowHeadLength *
            0.48;

        this.graphics
            .moveTo(
                endX,
                endY,
            )
            .lineTo(
                arrowBaseX +
                perpendicularX *
                halfHead,
                arrowBaseY +
                perpendicularY *
                halfHead,
            )
            .lineTo(
                arrowBaseX -
                perpendicularX *
                halfHead,
                arrowBaseY -
                perpendicularY *
                halfHead,
            )
            .lineTo(
                endX,
                endY,
            )
            .fill({
                color: 0xffd84a,
                alpha: 0.95,
            });

        this.drawCentroidMarker();
    }

    private drawCentroidMarker():
        void {

        if (
            !this.state.active ||
            this.state.historicalCellCount <= 0
        ) {
            return;
        }

        const {
            ignitionX,
            ignitionY,
            centroidX,
            centroidY,
            displacementMagnitude,
        } =
            this.state;

        if (
            displacementMagnitude >
            1
        ) {
            this.graphics
                .moveTo(
                    ignitionX,
                    ignitionY,
                )
                .lineTo(
                    centroidX,
                    centroidY,
                )
                .stroke({
                    width: 2,
                    color: 0xffffff,
                    alpha: 0.72,
                    cap: "round",
                });
        }

        this.graphics
            .circle(
                centroidX,
                centroidY,
                7,
            )
            .fill({
                color: 0xe94f55,
                alpha: 0.95,
            })
            .circle(
                centroidX,
                centroidY,
                10,
            )
            .stroke({
                width: 2,
                color: 0xffffff,
                alpha: 0.92,
            });
    }

    private classifyDirection(
        x: number,
        y: number,
        magnitude: number,
    ): FireDirectionalValidationClassification {

        if (
            magnitude <
            this.minimumDirectionalDisplacement
        ) {
            return "WEAK";
        }

        const angle =
            Math.atan2(
                y,
                x,
            );

        const sector =
            Math.round(
                angle /
                (Math.PI / 4),
            );

        switch (
        (
            sector +
            8
        ) %
        8
        ) {
            case 0:
                return "EAST";

            case 1:
                return "SOUTH_EAST";

            case 2:
                return "SOUTH";

            case 3:
                return "SOUTH_WEST";

            case 4:
                return "WEST";

            case 5:
                return "NORTH_WEST";

            case 6:
                return "NORTH";

            case 7:
                return "NORTH_EAST";

            default:
                return "WEAK";
        }
    }

    private createEmptyState():
        FireDirectionalValidationState {

        return {
            active: false,

            ignitionX: 0,
            ignitionY: 0,

            windX: 0,
            windY: 0,
            windMagnitude: 0,

            centroidX: 0,
            centroidY: 0,

            displacementX: 0,
            displacementY: 0,
            displacementMagnitude: 0,

            activeCellCount: 0,
            historicalCellCount: 0,

            maximumDownwindReach: 0,
            maximumUpwindReach: 0,
            downwindToUpwindRatio: null,

            measuredDirection: "WEAK",

            alignmentWithWind: null,

            passesDirectionalCheck: null,
        };
    }

    private notify():
        void {

        const snapshot =
            this.getState();

        this.listeners
            .forEach(
                (
                    listener,
                ): void => {

                    listener(
                        snapshot,
                    );
                },
            );
    }
}
