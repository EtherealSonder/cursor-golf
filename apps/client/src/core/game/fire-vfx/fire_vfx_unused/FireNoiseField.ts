/**
 * Small deterministic coherent 3D value-noise field.
 *
 * No external package is required. Sampling x/y/time produces smoothly
 * changing values in [-1, 1]. Nearby points therefore move similarly instead
 * of independently jittering.
 */
export class FireNoiseField {
    public sample(
        x: number,
        y: number,
        time: number,
    ): number {

        const x0 =
            Math.floor(x);

        const y0 =
            Math.floor(y);

        const z0 =
            Math.floor(time);

        const tx =
            this.fade(
                x - x0,
            );

        const ty =
            this.fade(
                y - y0,
            );

        const tz =
            this.fade(
                time - z0,
            );

        const x1 =
            x0 + 1;

        const y1 =
            y0 + 1;

        const z1 =
            z0 + 1;

        const c000 =
            this.hash(
                x0,
                y0,
                z0,
            );

        const c100 =
            this.hash(
                x1,
                y0,
                z0,
            );

        const c010 =
            this.hash(
                x0,
                y1,
                z0,
            );

        const c110 =
            this.hash(
                x1,
                y1,
                z0,
            );

        const c001 =
            this.hash(
                x0,
                y0,
                z1,
            );

        const c101 =
            this.hash(
                x1,
                y0,
                z1,
            );

        const c011 =
            this.hash(
                x0,
                y1,
                z1,
            );

        const c111 =
            this.hash(
                x1,
                y1,
                z1,
            );

        const lowY0 =
            this.lerp(
                c000,
                c100,
                tx,
            );

        const lowY1 =
            this.lerp(
                c010,
                c110,
                tx,
            );

        const highY0 =
            this.lerp(
                c001,
                c101,
                tx,
            );

        const highY1 =
            this.lerp(
                c011,
                c111,
                tx,
            );

        const low =
            this.lerp(
                lowY0,
                lowY1,
                ty,
            );

        const high =
            this.lerp(
                highY0,
                highY1,
                ty,
            );

        return this.lerp(
            low,
            high,
            tz,
        );
    }

    public sampleBroad(
        x: number,
        y: number,
        time: number,
        scale: number,
        speed: number,
    ): number {

        return this.sample(
            x * scale,
            y * scale,
            time * speed,
        );
    }

    public sampleDetail(
        x: number,
        y: number,
        time: number,
        scale: number,
        speed: number,
    ): number {

        return this.sample(
            x * scale + 17.31,
            y * scale - 9.47,
            time * speed + 3.18,
        );
    }

    public sampleHot(
        x: number,
        y: number,
        time: number,
        scale: number,
        speed: number,
    ): number {

        return this.sample(
            x * scale - 31.17,
            y * scale + 22.83,
            time * speed + 7.61,
        );
    }

    private fade(
        value: number,
    ): number {

        return (
            value *
            value *
            (
                3 -
                2 *
                value
            )
        );
    }

    private hash(
        x: number,
        y: number,
        z: number,
    ): number {

        let value =
            (
                Math.imul(
                    x,
                    374761393,
                ) ^
                Math.imul(
                    y,
                    668265263,
                ) ^
                Math.imul(
                    z,
                    2147483647,
                )
            ) |
            0;

        value =
            Math.imul(
                value ^
                value >>> 13,
                1274126177,
            );

        value ^=
            value >>> 16;

        return (
            (
                value >>> 0
            ) /
            2147483647.5
        ) -
            1;
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
}
