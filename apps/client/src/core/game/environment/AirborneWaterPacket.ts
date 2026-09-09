import type {
    WaterSourceType,
} from "../config/WaterSourceDefinition";

export interface AirborneWaterImpact {
    readonly positionX: number;
    readonly positionY: number;
    readonly velocityX: number;
    readonly velocityY: number;
    readonly waterAmount: number;
}

/**
 * Runtime representation of one authoritative quantity of Water in flight.
 *
 * X/Y are ground-plane coordinates. Height is an implicit vertical axis used
 * only for ballistic transport and impact timing in the top-down world.
 */
export class AirborneWaterPacket {
    private positionX: number;
    private positionY: number;
    private height: number;

    private velocityX: number;
    private velocityY: number;
    private verticalVelocity: number;

    private age = 0;

    public constructor(
        private readonly sourceId: string,
        private readonly sourceType: WaterSourceType,
        private readonly sequence: number,
        positionX: number,
        positionY: number,
        velocityX: number,
        velocityY: number,
        verticalVelocity: number,
        private readonly waterAmount: number,
        private readonly windResponse: number,
    ) {
        const numericValues = [
            positionX,
            positionY,
            velocityX,
            velocityY,
            verticalVelocity,
            waterAmount,
            windResponse,
        ];

        if (
            numericValues.some(
                (value): boolean =>
                    !Number.isFinite(value),
            )
        ) {
            throw new Error(
                "AirborneWaterPacket numeric values must be finite.",
            );
        }

        if (
            waterAmount <= 0
        ) {
            throw new Error(
                "AirborneWaterPacket waterAmount must be greater than 0.",
            );
        }

        if (
            windResponse < 0
        ) {
            throw new Error(
                "AirborneWaterPacket windResponse must be greater than or equal to 0.",
            );
        }

        this.positionX = positionX;
        this.positionY = positionY;
        this.height = 0;

        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.verticalVelocity = verticalVelocity;
    }

    /**
     * Advances one fixed airborne transport step.
     *
     * The vertical motion uses the analytic constant-gravity equation. When
     * the step crosses the ground plane, the exact impact time inside the
     * current step is solved so landing range is not quantized to a whole
     * simulation step.
     */
    public step(
        deltaTime: number,
        gravity: number,
        windAccelerationX = 0,
        windAccelerationY = 0,
    ): AirborneWaterImpact | null {
        if (
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0 ||
            !Number.isFinite(gravity) ||
            gravity <= 0 ||
            !Number.isFinite(windAccelerationX) ||
            !Number.isFinite(windAccelerationY)
        ) {
            return null;
        }

        /*
         * Phase 8B-7:
         * Wind acts only on the ground-plane velocity. The packet's
         * windResponse is source-authored susceptibility, so a value of 0
         * preserves the original ballistic trajectory while larger values
         * produce progressively stronger horizontal bending.
         */
        const effectiveWindAccelerationX =
            windAccelerationX *
            this.windResponse;

        const effectiveWindAccelerationY =
            windAccelerationY *
            this.windResponse;

        const previousHeight =
            this.height;

        const previousVerticalVelocity =
            this.verticalVelocity;

        const nextHeight =
            previousHeight +
            previousVerticalVelocity * deltaTime -
            0.5 * gravity * deltaTime * deltaTime;

        const nextVerticalVelocity =
            previousVerticalVelocity -
            gravity * deltaTime;

        const isDescendingThroughGround =
            nextHeight <= 0 &&
            nextVerticalVelocity < 0;

        if (
            isDescendingThroughGround
        ) {
            const discriminant =
                previousVerticalVelocity *
                previousVerticalVelocity +
                2 * gravity * previousHeight;

            const impactTime =
                Math.max(
                    0,
                    Math.min(
                        deltaTime,
                        (
                            previousVerticalVelocity +
                            Math.sqrt(
                                Math.max(
                                    0,
                                    discriminant,
                                ),
                            )
                        ) /
                        gravity,
                    ),
                );

            /*
             * Wind acceleration is constant only for this fixed substep.
             * Integrating position analytically to the exact impact time keeps
             * the existing substep-independent landing precision.
             */
            this.positionX +=
                this.velocityX * impactTime +
                0.5 *
                effectiveWindAccelerationX *
                impactTime *
                impactTime;

            this.positionY +=
                this.velocityY * impactTime +
                0.5 *
                effectiveWindAccelerationY *
                impactTime *
                impactTime;

            this.velocityX +=
                effectiveWindAccelerationX *
                impactTime;

            this.velocityY +=
                effectiveWindAccelerationY *
                impactTime;

            this.height = 0;

            this.verticalVelocity =
                previousVerticalVelocity -
                gravity * impactTime;

            this.age +=
                impactTime;

            return {
                positionX:
                    this.positionX,
                positionY:
                    this.positionY,
                velocityX:
                    this.velocityX,
                velocityY:
                    this.velocityY,
                waterAmount:
                    this.waterAmount,
            };
        }

        this.positionX +=
            this.velocityX * deltaTime +
            0.5 *
            effectiveWindAccelerationX *
            deltaTime *
            deltaTime;

        this.positionY +=
            this.velocityY * deltaTime +
            0.5 *
            effectiveWindAccelerationY *
            deltaTime *
            deltaTime;

        this.velocityX +=
            effectiveWindAccelerationX *
            deltaTime;

        this.velocityY +=
            effectiveWindAccelerationY *
            deltaTime;

        this.height =
            Math.max(
                0,
                nextHeight,
            );

        this.verticalVelocity =
            nextVerticalVelocity;

        this.age +=
            deltaTime;

        return null;
    }

    public getSourceId(): string {
        return this.sourceId;
    }

    public getSourceType(): WaterSourceType {
        return this.sourceType;
    }

    public getSequence(): number {
        return this.sequence;
    }

    public getPositionX(): number {
        return this.positionX;
    }

    public getPositionY(): number {
        return this.positionY;
    }

    public getHeight(): number {
        return this.height;
    }

    public getVelocityX(): number {
        return this.velocityX;
    }

    public getVelocityY(): number {
        return this.velocityY;
    }

    public getVerticalVelocity(): number {
        return this.verticalVelocity;
    }

    public getWaterAmount(): number {
        return this.waterAmount;
    }

    public getWindResponse(): number {
        return this.windResponse;
    }

    public getAge(): number {
        return this.age;
    }
}
