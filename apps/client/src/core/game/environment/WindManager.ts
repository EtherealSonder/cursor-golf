import {
    DEFAULT_WIND_DEFINITION,
} from "../config/WindDefinition";

import type {
    WindDefinition,
    WindInfluenceCurvePoint,
    WindStrengthBand,
} from "../config/WindDefinition";

export interface WindVector {
    readonly x: number;
    readonly y: number;
}

export interface WindState {
    readonly directionDegrees: number;
    readonly directionRadians: number;

    /**
     * Environmental wind speed displayed in km/h.
     *
     * This value remains unchanged by the internal
     * physics conversion.
     */
    readonly strength: number;

    readonly normalizedStrength: number;
    readonly normalizedDirection: WindVector;

    /**
     * Base environmental wind acceleration before
     * Ball-speed influence scaling.
     *
     * Units: pixels per second squared.
     */
    readonly acceleration: WindVector;
}

export type WindStateListener = (
    windState: WindState,
) => void;

/**
 * Central owner of environmental wind state,
 * one-time session randomization, physical wind
 * conversion, and Ball-speed influence evaluation.
 */
export class WindManager {

    private readonly definition:
        WindDefinition;

    private readonly stateListeners:
        Set<WindStateListener> =
        new Set<WindStateListener>();

    private directionDegrees = 0;

    private directionRadians = 0;

    private strength = 0;

    private normalizedStrength = 0;

    private normalizedDirectionX = 1;

    private normalizedDirectionY = 0;

    private accelerationX = 0;

    private accelerationY = 0;

    constructor(
        definition:
            WindDefinition =
            DEFAULT_WIND_DEFINITION,
    ) {
        this.validateDefinition(
            definition,
        );

        this.definition =
            definition;

        this.initializeSessionWind();
    }

    // -------------------------------------------------------------------------
    // Session Initialization and Randomization
    // -------------------------------------------------------------------------

    /**
     * Selects one stable environmental condition for
     * the complete lifetime of this WindManager.
     *
     * A World creates one WindManager, so refreshing
     * or constructing a new Game creates a new wind
     * session. React rerenders and Ball shots do not.
     */
    private initializeSessionWind(): void {

        if (
            !this.definition
                .randomization
                .enabled
        ) {
            this.setWind(
                this.definition
                    .initialDirectionDegrees,

                this.definition
                    .initialStrength,
            );

            return;
        }

        this.randomizeWind();
    }

    /**
     * Generates and applies a new randomized wind
     * condition using the unchanged configured
     * direction range and weighted strength bands.
     *
     * C7 development controls call this method when
     * returning from deterministic preset mode to
     * normal randomized wind.
     *
     * When randomization is disabled, the configured
     * deterministic fallback is applied instead.
     */
    public randomizeWind(): void {

        if (
            !this.definition
                .randomization
                .enabled
        ) {
            this.setWind(
                this.definition
                    .initialDirectionDegrees,

                this.definition
                    .initialStrength,
            );

            return;
        }

        this.setWind(
            this.generateRandomDirectionDegrees(),
            this.generateWeightedRandomStrength(),
        );
    }

    /**
     * Generates a direction inside the configured
     * screen-space direction range.
     */
    private generateRandomDirectionDegrees():
        number {

        const randomization =
            this.definition
                .randomization;

        const directionRange =
            randomization
                .maximumDirectionDegrees -
            randomization
                .minimumDirectionDegrees;

        const direction =
            randomization
                .minimumDirectionDegrees +
            Math.random() *
            directionRange;

        return randomization
            .roundDirectionToInteger
            ? Math.floor(direction)
            : direction;
    }

