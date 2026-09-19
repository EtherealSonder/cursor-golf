import type {
    CourseBoundaryDefinition,
} from "../config/CourseBoundaryDefinition";

import {
    DEFAULT_WATER_FIELD_DEFINITION,
} from "../config/WaterFieldDefinition";

import type {
    WaterFieldDefinition,
} from "../config/WaterFieldDefinition";

import {
    PuddleBodyQuery,
} from "../environment/PuddleBodyQuery";

import {
    WaterField,
} from "../environment/WaterField";

export class PuddleBodyMetricsValidation {
    private static hasRun = false;

    public run(): void {
        if (PuddleBodyMetricsValidation.hasRun) {
            return;
        }

        PuddleBodyMetricsValidation.hasRun = true;

        console.log(
            "[8I-8B.5/6] PUDDLE BODY METRICS",
        );

        const checks:
            ReadonlyArray<
                readonly [string, boolean]
            > = [
            [
                "Small shallow body reports small area and volume",
                this.validateSmallShallowBody(),
            ],
            [
                "Small locally-deep body keeps small area",
                this.validateSmallDeepBody(),
            ],
            [
                "Large body reports greater area and volume",
                this.validateLargeBody(),
            ],
            [
                "Separated puddles remain separate bodies",
                this.validateSeparatedBodies(),
            ],
            [
                "Merged puddles become one connected body",
                this.validateMergedBodies(),
            ],
            [
                "Average depth and volume are correct",
                this.validateAggregateMath(),
            ],
            [
                "Empty location returns no body",
                this.validateEmptyLocation(),
            ],
            [
                "Below-threshold Water does not form a body",
                this.validateBelowThreshold(),
            ],
            [
                "Reset removes stale body state",
                this.validateReset(),
            ],
            [
                "Query work is connected-region bounded",
                this.validateBoundedWork(),
            ],
        ];

        let passed = true;

        for (const [label, result] of checks) {
            console.log(
                `[8I-8B.5/6] ${label}: ${result ? "PASS" : "FAIL"}`,
            );

            passed &&= result;
        }

        console.log(
            `[8I-8B.5/6] RESULT: ${passed ? "PASS" : "FAIL"}`,
        );

        if (!passed) {
            throw new Error(
                "8I-8B.5/6 Puddle body metrics validation failed.",
            );
        }
    }

    private validateSmallShallowBody(): boolean {
        const field = this.createField();
        this.injectCell(field, 2, 2, 0.02);
        this.injectCell(field, 3, 2, 0.02);

        const metrics =
            this.queryCell(field, 2, 2);

        return (
            metrics !== null &&
            metrics.cellCount === 2 &&
            this.nearlyEqual(metrics.area, 128) &&
            metrics.volume > 0 &&
            metrics.volume < 10 &&
            !metrics.isTruncated
        );
    }

    private validateSmallDeepBody(): boolean {
        const field = this.createField();
        this.injectCell(field, 2, 2, 0.30);

        const metrics =
            this.queryCell(field, 2, 2);

        return (
            metrics !== null &&
            metrics.cellCount === 1 &&
            this.nearlyEqual(metrics.area, 64) &&
            metrics.maximumDepth > 0.25
        );
    }

    private validateLargeBody(): boolean {
        const small = this.createField();
        this.injectCell(small, 1, 1, 0.04);

        const large = this.createField();
        for (let x = 1; x <= 4; x += 1) {
            for (let y = 1; y <= 3; y += 1) {
                this.injectCell(large, x, y, 0.04);
            }
        }

        const smallMetrics =
            this.queryCell(small, 1, 1);

        const largeMetrics =
            this.queryCell(large, 1, 1);

        return (
            smallMetrics !== null &&
            largeMetrics !== null &&
            largeMetrics.cellCount >
                smallMetrics.cellCount &&
            largeMetrics.area >
                smallMetrics.area &&
            largeMetrics.volume >
                smallMetrics.volume
        );
    }

    private validateSeparatedBodies(): boolean {
        const field = this.createField();

        this.injectCell(field, 1, 1, 0.05);
        this.injectCell(field, 2, 1, 0.05);

        this.injectCell(field, 6, 6, 0.05);
        this.injectCell(field, 7, 6, 0.05);
        this.injectCell(field, 7, 7, 0.05);

        const first =
            this.queryCell(field, 1, 1);

        const second =
            this.queryCell(field, 6, 6);

        return (
            first !== null &&
            second !== null &&
            first.cellCount === 2 &&
            second.cellCount === 3
        );
    }

