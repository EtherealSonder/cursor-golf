/**
 * One invisible presentation-only influence used to construct the connected
 * Ground Fire surface.
 *
 * It is not a gameplay FireCell and owns no heat, burn, fuel, spread,
 * collision, moisture or ignition authority.
 */
export class FireInfluencePoint {
    private strength =
        0;

    private targetStrength =
        0;

    private radius =
        0;

    private targetRadius =
        0;

    private age =
        0;

    public constructor(
        private readonly id: string,
        private readonly baseX: number,
        private readonly baseY: number,
        private readonly wobblePhaseX: number,
        private readonly wobblePhaseY: number,
        private readonly wobbleSpeedMultiplier: number,
        private readonly wobbleAmplitudeMultiplier: number,
    ) { }

    public getId():
        string {

        return this.id;
    }

    public setTarget(
        strength: number,
        radius: number,
    ): void {

        this.targetStrength =
            this.clamp01(
                strength,
            );

        this.targetRadius =
            Math.max(
                0,
                radius,
            );
    }

    public clearTarget():
        void {

        this.targetStrength =
            0;

        this.targetRadius =
            0;
    }

    public update(
        deltaTime: number,
        growResponsePerSecond: number,
        shrinkResponsePerSecond: number,
    ): void {

        if (
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            return;
        }

        this.age +=
            deltaTime;

        const response =
            this.targetStrength >=
                this.strength
                ? growResponsePerSecond
                : shrinkResponsePerSecond;

        const blend =
            1 -
            Math.exp(
                -Math.max(
                    0,
                    response,
                ) *
                deltaTime,
            );

        this.strength +=
            (
                this.targetStrength -
                this.strength
            ) *
            blend;

        this.radius +=
            (
                this.targetRadius -
                this.radius
            ) *
            blend;

        if (
            this.strength <
            0.0005 &&
            this.targetStrength <= 0
        ) {
            this.strength =
                0;
        }

        if (
            this.radius <
            0.05 &&
            this.targetRadius <= 0
        ) {
            this.radius =
                0;
        }
    }

    public getStrength():
        number {

        return this.strength;
    }

    public getRadius():
        number {

        return this.radius;
    }

    public getWorldX(
        wobbleAmplitude: number,
        wobbleSpeed: number,
    ): number {

        return (
            this.baseX +
            Math.sin(
                this.wobblePhaseX +
                this.age *
                wobbleSpeed *
                this.wobbleSpeedMultiplier,
            ) *
            wobbleAmplitude *
            this.wobbleAmplitudeMultiplier
        );
    }

    public getWorldY(
        wobbleAmplitude: number,
        wobbleSpeed: number,
    ): number {

        return (
            this.baseY +
            Math.sin(
                this.wobblePhaseY +
                this.age *
                wobbleSpeed *
                0.83 *
                this.wobbleSpeedMultiplier,
            ) *
            wobbleAmplitude *
            this.wobbleAmplitudeMultiplier
        );
    }

    public isFullyInactive():
        boolean {

        return (
            this.targetStrength <= 0 &&
            this.strength <= 0 &&
            this.radius <= 0
        );
    }

    private clamp01(
        value: number,
    ): number {

        if (!Number.isFinite(value)) {
            return 0;
        }

        return Math.max(
            0,
            Math.min(
                1,
                value,
            ),
        );
    }
}