    /**
     * Selects one configured speed band using its
     * probability weight, then generates a wind speed
     * inside the selected band.
     */
    private generateWeightedRandomStrength():
        number {

        const randomization =
            this.definition
                .randomization;

        const totalWeight =
            randomization
                .strengthBands
                .reduce(
                    (
                        currentTotal,
                        band,
                    ) =>
                        currentTotal +
                        band.probabilityWeight,
                    0,
                );

        let weightedSelection =
            Math.random() *
            totalWeight;

        let selectedBand =
            randomization
                .strengthBands[0];

        for (
            let bandIndex = 0;
            bandIndex <
            randomization
                .strengthBands
                .length;
            bandIndex += 1
        ) {
            const band =
                randomization
                    .strengthBands[
                bandIndex
                ];

            weightedSelection -=
                band.probabilityWeight;

            if (
                weightedSelection <= 0
            ) {
                selectedBand =
                    band;

                break;
            }
        }

        if (!selectedBand) {
            throw new Error(
                "WindManager could not select a random wind-strength band.",
            );
        }

        return this.generateStrengthInsideBand(
            selectedBand,
        );
    }

    /**
     * Generates one speed inside the selected
     * weighted band.
     */
    private generateStrengthInsideBand(
        band: WindStrengthBand,
    ): number {

        const randomization =
            this.definition
                .randomization;

        if (
            randomization
                .roundSpeedToInteger
        ) {
            const minimumInteger =
                Math.ceil(
                    band.minimumSpeedKph,
                );

            const maximumInteger =
                Math.floor(
                    band.maximumSpeedKph,
                );

            const inclusiveIntegerRange =
                maximumInteger -
                minimumInteger +
                1;

            return (
                minimumInteger +
                Math.floor(
                    Math.random() *
                    inclusiveIntegerRange,
                )
            );
        }

        return (
            band.minimumSpeedKph +
            Math.random() *
            (
                band.maximumSpeedKph -
                band.minimumSpeedKph
            )
        );
    }

    // -------------------------------------------------------------------------
    // Wind State Updates
    // -------------------------------------------------------------------------

    public setWind(
        directionDegrees: number,
        strength: number,
    ): void {

        this.validateDirectionDegrees(
            directionDegrees,
        );

        this.validateStrength(
            strength,
        );

        this.directionDegrees =
            this.normalizeDirectionDegrees(
                directionDegrees,
            );

        this.directionRadians =
            this.convertDegreesToRadians(
                this.directionDegrees,
            );

        this.strength =
            strength;

        this.recalculateDerivedState();

        this.notifyStateListeners();
    }

    public setDirectionDegrees(
        directionDegrees: number,
    ): void {

        this.setWind(
            directionDegrees,
            this.strength,
        );
    }

    public setStrength(
        strength: number,
    ): void {

        this.setWind(
            this.directionDegrees,
            strength,
        );
    }

    /**
     * Restores the deterministic fallback values.
     *
     * This does not generate another random session.
     */
    public reset(): void {

        this.setWind(
            this.definition
                .initialDirectionDegrees,

            this.definition
                .initialStrength,
        );
    }

    // -------------------------------------------------------------------------
    // Wind State Subscription
    // -------------------------------------------------------------------------

    /**
     * Registers a listener and immediately supplies
     * the current stable wind state.
     */
    public subscribe(
        listener: WindStateListener,
    ): () => void {

        this.stateListeners.add(
            listener,
        );

        listener(
            this.getState(),
        );

        let unsubscribed =
            false;

        return (): void => {

            if (unsubscribed) {
                return;
            }

            unsubscribed =
                true;

            this.stateListeners.delete(
                listener,
            );
        };
    }

    private notifyStateListeners(): void {

        if (
            this.stateListeners.size ===
            0
        ) {
            return;
        }

        const state =
            this.getState();

        this.stateListeners.forEach(
            (
                listener,
            ): void => {

                listener(
                    state,
                );
            },
        );
    }

    // -------------------------------------------------------------------------
    // Wind State Queries
    // -------------------------------------------------------------------------

    public getState():
        WindState {

        return {
            directionDegrees:
                this.directionDegrees,

            directionRadians:
                this.directionRadians,

            strength:
                this.strength,

            normalizedStrength:
                this.normalizedStrength,

            normalizedDirection: {
                x:
                    this.normalizedDirectionX,

                y:
                    this.normalizedDirectionY,
            },

            acceleration: {
                x:
                    this.accelerationX,

                y:
                    this.accelerationY,
            },
        };
    }

