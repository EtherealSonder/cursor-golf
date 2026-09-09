import type {
    WaterSourceDefinition,
    WaterSourceType,
} from "../config/WaterSourceDefinition";

import {
    validateWaterSourceDefinition,
} from "../config/WaterSourceDefinition";

/**
 * Mutable runtime state for one Water-producing source.
 *
 * The original definition remains immutable. Runtime transforms can later be
 * driven by physical mechanisms such as the movable Sprinkler.
 */
export class WaterSource {
    private enabled: boolean;
    private positionX: number;
    private positionY: number;
    private directionRadians: number;
    private emissionAccumulator = 0;
    private emissionSequence = 0;

    public constructor(
        private readonly definition:
            WaterSourceDefinition,
    ) {
        validateWaterSourceDefinition(
            definition,
        );

        this.enabled =
            definition.enabled;

        this.positionX =
            definition.positionX;

        this.positionY =
            definition.positionY;

        this.directionRadians =
            definition.directionRadians;
    }

    public getId(): string {
        return this.definition.id;
    }

    public getType(): WaterSourceType {
        return this.definition.type;
    }

    public isEnabled(): boolean {
        return this.enabled;
    }

    public setEnabled(
        enabled: boolean,
    ): void {
        this.enabled = enabled;
    }

    public getPositionX(): number {
        return this.positionX;
    }

    public getPositionY(): number {
        return this.positionY;
    }

    public setPosition(
        x: number,
        y: number,
    ): void {
        if (
            !Number.isFinite(x) ||
            !Number.isFinite(y)
        ) {
            throw new Error(
                `WaterSource '${this.getId()}' position must be finite.`,
            );
        }

        this.positionX = x;
        this.positionY = y;
    }

    public getDirectionRadians(): number {
        return this.directionRadians;
    }

    public setDirectionRadians(
        directionRadians: number,
    ): void {
        if (
            !Number.isFinite(
                directionRadians,
            )
        ) {
            throw new Error(
                `WaterSource '${this.getId()}' direction must be finite.`,
            );
        }

        this.directionRadians =
            directionRadians;
    }

    public getFlowRate(): number {
        return this.definition.flowRate;
    }

    public getEmissionInterval(): number {
        return this.definition.emissionInterval;
    }

    public getLaunchSpeed(): number {
        return this.definition.launchSpeed;
    }

    public getLaunchElevationRadians(): number {
        return this.definition.launchElevationRadians;
    }

    public getWindResponse(): number {
        return this.definition.windResponse;
    }

    /**
     * Quantity represented by one authoritative emission request.
     * Keeping flowRate authoritative prevents source-rate drift.
     */
    public getWaterPerEmission(): number {
        return (
            this.definition.flowRate *
            this.definition.emissionInterval
        );
    }

    public getEmissionSequence(): number {
        return this.emissionSequence;
    }

    /**
     * Advances source timing and returns the number of emissions now due.
     * No WaterField mutation occurs here.
     */
    public update(
        deltaTime: number,
    ): number {
        if (
            !this.enabled ||
            this.definition.flowRate <= 0 ||
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            return 0;
        }

        this.emissionAccumulator +=
            deltaTime;

        const interval =
            this.definition.emissionInterval;

        const due =
            Math.floor(
                (
                    this.emissionAccumulator +
                    1e-12
                ) /
                interval,
            );

        if (
            due <= 0
        ) {
            return 0;
        }

        this.emissionAccumulator -=
            due * interval;

        this.emissionSequence +=
            due;

        return due;
    }

    public reset(): void {
        this.enabled =
            this.definition.enabled;

        this.positionX =
            this.definition.positionX;

        this.positionY =
            this.definition.positionY;

        this.directionRadians =
            this.definition.directionRadians;

        this.emissionAccumulator = 0;
        this.emissionSequence = 0;
    }
}
