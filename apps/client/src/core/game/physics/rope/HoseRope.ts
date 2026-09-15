import type { HydrantHoseDefinition } from "../../config/HydrantHoseDefinition";
import { HoseRopePoint } from "./HoseRopePoint";

export class HoseRope {
    private readonly points: HoseRopePoint[] = [];
    private accumulator = 0;
    private initialAngleRadians = 0;

    constructor(
        private readonly anchorX: number,
        private readonly anchorY: number,
        private readonly definition: HydrantHoseDefinition,
        randomValue: number = Math.random(),
    ) {
        this.validateDefinition();
        this.reset(randomValue);
    }

    public update(deltaTime: number): void {
        const safeDelta = Math.min(
            Math.max(deltaTime, 0),
            this.definition.fixedTimeStep *
            this.definition.maximumSubSteps,
        );

        this.accumulator += safeDelta;

        let steps = 0;

        while (
            this.accumulator >=
            this.definition.fixedTimeStep &&
            steps <
            this.definition.maximumSubSteps
        ) {
            this.step(
                this.definition.fixedTimeStep,
            );

            this.accumulator -=
                this.definition.fixedTimeStep;

            steps += 1;
        }
    }

    public reset(
        randomValue: number = Math.random(),
    ): void {
        this.points.length = 0;
        this.accumulator = 0;

        const t =
            Math.max(
                0,
                Math.min(
                    randomValue,
                    0.999999,
                ),
            );

        this.initialAngleRadians =
            this.definition
                .randomAngleMinimumRadians +
            (
                this.definition
                    .randomAngleMaximumRadians -
                this.definition
                    .randomAngleMinimumRadians
            ) *
            t;

        this.points.push(
            new HoseRopePoint(
                0,
                this.anchorX,
                this.anchorY,
                0,
            ),
        );

        let x = this.anchorX;
        let y = this.anchorY;

        /*
         * Build a gently curved initial Hose.
         *
         * The old 8-segment version alternated the bend on every segment.
         * With 24 segments that would visually read as a repeated zig-zag.
         * A low-frequency sine bend gives the longer Hose a loose natural
         * shape while preserving exact segment lengths.
         */
        for (
            let index = 1;
            index <=
            this.definition.segmentCount;
            index += 1
        ) {
            const normalizedIndex =
                index /
                this.definition.segmentCount;

            const bend =
                Math.sin(
                    normalizedIndex *
                    Math.PI *
                    2,
                ) *
                this.definition
                    .initialBendRadians;

            const angle =
                this.initialAngleRadians +
                bend;

            x +=
                Math.cos(angle) *
                this.definition.segmentLength;

            y +=
                Math.sin(angle) *
                this.definition.segmentLength;

            this.points.push(
                new HoseRopePoint(
                    index,
                    x,
                    y,
                    this.definition
                        .hoseInverseMass,
                ),
            );
        }

        this.solveConstraints();
    }

    public getPoints():
        readonly HoseRopePoint[] {
        return this.points;
    }

    public getPoint(
        index: number,
    ): HoseRopePoint | null {
        return (
            this.points[index] ??
            null
        );
    }

    public getNozzlePoint():
        HoseRopePoint {
        return this.points[
            this.points.length - 1
        ]!;
    }

    public getInitialAngleRadians():
        number {
        return this.initialAngleRadians;
    }

    public getSegmentCount():
        number {
        return (
            this.points.length -
            1
        );
    }

    public getTotalLength():
        number {
        return (
            this.getSegmentCount() *
            this.definition.segmentLength
        );
    }

    public getNozzleDirectionRadians():
        number {
        const last =
            this.getNozzlePoint();

        const previous =
            this.points[
            this.points.length - 2
            ]!;

        return Math.atan2(
            last.y - previous.y,
            last.x - previous.x,
        );
    }

    public applyVelocityDeltaToPoint(
        index: number,
        deltaVelocityX: number,
        deltaVelocityY: number,
    ): void {
        this.points[index]
            ?.applyVelocityDelta(
                deltaVelocityX,
                deltaVelocityY,
                this.definition
                    .fixedTimeStep,
            );
    }

    public resolveConstraintsImmediately():
        void {
        this.solveConstraints();
    }

    /**
     * Applies one world-space collision correction to a point interpolated
     * along a rope segment. The correction is distributed between the two
     * endpoints while respecting the fixed Hydrant anchor. Previous positions
     * move with current positions so contact correction does not inject an
     * artificial Verlet velocity spike.
     */
    public applySegmentPositionCorrection(
        segmentIndex: number,
        interpolation: number,
        correctionX: number,
        correctionY: number,
    ): void {
        const a = this.points[segmentIndex];
        const b = this.points[segmentIndex + 1];
        if (!a || !b) return;

        const t = Math.max(0, Math.min(interpolation, 1));
        const weightA = (1 - t) * a.inverseMass;
        const weightB = t * b.inverseMass;
        const totalWeight = weightA + weightB;
        if (totalWeight <= 0) return;

        const moveA = weightA / totalWeight;
        const moveB = weightB / totalWeight;

        if (!a.isFixed()) {
            a.x += correctionX * moveA;
            a.y += correctionY * moveA;
            a.previousX += correctionX * moveA;
            a.previousY += correctionY * moveA;
        }

        if (!b.isFixed()) {
            b.x += correctionX * moveB;
            b.y += correctionY * moveB;
            b.previousX += correctionX * moveB;
            b.previousY += correctionY * moveB;
        }
    }