    public getDefinition():
        WindDefinition {

        return this.definition;
    }

    public getDirectionDegrees():
        number {

        return this.directionDegrees;
    }

    public getDirectionRadians():
        number {

        return this.directionRadians;
    }

    public getStrength():
        number {

        return this.strength;
    }

    public getNormalizedStrength():
        number {

        return this.normalizedStrength;
    }

    public getNormalizedDirection():
        WindVector {

        return {
            x:
                this.normalizedDirectionX,

            y:
                this.normalizedDirectionY,
        };
    }

    public getAcceleration():
        WindVector {

        return {
            x:
                this.accelerationX,

            y:
                this.accelerationY,
        };
    }

    // -------------------------------------------------------------------------
    // Ball-Speed Influence
    // -------------------------------------------------------------------------

    public getInfluenceMultiplier(
        normalizedBallSpeed: number,
    ): number {

        const safeNormalizedSpeed =
            Math.min(
                Math.max(
                    normalizedBallSpeed,
                    0,
                ),
                1,
            );

        const curve =
            this.definition
                .influenceCurve;

        const firstPoint =
            curve[0];

        if (!firstPoint) {
            return 0;
        }

        if (
            safeNormalizedSpeed <=
            firstPoint.normalizedBallSpeed
        ) {
            return firstPoint
                .influenceMultiplier;
        }

        const finalPoint =
            curve[
            curve.length - 1
            ];

        if (!finalPoint) {
            return 0;
        }

        if (
            safeNormalizedSpeed >=
            finalPoint
                .normalizedBallSpeed
        ) {
            return finalPoint
                .influenceMultiplier;
        }

        for (
            let pointIndex = 1;
            pointIndex <
            curve.length;
            pointIndex += 1
        ) {
            const upperPoint =
                curve[
                pointIndex
                ];

            const lowerPoint =
                curve[
                pointIndex - 1
                ];

            if (
                !upperPoint ||
                !lowerPoint
            ) {
                continue;
            }

            if (
                safeNormalizedSpeed >
                upperPoint
                    .normalizedBallSpeed
            ) {
                continue;
            }

            return this.interpolateCurveSegment(
                safeNormalizedSpeed,
                lowerPoint,
                upperPoint,
            );
        }

        return finalPoint
            .influenceMultiplier;
    }

    public getScaledAcceleration(
        normalizedBallSpeed: number,
    ): WindVector {

        const influenceMultiplier =
            this.getInfluenceMultiplier(
                normalizedBallSpeed,
            );

        return this.capAcceleration(
            this.accelerationX *
            influenceMultiplier,

            this.accelerationY *
            influenceMultiplier,
        );
    }

    public getSafeScaledAcceleration(
        normalizedBallSpeed: number,
        velocityX: number,
        velocityY: number,
    ): WindVector {

        if (
            !Number.isFinite(
                velocityX,
            ) ||
            !Number.isFinite(
                velocityY,
            )
        ) {
            return {
                x: 0,
                y: 0,
            };
        }

        const scaledAcceleration =
            this.getScaledAcceleration(
                normalizedBallSpeed,
            );

        const currentSpeed =
            Math.hypot(
                velocityX,
                velocityY,
            );

        if (
            currentSpeed <= 0
        ) {
            return {
                x: 0,
                y: 0,
            };
        }

        if (
            currentSpeed >
            this.definition
                .reversalProtectionSpeed
        ) {
            return scaledAcceleration;
        }

        const directionX =
            velocityX /
            currentSpeed;

        const directionY =
            velocityY /
            currentSpeed;

        const accelerationAlongVelocity =
            scaledAcceleration.x *
            directionX +
            scaledAcceleration.y *
            directionY;

        if (
            accelerationAlongVelocity >= 0
        ) {
            return scaledAcceleration;
        }

        return this.capAcceleration(
            scaledAcceleration.x -
            directionX *
            accelerationAlongVelocity,

            scaledAcceleration.y -
            directionY *
            accelerationAlongVelocity,
        );
    }

