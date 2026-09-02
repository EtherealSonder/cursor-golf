import type {
    LocalWindSourceDefinition,
} from "../config/LocalWindDefinition";

import {
    DEFAULT_LOCAL_WIND_SOURCE_DEFINITIONS,
} from "../config/LocalWindDefinition";

export interface LocalWindVector {
    readonly x: number;
    readonly y: number;
}

export interface LocalWindSample {
    readonly acceleration: LocalWindVector;
    readonly contributingSourceIds: readonly string[];
}

/**
 * Authoritative query service for spatial directional
 * airflow.
 *
 * The system owns no rendering and no Ball state.
 * Consumers ask for the acceleration at a world-space
 * point. Overlapping sources are combined by vector
 * addition.
 */
export class LocalWindSystem {

    private sources:
        readonly LocalWindSourceDefinition[];

    constructor(
        sources:
            readonly LocalWindSourceDefinition[] =
            DEFAULT_LOCAL_WIND_SOURCE_DEFINITIONS,
    ) {
        this.validateSources(
            sources,
        );

        this.sources =
            sources.map(
                (
                    source,
                ) => ({
                    ...source,
                }),
            );
    }

    public getSources():
        readonly LocalWindSourceDefinition[] {

        return this.sources;
    }

    public replaceSources(
        sources:
            readonly LocalWindSourceDefinition[],
    ): void {

        this.validateSources(sources);

        this.sources =
            sources.map(
                (source) => ({
                    ...source,
                }),
            );
    }

    public getAccelerationAt(
        worldX: number,
        worldY: number,
    ): LocalWindVector {

        return this.sampleAt(
            worldX,
            worldY,
        ).acceleration;
    }

    public sampleAt(
        worldX: number,
        worldY: number,
    ): LocalWindSample {

        if (
            !Number.isFinite(
                worldX,
            ) ||
            !Number.isFinite(
                worldY,
            )
        ) {
            return {
                acceleration: {
                    x: 0,
                    y: 0,
                },
                contributingSourceIds: [],
            };
        }

        let accelerationX = 0;
        let accelerationY = 0;

        const contributingSourceIds:
            string[] = [];

        for (
            const source
            of this.sources
        ) {
            const sourceAcceleration =
                this.getSourceAccelerationAt(
                    source,
                    worldX,
                    worldY,
                );

            if (
                sourceAcceleration.x === 0 &&
                sourceAcceleration.y === 0
            ) {
                continue;
            }

            accelerationX +=
                sourceAcceleration.x;

            accelerationY +=
                sourceAcceleration.y;

            contributingSourceIds.push(
                source.id,
            );
        }

        return {
            acceleration: {
                x: accelerationX,
                y: accelerationY,
            },
            contributingSourceIds,
        };
    }

    public containsPoint(
        source:
            LocalWindSourceDefinition,

        worldX: number,
        worldY: number,
    ): boolean {

        return (
            this.calculateSourceInfluence(
                source,
                worldX,
                worldY,
            ) >
            0
        );
    }

    private getSourceAccelerationAt(
        source:
            LocalWindSourceDefinition,

        worldX: number,
        worldY: number,
    ): LocalWindVector {

        const influence =
            this.calculateSourceInfluence(
                source,
                worldX,
                worldY,
            );

        if (
            influence <=
            0
        ) {
            return {
                x: 0,
                y: 0,
            };
        }

        const directionX =
            Math.cos(
                source.directionRadians,
            );

        const directionY =
            Math.sin(
                source.directionRadians,
            );

        const accelerationMagnitude =
            source.acceleration *
            influence;

        return {
            x:
                directionX *
                accelerationMagnitude,

            y:
                directionY *
                accelerationMagnitude,
        };
    }