    private step(
        deltaTime: number,
    ): void {
        const damping =
            Math.exp(
                -this.definition
                    .dampingPerSecond *
                deltaTime,
            );

        for (
            let index = 1;
            index <
            this.points.length;
            index += 1
        ) {
            const point =
                this.points[index]!;

            const velocityX =
                (
                    point.x -
                    point.previousX
                ) *
                damping;

            const velocityY =
                (
                    point.y -
                    point.previousY
                ) *
                damping;

            point.previousX =
                point.x;

            point.previousY =
                point.y;

            point.x +=
                velocityX;

            point.y +=
                velocityY;
        }

        this.solveConstraints();
    }

    private solveConstraints():
        void {
        for (
            let iteration = 0;
            iteration <
            this.definition
                .constraintIterations;
            iteration += 1
        ) {
            const anchor =
                this.points[0]!;

            anchor.x =
                this.anchorX;

            anchor.y =
                this.anchorY;

            anchor.previousX =
                this.anchorX;

            anchor.previousY =
                this.anchorY;

            for (
                let index = 0;
                index <
                this.points.length - 1;
                index += 1
            ) {
                const a =
                    this.points[index]!;

                const b =
                    this.points[
                    index + 1
                    ]!;

                const dx =
                    b.x - a.x;

                const dy =
                    b.y - a.y;

                const distance =
                    Math.hypot(
                        dx,
                        dy,
                    );

                if (
                    distance <=
                    0.000001
                ) {
                    continue;
                }

                const error =
                    distance -
                    this.definition
                        .segmentLength;

                const normalX =
                    dx / distance;

                const normalY =
                    dy / distance;

                const totalInverseMass =
                    a.inverseMass +
                    b.inverseMass;

                if (
                    totalInverseMass <=
                    0
                ) {
                    continue;
                }

                const correctionX =
                    normalX *
                    error;

                const correctionY =
                    normalY *
                    error;

                if (
                    !a.isFixed()
                ) {
                    const share =
                        a.inverseMass /
                        totalInverseMass;

                    a.x +=
                        correctionX *
                        share;

                    a.y +=
                        correctionY *
                        share;
                }

                if (
                    !b.isFixed()
                ) {
                    const share =
                        b.inverseMass /
                        totalInverseMass;

                    b.x -=
                        correctionX *
                        share;

                    b.y -=
                        correctionY *
                        share;
                }
            }

            this.containInsideCourse();
        }
    }

    private containInsideCourse():
        void {
        const boundary =
            this.definition
                .courseBoundary;

        for (
            let index = 1;
            index <
            this.points.length;
            index += 1
        ) {
            const point =
                this.points[index]!;

            const radius =
                index ===
                    this.points.length - 1
                    ? this.definition
                        .nozzleRadius
                    : this.definition
                        .pointRadius;

            const minimumX =
                boundary.minimumX +
                radius +
                this.definition
                    .boundaryPadding;

            const maximumX =
                boundary.maximumX -
                radius -
                this.definition
                    .boundaryPadding;

            const minimumY =
                boundary.minimumY +
                radius +
                this.definition
                    .boundaryPadding;

            const maximumY =
                boundary.maximumY -
                radius -
                this.definition
                    .boundaryPadding;

            const clampedX =
                Math.max(
                    minimumX,
                    Math.min(
                        point.x,
                        maximumX,
                    ),
                );

            const clampedY =
                Math.max(
                    minimumY,
                    Math.min(
                        point.y,
                        maximumY,
                    ),
                );

            if (
                clampedX !==
                point.x
            ) {
                point.x =
                    clampedX;

                point.previousX =
                    clampedX;
            }

            if (
                clampedY !==
                point.y
            ) {
                point.y =
                    clampedY;

                point.previousY =
                    clampedY;
            }
        }
    }

    private validateDefinition():
        void {
        if (
            !Number.isInteger(
                this.definition
                    .segmentCount,
            ) ||
            this.definition
                .segmentCount <=
            0
        ) {
            throw new Error(
                "Hose segmentCount must be a positive integer.",
            );
        }

        if (
            this.definition
                .segmentLength <=
            0 ||
            this.definition
                .fixedTimeStep <=
            0 ||
            this.definition
                .hoseObstacleCollisionRadius <=
            0
        ) {
            throw new Error(
                "Hose segmentLength, fixedTimeStep and obstacle collision radius must be greater than 0.",
            );
        }

        if (
            this.definition
                .constraintIterations <=
            0 ||
            this.definition
                .maximumSubSteps <=
            0
        ) {
            throw new Error(
                "Hose solver iteration counts must be greater than 0.",
            );
        }
    }
}