    // -------------------------------------------------------------------------
    // Derived State and Acceleration
    // -------------------------------------------------------------------------

    private capAcceleration(
        accelerationX: number,
        accelerationY: number,
    ): WindVector {

        if (
            !Number.isFinite(
                accelerationX,
            ) ||
            !Number.isFinite(
                accelerationY,
            )
        ) {
            return {
                x: 0,
                y: 0,
            };
        }

        const accelerationMagnitude =
            Math.hypot(
                accelerationX,
                accelerationY,
            );

        if (
            accelerationMagnitude === 0 ||
            accelerationMagnitude <=
            this.definition
                .maximumAppliedAcceleration
        ) {
            return {
                x:
                    accelerationX,

                y:
                    accelerationY,
            };
        }

        const capRatio =
            this.definition
                .maximumAppliedAcceleration /
            accelerationMagnitude;

        return {
            x:
                accelerationX *
                capRatio,

            y:
                accelerationY *
                capRatio,
        };
    }

    private recalculateDerivedState():
        void {

        this.normalizedDirectionX =
            Math.cos(
                this.directionRadians,
            );

        this.normalizedDirectionY =
            Math.sin(
                this.directionRadians,
            );

        this.normalizedStrength =
            this.calculateNormalizedStrength(
                this.strength,
            );

        const convertedAccelerationMagnitude =
            this.strength *
            this.definition
                .accelerationPerKph;

        const safeAccelerationMagnitude =
            Math.min(
                convertedAccelerationMagnitude,

                this.definition
                    .maximumAcceleration,
            );

        this.accelerationX =
            this.normalizedDirectionX *
            safeAccelerationMagnitude;

        this.accelerationY =
            this.normalizedDirectionY *
            safeAccelerationMagnitude;
    }

    private calculateNormalizedStrength(
        strength: number,
    ): number {

        const strengthRange =
            this.definition
                .maximumStrength -
            this.definition
                .minimumStrength;

        if (
            strengthRange <= 0
        ) {
            return 0;
        }

        const normalizedStrength =
            (
                strength -
                this.definition
                    .minimumStrength
            ) /
            strengthRange;

        return Math.min(
            Math.max(
                normalizedStrength,
                0,
            ),
            1,
        );
    }

    private interpolateCurveSegment(
        normalizedBallSpeed: number,
        lowerPoint:
            WindInfluenceCurvePoint,
        upperPoint:
            WindInfluenceCurvePoint,
    ): number {

        const segmentWidth =
            upperPoint
                .normalizedBallSpeed -
            lowerPoint
                .normalizedBallSpeed;

        if (
            segmentWidth <= 0
        ) {
            return upperPoint
                .influenceMultiplier;
        }

        const interpolationRatio =
            (
                normalizedBallSpeed -
                lowerPoint
                    .normalizedBallSpeed
            ) /
            segmentWidth;

        return (
            lowerPoint
                .influenceMultiplier +
            (
                upperPoint
                    .influenceMultiplier -
                lowerPoint
                    .influenceMultiplier
            ) *
            interpolationRatio
        );
    }

    private normalizeDirectionDegrees(
        directionDegrees: number,
    ): number {

        return (
            (
                directionDegrees %
                360
            ) +
            360
        ) %
            360;
    }

    private convertDegreesToRadians(
        directionDegrees: number,
    ): number {

        return (
            directionDegrees *
            Math.PI
        ) /
            180;
    }

    // -------------------------------------------------------------------------
    // Validation
    // -------------------------------------------------------------------------

