import type {
    FireInfluencePoint,
} from "./FireInfluencePoint";

/**
 * Runtime presentation state for one local Fire cluster.
 *
 * A cluster is not gameplay state. It owns a few invisible influence points
 * that connect only to each other, producing one small amoeba-like flame.
 */
export class GroundFireCluster {
    private age =
        0;

    private currentScale =
        0;

    private targetScale =
        0;

    private currentStrength =
        0;

    private targetStrength =
        0;

    private currentCorePulse =
        0;

    private targetCorePulse =
        0;

    private windLeanX =
        0;

    private windLeanY =
        0;

    public constructor(
        private readonly id: string,
        private readonly cellKey: string,
        private readonly localX: number,
        private readonly localY: number,
        private readonly phase: number,
        private readonly flickerFrequency: number,
        private readonly corePhase: number,
        private readonly influences:
            FireInfluencePoint[],
    ) { }

    public getId():
        string {

        return this.id;
    }

    public getCellKey():
        string {

        return this.cellKey;
    }

    public getInfluences():
        readonly FireInfluencePoint[] {

        return this.influences;
    }

    public setTarget(
        scale: number,
        strength: number,
        corePulse: number,
        windLeanX: number,
        windLeanY: number,
    ): void {

        this.targetScale =
            Math.max(
                0,
                scale,
            );

        this.targetStrength =
            this.clamp01(
                strength,
            );

        this.targetCorePulse =
            this.clamp01(
                corePulse,
            );

        this.windLeanX =
            windLeanX;

        this.windLeanY =
            windLeanY;
    }

    public clearTarget():
        void {

        this.targetScale =
            0;

        this.targetStrength =
            0;

        this.targetCorePulse =
            0;
    }

    public update(
        deltaTime: number,
        growResponsePerSecond: number,
        shrinkResponsePerSecond: number,
        flickerStrength: number,
        positionWobble: number,
        scaleWobble: number,
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
                this.currentStrength
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

        this.currentStrength +=
            (
                this.targetStrength -
                this.currentStrength
            ) *
            blend;

        this.currentScale +=
            (
                this.targetScale -
                this.currentScale
            ) *
            blend;

        this.currentCorePulse +=
            (
                this.targetCorePulse -
                this.currentCorePulse
            ) *
            Math.min(
                1,
                blend *
                1.45,
            );

        const fastPhase =
            this.phase +
            this.age *
            this.flickerFrequency *
            Math.PI *
            2;

        const pulse =
            Math.sin(
                fastPhase,
            );

        const secondary =
            Math.sin(
                fastPhase *
                0.61 +
                1.37,
            );

        const visualScale =
            Math.max(
                0,
                this.currentScale *
                (
                    1 +
                    pulse *
                    scaleWobble
                ),
            );

        const visualStrength =
            this.clamp01(
                this.currentStrength *
                (
                    1 +
                    secondary *
                    flickerStrength
                ),
            );

        const wobbleX =
            Math.sin(
                fastPhase *
                0.43,
            ) *
            positionWobble;

        const wobbleY =
            Math.cos(
                fastPhase *
                0.37,
            ) *
            positionWobble;

        for (
            let index = 0;
            index <
            this.influences.length;
            index += 1
        ) {
            const influence =
                this.influences[index];

            /*
             * Every influence receives slightly different modulation so the
             * cluster boundary continuously deforms instead of breathing as
             * one perfectly synchronized blob.
             */
            const localPulse =
                1 +
                Math.sin(
                    fastPhase +
                    index *
                    1.61,
                ) *
                0.12;

            influence.setTarget(
                visualStrength *
                localPulse,
                visualScale *
                localPulse,
            );

            /*
             * Position offsets are exposed by the cluster itself and applied
             * by FireFieldFilter. FireInfluencePoint therefore remains
             * unchanged from the previous field pass.
             */
        }
    }

    public getRenderOffsetX(
        positionWobble: number,
    ): number {

        const fastPhase =
            this.phase +
            this.age *
            this.flickerFrequency *
            Math.PI *
            2;

        return (
            this.localX +
            Math.sin(
                fastPhase *
                0.43,
            ) *
            positionWobble +
            this.windLeanX
        );
    }

    public getRenderOffsetY(
        positionWobble: number,
    ): number {

        const fastPhase =
            this.phase +
            this.age *
            this.flickerFrequency *
            Math.PI *
            2;

        return (
            this.localY +
            Math.cos(
                fastPhase *
                0.37,
            ) *
            positionWobble +
            this.windLeanY
        );
    }

    public getCorePulse():
        number {

        const pulse =
            0.5 +
            0.5 *
            Math.sin(
                this.corePhase +
                this.age *
                this.flickerFrequency *
                0.82 *
                Math.PI *
                2,
            );

        return (
            this.currentCorePulse *
            pulse
        );
    }

    public isFullyInactive():
        boolean {

        return (
            this.targetStrength <= 0 &&
            this.currentStrength <
            0.01 &&
            this.currentScale <
            0.5
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
