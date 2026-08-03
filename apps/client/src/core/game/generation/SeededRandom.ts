export class SeededRandom {

    private state: number;

    constructor(
        seed: number,
    ) {

        if (
            !Number.isFinite(
                seed,
            )
        ) {
            throw new Error(
                "SeededRandom seed must be a finite number.",
            );
        }

        this.state =
            seed >>> 0;
    }

    public next(): number {

        this.state =
            (
                this.state +
                0x6d2b79f5
            ) >>> 0;

        let value =
            this.state;

        value =
            Math.imul(
                value ^
                (
                    value >>>
                    15
                ),
                value |
                1,
            );

        value ^=
            value +
            Math.imul(
                value ^
                (
                    value >>>
                    7
                ),
                value |
                61,
            );

        return (
            (
                value ^
                (
                    value >>>
                    14
                )
            ) >>>
            0
        ) /
            4294967296;
    }

    public nextRange(
        minimum: number,
        maximum: number,
    ): number {

        if (
            !Number.isFinite(
                minimum,
            ) ||
            !Number.isFinite(
                maximum,
            ) ||
            maximum <
            minimum
        ) {
            throw new Error(
                "SeededRandom range is invalid.",
            );
        }

        return (
            minimum +
            this.next() *
            (
                maximum -
                minimum
            )
        );
    }

    public nextInteger(
        minimum: number,
        maximumInclusive: number,
    ): number {

        if (
            !Number.isInteger(
                minimum,
            ) ||
            !Number.isInteger(
                maximumInclusive,
            ) ||
            maximumInclusive <
            minimum
        ) {
            throw new Error(
                "SeededRandom integer range is invalid.",
            );
        }

        return Math.floor(
            this.nextRange(
                minimum,
                maximumInclusive +
                1,
            ),
        );
    }

    public pick<T>(
        values: readonly T[],
    ): T {

        if (
            values.length ===
            0
        ) {
            throw new Error(
                "SeededRandom cannot select from an empty collection.",
            );
        }

        return values[
            this.nextInteger(
                0,
                values.length -
                1,
            )
        ];
    }

    public shuffle<T>(
        values: readonly T[],
    ): T[] {

        const result =
            [...values];

        for (
            let index =
                result.length -
                1;
            index >
            0;
            index -=
            1
        ) {
            const swapIndex =
                this.nextInteger(
                    0,
                    index,
                );

            const temporary =
                result[index];

            result[index] =
                result[swapIndex];

            result[swapIndex] =
                temporary;
        }

        return result;
    }
}