    /**
     * Returns a normalized source influence.
     *
     * 0 = outside/no influence
     * 1 = full source-centre influence
     *
     * The region is a widening trapezoid in source
     * local space. Strength falls gradually with
     * distance and near the lateral edges.
     */
    private calculateSourceInfluence(
        source:
            LocalWindSourceDefinition,

        worldX: number,
        worldY: number,
    ): number {

        if (
            !source.enabled
        ) {
            return 0;
        }

        const directionX =
            Math.cos(
                source.directionRadians,
            );

        const directionY =
            Math.sin(
                source.directionRadians,
            );

        const perpendicularX =
            -directionY;

        const perpendicularY =
            directionX;

        const offsetX =
            worldX -
            source.positionX;

        const offsetY =
            worldY -
            source.positionY;

        const longitudinalDistance =
            offsetX *
            directionX +
            offsetY *
            directionY;

        if (
            longitudinalDistance <
            0 ||
            longitudinalDistance >
            source.range
        ) {
            return 0;
        }

        const rangeProgress =
            source.range >
                0
                ? longitudinalDistance /
                source.range
                : 0;

        const currentHalfWidth =
            this.lerp(
                source.startHalfWidth,
                source.endHalfWidth,
                rangeProgress,
            );

        const lateralDistance =
            Math.abs(
                offsetX *
                perpendicularX +
                offsetY *
                perpendicularY,
            );

        if (
            lateralDistance >
            currentHalfWidth
        ) {
            return 0;
        }

        const longitudinalMultiplier =
            this.lerp(
                1,
                source.endStrengthMultiplier,
                rangeProgress,
            );

        const edgeFalloffWidth =
            currentHalfWidth *
            source.edgeFalloffFraction;

        let lateralMultiplier =
            1;

        if (
            edgeFalloffWidth >
            0
        ) {
            const fullStrengthHalfWidth =
                currentHalfWidth -
                edgeFalloffWidth;

            if (
                lateralDistance >
                fullStrengthHalfWidth
            ) {
                lateralMultiplier =
                    1 -
                    (
                        lateralDistance -
                        fullStrengthHalfWidth
                    ) /
                    edgeFalloffWidth;
            }
        }

        return Math.min(
            1,
            Math.max(
                0,
                longitudinalMultiplier *
                lateralMultiplier,
            ),
        );
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
            Math.min(
                Math.max(
                    amount,
                    0,
                ),
                1,
            )
        );
    }

    private validateSources(
        sources:
            readonly LocalWindSourceDefinition[],
    ): void {

        const ids =
            new Set<string>();

        for (
            const source
            of sources
        ) {
            if (
                source.id.trim()
                    .length ===
                0
            ) {
                throw new Error(
                    "Local wind source id cannot be empty.",
                );
            }

            if (
                ids.has(
                    source.id,
                )
            ) {
                throw new Error(
                    `Duplicate local wind source id '${source.id}'.`,
                );
            }

            ids.add(
                source.id,
            );

            const finiteValues = [
                source.positionX,
                source.positionY,
                source.directionRadians,
                source.range,
                source.startHalfWidth,
                source.endHalfWidth,
                source.acceleration,
                source.endStrengthMultiplier,
                source.edgeFalloffFraction,
            ];

            if (
                !finiteValues.every(
                    Number.isFinite,
                )
            ) {
                throw new Error(
                    `Local wind source '${source.id}' contains a non-finite value.`,
                );
            }

            if (
                source.range <=
                0 ||
                source.startHalfWidth <=
                0 ||
                source.endHalfWidth <=
                0
            ) {
                throw new Error(
                    `Local wind source '${source.id}' requires positive range and widths.`,
                );
            }

            if (
                source.acceleration <
                0
            ) {
                throw new Error(
                    `Local wind source '${source.id}' acceleration cannot be negative.`,
                );
            }

            if (
                source.endStrengthMultiplier <
                0 ||
                source.endStrengthMultiplier >
                1
            ) {
                throw new Error(
                    `Local wind source '${source.id}' endStrengthMultiplier must remain between 0 and 1.`,
                );
            }

            if (
                source.edgeFalloffFraction <
                0 ||
                source.edgeFalloffFraction >
                1
            ) {
                throw new Error(
                    `Local wind source '${source.id}' edgeFalloffFraction must remain between 0 and 1.`,
                );
            }
        }
    }
}
