export interface ScorchContourPoint {
    readonly x: number;
    readonly y: number;
}

export type ScorchContour =
    ScorchContourPoint[];

interface Segment {
    readonly a: ScorchContourPoint;
    readonly b: ScorchContourPoint;
}

/**
 * Converts a smoothed scalar burn field into closed contours using
 * Marching Squares.
 *
 * Coordinates returned by this builder are in scalar-grid coordinates.
 * ScorchRenderer converts them into world coordinates afterward.
 */
export class ScorchContourBuilder {

    public build(
        values: Float32Array,
        columns: number,
        rows: number,
        threshold: number,
    ): ScorchContour[] {

        if (
            columns < 2 ||
            rows < 2 ||
            values.length <
            columns * rows
        ) {
            return [];
        }

        const segments:
            Segment[] = [];

        for (
            let y = 0;
            y < rows - 1;
            y += 1
        ) {
            for (
                let x = 0;
                x < columns - 1;
                x += 1
            ) {
                this.appendCellSegments(
                    segments,
                    values,
                    columns,
                    x,
                    y,
                    threshold,
                );
            }
        }

        return this.connectSegments(
            segments,
        );
    }

    private appendCellSegments(
        output: Segment[],
        values: Float32Array,
        columns: number,
        x: number,
        y: number,
        threshold: number,
    ): void {

        const topLeft =
            values[
            y * columns + x
            ] ?? 0;

        const topRight =
            values[
            y * columns + x + 1
            ] ?? 0;

        const bottomRight =
            values[
            (y + 1) *
            columns +
            x +
            1
            ] ?? 0;

        const bottomLeft =
            values[
            (y + 1) *
            columns +
            x
            ] ?? 0;

        let caseIndex = 0;

        if (topLeft >= threshold) {
            caseIndex |= 1;
        }

        if (topRight >= threshold) {
            caseIndex |= 2;
        }

        if (bottomRight >= threshold) {
            caseIndex |= 4;
        }

        if (bottomLeft >= threshold) {
            caseIndex |= 8;
        }

        if (
            caseIndex === 0 ||
            caseIndex === 15
        ) {
            return;
        }

        const top =
            this.interpolate(
                x,
                y,
                x + 1,
                y,
                topLeft,
                topRight,
                threshold,
            );

        const right =
            this.interpolate(
                x + 1,
                y,
                x + 1,
                y + 1,
                topRight,
                bottomRight,
                threshold,
            );

        const bottom =
            this.interpolate(
                x + 1,
                y + 1,
                x,
                y + 1,
                bottomRight,
                bottomLeft,
                threshold,
            );

        const left =
            this.interpolate(
                x,
                y + 1,
                x,
                y,
                bottomLeft,
                topLeft,
                threshold,
            );

        switch (caseIndex) {
            case 1:
                this.pushSegment(
                    output,
                    left,
                    top,
                );
                break;

            case 2:
                this.pushSegment(
                    output,
                    top,
                    right,
                );
                break;

            case 3:
                this.pushSegment(
                    output,
                    left,
                    right,
                );
                break;

            case 4:
                this.pushSegment(
                    output,
                    right,
                    bottom,
                );
                break;

            case 5: {
                const center =
                    (
                        topLeft +
                        topRight +
                        bottomRight +
                        bottomLeft
                    ) * 0.25;

                if (center >= threshold) {
                    this.pushSegment(
                        output,
                        left,
                        bottom,
                    );

                    this.pushSegment(
                        output,
                        top,
                        right,
                    );
                } else {
                    this.pushSegment(
                        output,
                        left,
                        top,
                    );

                    this.pushSegment(
                        output,
                        right,
                        bottom,
                    );
                }

                break;
            }

            case 6:
                this.pushSegment(
                    output,
                    top,
                    bottom,
                );
                break;

            case 7:
                this.pushSegment(
                    output,
                    left,
                    bottom,
                );
                break;

            case 8:
                this.pushSegment(
                    output,
                    bottom,
                    left,
                );
                break;

            case 9:
                this.pushSegment(
                    output,
                    top,
                    bottom,
                );
                break;

            case 10: {
                const center =
                    (
                        topLeft +
                        topRight +
                        bottomRight +
                        bottomLeft
                    ) * 0.25;

                if (center >= threshold) {
                    this.pushSegment(
                        output,
                        top,
                        left,
                    );

                    this.pushSegment(
                        output,
                        right,
                        bottom,
                    );
                } else {
                    this.pushSegment(
                        output,
                        top,
                        right,
                    );

                    this.pushSegment(
                        output,
                        bottom,
                        left,
                    );
                }

                break;
            }

            case 11:
                this.pushSegment(
                    output,
                    right,
                    bottom,
                );
                break;

            case 12:
                this.pushSegment(
                    output,
                    left,
                    right,
                );
                break;

            case 13:
                this.pushSegment(
                    output,
                    top,
                    right,
                );
                break;

            case 14:
                this.pushSegment(
                    output,
                    left,
                    top,
                );
                break;
        }
    }