    private validateDefinition(
        definition:
            WindDefinition,
    ): void {

        this.validateFiniteNumber(
            definition
                .initialDirectionDegrees,

            "Wind initialDirectionDegrees",
        );

        this.validateFiniteNumber(
            definition
                .initialStrength,

            "Wind initialStrength",
        );

        this.validateFiniteNumber(
            definition
                .minimumStrength,

            "Wind minimumStrength",
        );

        this.validateFiniteNumber(
            definition
                .maximumStrength,

            "Wind maximumStrength",
        );

        if (
            definition
                .minimumStrength < 0
        ) {
            throw new Error(
                "Wind minimumStrength cannot be negative.",
            );
        }

        if (
            definition
                .maximumStrength <=
            definition
                .minimumStrength
        ) {
            throw new Error(
                "Wind maximumStrength must be greater than minimumStrength.",
            );
        }

        if (
            definition
                .initialStrength <
            definition
                .minimumStrength ||
            definition
                .initialStrength >
            definition
                .maximumStrength
        ) {
            throw new Error(
                "Wind initialStrength must remain inside the configured strength range.",
            );
        }

        this.validateFiniteNumber(
            definition
                .accelerationPerKph,

            "Wind accelerationPerKph",
        );

        if (
            definition
                .accelerationPerKph < 0
        ) {
            throw new Error(
                "Wind accelerationPerKph cannot be negative.",
            );
        }

        this.validateFiniteNumber(
            definition
                .maximumAcceleration,

            "Wind maximumAcceleration",
        );

        if (
            definition
                .maximumAcceleration < 0
        ) {
            throw new Error(
                "Wind maximumAcceleration cannot be negative.",
            );
        }

        this.validateFiniteNumber(
            definition
                .maximumAppliedAcceleration,

            "Wind maximumAppliedAcceleration",
        );

        if (
            definition
                .maximumAppliedAcceleration < 0
        ) {
            throw new Error(
                "Wind maximumAppliedAcceleration cannot be negative.",
            );
        }

        this.validateRandomizationDefinition(
            definition,
        );

        this.validateFiniteNumber(
            definition
                .reversalProtectionSpeed,

            "Wind reversalProtectionSpeed",
        );

        if (
            definition
                .reversalProtectionSpeed < 0
        ) {
            throw new Error(
                "Wind reversalProtectionSpeed cannot be negative.",
            );
        }

        this.validateFiniteNumber(
            definition
                .restStabilitySpeedMultiplier,

            "Wind restStabilitySpeedMultiplier",
        );

        if (
            definition
                .restStabilitySpeedMultiplier < 1
        ) {
            throw new Error(
                "Wind restStabilitySpeedMultiplier must be at least 1.",
            );
        }

        this.validateFiniteNumber(
            definition
                .restStabilityDuration,

            "Wind restStabilityDuration",
        );

        if (
            definition
                .restStabilityDuration < 0
        ) {
            throw new Error(
                "Wind restStabilityDuration cannot be negative.",
            );
        }

        this.validateInfluenceCurve(
            definition
                .influenceCurve,
        );
    }

    private validateRandomizationDefinition(
        definition:
            WindDefinition,
    ): void {

        const randomization =
            definition
                .randomization;

        this.validateFiniteNumber(
            randomization
                .minimumDirectionDegrees,

            "Wind randomization minimumDirectionDegrees",
        );

        this.validateFiniteNumber(
            randomization
                .maximumDirectionDegrees,

            "Wind randomization maximumDirectionDegrees",
        );

        if (
            randomization
                .maximumDirectionDegrees <=
            randomization
                .minimumDirectionDegrees
        ) {
            throw new Error(
                "Wind randomization maximumDirectionDegrees must be greater than minimumDirectionDegrees.",
            );
        }

        if (
            randomization
                .strengthBands
                .length === 0
        ) {
            throw new Error(
                "Wind randomization requires at least one strength band.",
            );
        }

        let totalWeight = 0;

        for (
            let bandIndex = 0;
            bandIndex <
            randomization
                .strengthBands
                .length;
            bandIndex += 1
        ) {
            const band =
                randomization
                    .strengthBands[
                bandIndex
                ];

            this.validateFiniteNumber(
                band.minimumSpeedKph,
                "Wind strength band minimumSpeedKph",
            );

            this.validateFiniteNumber(
                band.maximumSpeedKph,
                "Wind strength band maximumSpeedKph",
            );

            this.validateFiniteNumber(
                band.probabilityWeight,
                "Wind strength band probabilityWeight",
            );

            if (
                band.minimumSpeedKph <
                definition
                    .minimumStrength ||
                band.maximumSpeedKph >
                definition
                    .maximumStrength
            ) {
                throw new Error(
                    "Every Wind strength band must remain inside the global strength range.",
                );
            }

            if (
                band.maximumSpeedKph <
                band.minimumSpeedKph
            ) {
                throw new Error(
                    "Wind strength band maximumSpeedKph cannot be below minimumSpeedKph.",
                );
            }

            if (
                band.probabilityWeight <=
                0
            ) {
                throw new Error(
                    "Wind strength band probabilityWeight must be greater than zero.",
                );
            }

            totalWeight +=
                band.probabilityWeight;
        }

        if (
            totalWeight <= 0
        ) {
            throw new Error(
                "Wind randomization total probability weight must be greater than zero.",
            );
        }
    }

