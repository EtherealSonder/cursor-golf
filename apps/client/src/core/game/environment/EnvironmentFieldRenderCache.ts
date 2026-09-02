/**
 * Presentation-side cache for EnvironmentField burn rendering.
 *
 * EnvironmentField remains authoritative simulation state. This cache
 * remembers which field cells changed visually and the last quantized
 * burn bucket already painted for each field cell.
 */
export class EnvironmentFieldRenderCache {
    private readonly visualBuckets:
        Uint8Array;

    private readonly dirtyFlags:
        Uint8Array;

    private readonly dirtyIndices:
        number[] = [];

    constructor(
        cellCount: number,
    ) {
        if (
            !Number.isInteger(cellCount) ||
            cellCount <= 0
        ) {
            throw new Error(
                "EnvironmentFieldRenderCache requires a positive integer cellCount.",
            );
        }

        this.visualBuckets =
            new Uint8Array(
                cellCount,
            );

        this.dirtyFlags =
            new Uint8Array(
                cellCount,
            );
    }

    public reset(): void {
        this.visualBuckets.fill(
            0,
        );

        this.dirtyFlags.fill(
            0,
        );

        this.dirtyIndices.length =
            0;
    }

    public markDirty(
        index: number,
    ): void {
        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= this.dirtyFlags.length ||
            this.dirtyFlags[index] === 1
        ) {
            return;
        }

        this.dirtyFlags[index] =
            1;

        this.dirtyIndices.push(
            index,
        );
    }

    public consumeDirtyIndices():
        readonly number[] {
        const result =
            this.dirtyIndices.slice();

        for (
            const index
            of this.dirtyIndices
        ) {
            this.dirtyFlags[index] =
                0;
        }

        this.dirtyIndices.length =
            0;

        return result;
    }

    public getVisualBucket(
        index: number,
    ): number {
        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= this.visualBuckets.length
        ) {
            return 0;
        }

        return this.visualBuckets[index];
    }

    public setVisualBucket(
        index: number,
        bucket: number,
    ): void {
        if (
            !Number.isInteger(index) ||
            index < 0 ||
            index >= this.visualBuckets.length ||
            !Number.isInteger(bucket) ||
            bucket < 0 ||
            bucket > 255
        ) {
            return;
        }

        this.visualBuckets[index] =
            bucket;
    }
}