    private validateMergedBodies(): boolean {
        const field = this.createField();

        this.injectCell(field, 1, 2, 0.05);
        this.injectCell(field, 2, 2, 0.05);

        this.injectCell(field, 4, 2, 0.05);
        this.injectCell(field, 5, 2, 0.05);

        const before =
            this.queryCell(field, 1, 2);

        this.injectCell(field, 3, 2, 0.05);

        const after =
            this.queryCell(field, 1, 2);

        return (
            before !== null &&
            after !== null &&
            before.cellCount === 2 &&
            after.cellCount === 5
        );
    }

    private validateAggregateMath(): boolean {
        const field = this.createField();

        this.injectCell(field, 2, 2, 0.02);
        this.injectCell(field, 3, 2, 0.04);
        this.injectCell(field, 4, 2, 0.06);

        const metrics =
            this.queryCell(field, 2, 2);

        const expectedAverage =
            (0.02 + 0.04 + 0.06) / 3;

        const expectedVolume =
            (0.02 + 0.04 + 0.06) * 64;

        return (
            metrics !== null &&
            this.nearlyEqual(
                metrics.averageDepth,
                expectedAverage,
                1e-6,
            ) &&
            this.nearlyEqual(
                metrics.volume,
                expectedVolume,
                1e-5,
            ) &&
            this.nearlyEqual(
                metrics.maximumDepth,
                0.06,
                1e-6,
            )
        );
    }

    private validateEmptyLocation(): boolean {
        const field = this.createField();
        const metrics =
            this.queryCell(field, 2, 2);

        return metrics === null;
    }

    private validateBelowThreshold(): boolean {
        const field = this.createField();

        this.injectCell(field, 2, 2, 0.005);

        const metrics =
            this.queryCell(field, 2, 2);

        return metrics === null;
    }

    private validateReset(): boolean {
        const field = this.createField();

        this.injectCell(field, 2, 2, 0.05);

        const query =
            new PuddleBodyQuery(field);

        const before =
            query.queryAtWorldPosition(
                this.cellCenter(2),
                this.cellCenter(2),
            );

        field.reset();

        const after =
            query.queryAtWorldPosition(
                this.cellCenter(2),
                this.cellCenter(2),
            );

        return (
            before !== null &&
            after === null
        );
    }

    private validateBoundedWork(): boolean {
        const field = this.createField();

        this.injectCell(field, 1, 1, 0.05);
        this.injectCell(field, 2, 1, 0.05);
        this.injectCell(field, 7, 7, 0.05);

        const metrics =
            this.queryCell(field, 1, 1);

        return (
            metrics !== null &&
            metrics.cellCount === 2 &&
            metrics.visitedCellCount === 2 &&
            metrics.visitedCellCount <
                field.getCellCount()
        );
    }

    private createField(): WaterField {
        const definition:
            WaterFieldDefinition = {
            ...DEFAULT_WATER_FIELD_DEFINITION,
            maximumDepth: 1,
        };

        const boundary:
            CourseBoundaryDefinition = {
            minimumX: 0,
            maximumX: 64,
            minimumY: 0,
            maximumY: 64,
        };

        return new WaterField(
            definition,
            boundary,
        );
    }

    private injectCell(
        field: WaterField,
        gridX: number,
        gridY: number,
        depth: number,
    ): void {
        field.injectWater(
            this.cellCenter(gridX),
            this.cellCenter(gridY),
            depth,
        );
    }

    private queryCell(
        field: WaterField,
        gridX: number,
        gridY: number,
    ) {
        return new PuddleBodyQuery(
            field,
        ).queryAtWorldPosition(
            this.cellCenter(gridX),
            this.cellCenter(gridY),
        );
    }

    private cellCenter(
        coordinate: number,
    ): number {
        return (
            coordinate *
            DEFAULT_WATER_FIELD_DEFINITION.cellSize +
            DEFAULT_WATER_FIELD_DEFINITION.cellSize * 0.5
        );
    }

    private nearlyEqual(
        a: number,
        b: number,
        epsilon = 1e-9,
    ): boolean {
        return Math.abs(a - b) <= epsilon;
    }
}