    private validateInfluenceCurve(
        curve:
            readonly WindInfluenceCurvePoint[],
    ): void {

        if (
            curve.length < 2
        ) {
            throw new Error(
                "Wind influenceCurve must contain at least two points.",
            );
        }

        let previousSpeed =
            Number.NEGATIVE_INFINITY;

        for (
            let pointIndex = 0;
            pointIndex <
            curve.length;
            pointIndex += 1
        ) {
            const point =
                curve[
                pointIndex
                ];

            if (!point) {
                throw new Error(
                    "Wind influenceCurve contains an invalid point.",
                );
            }

            this.validateFiniteNumber(
                point.normalizedBallSpeed,
                "Wind influenceCurve normalizedBallSpeed",
            );

            this.validateFiniteNumber(
                point.influenceMultiplier,
                "Wind influenceCurve influenceMultiplier",
            );

            if (
                point.normalizedBallSpeed < 0 ||
                point.normalizedBallSpeed > 1
            ) {
                throw new Error(
                    "Wind influenceCurve normalizedBallSpeed must remain between 0 and 1.",
                );
            }

            if (
                point.influenceMultiplier < 0
            ) {
                throw new Error(
                    "Wind influenceCurve influenceMultiplier cannot be negative.",
                );
            }

            if (
                point.normalizedBallSpeed <=
                previousSpeed
            ) {
                throw new Error(
                    "Wind influenceCurve points must be ordered by strictly increasing normalizedBallSpeed.",
                );
            }

            previousSpeed =
                point.normalizedBallSpeed;
        }

        const firstPoint =
            curve[0];

        const finalPoint =
            curve[
            curve.length - 1
            ];

        if (
            !firstPoint ||
            firstPoint
                .normalizedBallSpeed !== 0
        ) {
            throw new Error(
                "Wind influenceCurve must begin at normalizedBallSpeed 0.",
            );
        }

        if (
            !finalPoint ||
            finalPoint
                .normalizedBallSpeed !== 1
        ) {
            throw new Error(
                "Wind influenceCurve must end at normalizedBallSpeed 1.",
            );
        }
    }

    private validateDirectionDegrees(
        directionDegrees: number,
    ): void {

        this.validateFiniteNumber(
            directionDegrees,
            "Wind directionDegrees",
        );
    }

    private validateStrength(
        strength: number,
    ): void {

        this.validateFiniteNumber(
            strength,
            "Wind strength",
        );

        if (
            strength <
            this.definition
                .minimumStrength ||
            strength >
            this.definition
                .maximumStrength
        ) {
            throw new Error(
                "Wind strength must remain inside the configured strength range.",
            );
        }
    }

    private validateFiniteNumber(
        value: number,
        valueName: string,
    ): void {

        if (
            !Number.isFinite(
                value,
            )
        ) {
            throw new Error(
                `${valueName} must be a finite number.`,
            );
        }
    }
}