    private connectSegments(
        segments: Segment[],
    ): ScorchContour[] {

        if (
            segments.length === 0
        ) {
            return [];
        }

        const adjacency =
            new Map<
                string,
                Array<{
                    readonly point:
                    ScorchContourPoint;

                    readonly segmentIndex:
                    number;
                }>
            >();

        for (
            let index = 0;
            index < segments.length;
            index += 1
        ) {
            const segment =
                segments[index];

            if (!segment) {
                continue;
            }

            this.addAdjacency(
                adjacency,
                segment.a,
                segment.b,
                index,
            );

            this.addAdjacency(
                adjacency,
                segment.b,
                segment.a,
                index,
            );
        }

        const used =
            new Uint8Array(
                segments.length,
            );

        const contours:
            ScorchContour[] = [];

        for (
            let startIndex = 0;
            startIndex <
            segments.length;
            startIndex += 1
        ) {
            if (
                used[startIndex] !== 0
            ) {
                continue;
            }

            const first =
                segments[startIndex];

            if (!first) {
                continue;
            }

            const contour:
                ScorchContour = [
                    first.a,
                    first.b,
                ];

            used[startIndex] = 1;

            const startKey =
                this.key(
                    first.a,
                );

            let current =
                first.b;

            let guard =
                segments.length + 4;

            while (
                guard > 0
            ) {
                guard -= 1;

                const currentKey =
                    this.key(
                        current,
                    );

                if (
                    currentKey ===
                    startKey
                ) {
                    break;
                }

                const candidates =
                    adjacency.get(
                        currentKey,
                    );

                if (!candidates) {
                    break;
                }

                let next:
                    {
                        readonly point:
                        ScorchContourPoint;

                        readonly segmentIndex:
                        number;
                    } | null =
                    null;

                for (
                    const candidate
                    of candidates
                ) {
                    if (
                        used[
                        candidate
                            .segmentIndex
                        ] !== 0
                    ) {
                        continue;
                    }

                    next =
                        candidate;

                    break;
                }

                if (!next) {
                    break;
                }

                used[
                    next.segmentIndex
                ] = 1;

                current =
                    next.point;

                contour.push(
                    current,
                );
            }

            if (
                contour.length >= 4 &&
                this.key(
                    contour[
                    contour.length - 1
                    ] ??
                    contour[0]!,
                ) ===
                startKey
            ) {
                contour.pop();

                contours.push(
                    contour,
                );
            }
        }

        return contours;
    }

    private addAdjacency(
        adjacency:
            Map<
                string,
                Array<{
                    readonly point:
                    ScorchContourPoint;

                    readonly segmentIndex:
                    number;
                }>
            >,

        from:
            ScorchContourPoint,

        to:
            ScorchContourPoint,

        segmentIndex:
            number,
    ): void {

        const key =
            this.key(
                from,
            );

        let list =
            adjacency.get(
                key,
            );

        if (!list) {
            list = [];

            adjacency.set(
                key,
                list,
            );
        }

        list.push({
            point:
                to,

            segmentIndex,
        });
    }

    private pushSegment(
        output:
            Segment[],

        a:
            ScorchContourPoint,

        b:
            ScorchContourPoint,
    ): void {

        output.push({
            a,
            b,
        });
    }

    private interpolate(
        xA: number,
        yA: number,
        xB: number,
        yB: number,
        valueA: number,
        valueB: number,
        threshold: number,
    ): ScorchContourPoint {

        const difference =
            valueB -
            valueA;

        const amount =
            Math.abs(
                difference,
            ) <
                0.000001
                ? 0.5
                : this.clamp01(
                    (
                        threshold -
                        valueA
                    ) /
                    difference,
                );

        return {
            x:
                this.lerp(
                    xA,
                    xB,
                    amount,
                ),

            y:
                this.lerp(
                    yA,
                    yB,
                    amount,
                ),
        };
    }

    private key(
        point:
            ScorchContourPoint,
    ): string {

        /*
         * Intersections from adjacent Marching-Squares cells should be
         * numerically identical, but quantization keeps segment joining
         * stable across floating-point interpolation.
         */
        const x =
            Math.round(
                point.x *
                10000,
            );

        const y =
            Math.round(
                point.y *
                10000,
            );

        return `${x}:${y}`;
    }

    private lerp(
        start: number,
        end: number,
        amount: number,
    ): number {

        return (
            start +
            (
                end -
                start
            ) *
            amount
        );
    }

    private clamp01(
        value: number,
    ): number {

        return Math.max(
            0,
            Math.min(
                1,
                value,
            ),
        );
    }
}
