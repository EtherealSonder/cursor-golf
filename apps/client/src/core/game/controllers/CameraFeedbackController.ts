import type {
    CameraShake,
} from "../camera/CameraShake";

import {
    DEFAULT_CAMERA_FEEDBACK_DEFINITION,
} from "../config/CameraShakeDefinition";

import type {
    CameraFeedbackDefinition,
} from "../config/CameraShakeDefinition";

import type {
    BallImpactType,
} from "../entities/Ball";

/**
 * Converts gameplay events into generic Camera shake
 * requests.
 *
 * Physics and shot systems report event data only.
 * All visual tuning remains centralized here.
 */
export class CameraFeedbackController {

    private readonly cameraShake:
        CameraShake;

    private readonly definition:
        CameraFeedbackDefinition;

    constructor(
        cameraShake:
            CameraShake,

        definition:
            CameraFeedbackDefinition =
            DEFAULT_CAMERA_FEEDBACK_DEFINITION,
    ) {

        this.cameraShake =
            cameraShake;

        this.definition =
            definition;

        this.validateDefinition(
            definition,
        );
    }

    // -------------------------------------------------------
    // Shot Release
    // -------------------------------------------------------

    public triggerShotRelease(
        normalizedPower:
            number,

        accuracyQuality:
            number,

        isPerfect:
            boolean,
    ): void {

        if (
            !Number.isFinite(
                normalizedPower,
            ) ||
            !Number.isFinite(
                accuracyQuality,
            )
        ) {
            return;
        }

        const shotDefinition =
            this.definition
                .shot;

        const power =
            this.clamp(
                normalizedPower,
                0,
                1,
            );

        if (
            power <
            shotDefinition
                .minimumPowerForShake
        ) {
            return;
        }

        const accuracy =
            this.clamp(
                accuracyQuality,
                0,
                1,
            );

        const activePowerRange =
            1 -
            shotDefinition
                .minimumPowerForShake;

        const remappedPower =
            activePowerRange > 0
                ? (
                    power -
                    shotDefinition
                        .minimumPowerForShake
                ) /
                activePowerRange
                : 1;

        const powerEnergy =
            Math.pow(
                this.clamp(
                    remappedPower,
                    0,
                    1,
                ),

                shotDefinition
                    .powerExponent,
            );

        /*
         * Accuracy makes a valid release slightly more
         * pronounced, while the profile remains driven
         * primarily by power.
         */
        const accuracyAmplitudeMultiplier =
            0.82 +
            accuracy *
            0.18;

        let amplitude =
            shotDefinition
                .maximumAmplitude *
            powerEnergy *
            accuracyAmplitudeMultiplier;

        let duration =
            this.lerp(
                shotDefinition
                    .minimumDuration,

                shotDefinition
                    .maximumDuration,

                powerEnergy,
            );

        let frequency =
            this.lerp(
                shotDefinition
                    .inaccurateFrequency,

                shotDefinition
                    .accurateFrequency,

                accuracy,
            );

        let roughness =
            this.lerp(
                shotDefinition
                    .inaccurateRoughness,

                shotDefinition
                    .accurateRoughness,

                accuracy,
            );

        let decayExponent =
            this.lerp(
                shotDefinition
                    .inaccurateDecayExponent,

                shotDefinition
                    .accurateDecayExponent,

                accuracy,
            );

        if (isPerfect) {
            amplitude *=
                shotDefinition
                    .perfectAmplitudeMultiplier;

            duration *=
                shotDefinition
                    .perfectDurationMultiplier;

            frequency =
                shotDefinition
                    .perfectFrequency;

            roughness =
                shotDefinition
                    .perfectRoughness;

            decayExponent =
                shotDefinition
                    .perfectDecayExponent;
        }

        this.cameraShake.trigger({
            amplitude,
            duration,
            frequency,
            decayExponent,
            roughness,
        });
    }

    // -------------------------------------------------------
    // Ball Collision
    // -------------------------------------------------------

    public triggerCollision(
        impactType:
            BallImpactType,

        impactSpeed:
            number,
    ): void {

        if (
            !Number.isFinite(
                impactSpeed,
            )
        ) {
            return;
        }

        const collisionDefinition =
            this.definition
                .collision;

        if (
            impactSpeed <
            collisionDefinition
                .minimumImpactSpeed
        ) {
            return;
        }

        const impactRange =
            collisionDefinition
                .maximumImpactSpeed -
            collisionDefinition
                .minimumImpactSpeed;

        const normalizedImpact =
            impactRange > 0
                ? this.clamp(
                    (
                        impactSpeed -
                        collisionDefinition
                            .minimumImpactSpeed
                    ) /
                    impactRange,

                    0,
                    1,
                )
                : 1;

        const impactEnergy =
            Math.pow(
                normalizedImpact,
                collisionDefinition
                    .impactExponent,
            );

        /*
         * Dynamic objects absorb and share momentum,
         * so their visual pulse is slightly softer
         * than a boundary or static obstacle impact at
         * the same incoming Ball speed.
         */
        const typeMultiplier =
            impactType ===
                "dynamic-obstacle"
                ? 0.86
                : 1;

        this.cameraShake.trigger({
            amplitude:
                collisionDefinition
                    .maximumAmplitude *
                impactEnergy *
                typeMultiplier,

            duration:
                this.lerp(
                    collisionDefinition
                        .minimumDuration,

                    collisionDefinition
                        .maximumDuration,

                    impactEnergy,
                ),

            frequency:
                this.lerp(
                    collisionDefinition
                        .minimumFrequency,

                    collisionDefinition
                        .maximumFrequency,

                    impactEnergy,
                ),

            decayExponent:
                collisionDefinition
                    .decayExponent,

            roughness:
                this.lerp(
                    collisionDefinition
                        .minimumRoughness,

                    collisionDefinition
                        .maximumRoughness,

                    impactEnergy,
                ),
        });
    }

    // -------------------------------------------------------
    // Controls
    // -------------------------------------------------------

    public clear():
        void {

        this.cameraShake.clear();
    }

    public setEnabled(
        enabled:
            boolean,
    ): void {

        this.cameraShake
            .setEnabled(
                enabled,
            );
    }

    public setReducedMotionEnabled(
        enabled:
            boolean,
    ): void {

        this.cameraShake
            .setReducedMotionEnabled(
                enabled,
            );
    }

    // -------------------------------------------------------
    // Validation
    // -------------------------------------------------------

    private validateDefinition(
        definition:
            CameraFeedbackDefinition,
    ): void {

        const shot =
            definition.shot;

        const collision =
            definition.collision;

        const finiteValues = [
            shot.minimumPowerForShake,
            shot.powerExponent,
            shot.maximumAmplitude,
            shot.minimumDuration,
            shot.maximumDuration,
            shot.inaccurateFrequency,
            shot.accurateFrequency,
            shot.perfectFrequency,
            shot.inaccurateRoughness,
            shot.accurateRoughness,
            shot.perfectRoughness,
            shot.inaccurateDecayExponent,
            shot.accurateDecayExponent,
            shot.perfectDecayExponent,
            shot.perfectAmplitudeMultiplier,
            shot.perfectDurationMultiplier,
            collision.minimumImpactSpeed,
            collision.maximumImpactSpeed,
            collision.impactExponent,
            collision.maximumAmplitude,
            collision.minimumDuration,
            collision.maximumDuration,
            collision.minimumFrequency,
            collision.maximumFrequency,
            collision.minimumRoughness,
            collision.maximumRoughness,
            collision.decayExponent,
        ];

        if (
            !finiteValues.every(
                Number.isFinite,
            )
        ) {
            throw new Error(
                "Camera feedback definition values must be finite numbers.",
            );
        }

        if (
            shot.minimumPowerForShake <
            0 ||
            shot.minimumPowerForShake >=
            1 ||
            shot.powerExponent <=
            0 ||
            shot.maximumAmplitude <
            0 ||
            shot.minimumDuration <
            0 ||
            shot.maximumDuration <
            shot.minimumDuration ||
            shot.inaccurateFrequency <=
            0 ||
            shot.accurateFrequency <=
            0 ||
            shot.perfectFrequency <=
            0 ||
            shot.inaccurateDecayExponent <=
            0 ||
            shot.accurateDecayExponent <=
            0 ||
            shot.perfectDecayExponent <=
            0 ||
            shot.perfectAmplitudeMultiplier <
            0 ||
            shot.perfectDurationMultiplier <
            0
        ) {
            throw new Error(
                "Shot Camera feedback values are invalid.",
            );
        }

        const roughnessValues = [
            shot.inaccurateRoughness,
            shot.accurateRoughness,
            shot.perfectRoughness,
            collision.minimumRoughness,
            collision.maximumRoughness,
        ];

        if (
            roughnessValues.some(
                (
                    value:
                        number,
                ) =>
                    value <
                    0 ||
                    value >
                    1,
            )
        ) {
            throw new Error(
                "Camera feedback roughness values must remain between zero and one.",
            );
        }

        if (
            collision.minimumImpactSpeed <
            0 ||
            collision.maximumImpactSpeed <=
            collision.minimumImpactSpeed ||
            collision.impactExponent <=
            0 ||
            collision.maximumAmplitude <
            0 ||
            collision.minimumDuration <
            0 ||
            collision.maximumDuration <
            collision.minimumDuration ||
            collision.minimumFrequency <=
            0 ||
            collision.maximumFrequency <
            collision.minimumFrequency ||
            collision.maximumRoughness <
            collision.minimumRoughness ||
            collision.decayExponent <=
            0
        ) {
            throw new Error(
                "Collision Camera feedback values are invalid.",
            );
        }
    }

    // -------------------------------------------------------
    // Utilities
    // -------------------------------------------------------

    private lerp(
        minimum:
            number,

        maximum:
            number,

        ratio:
            number,
    ): number {

        return (
            minimum +
            (
                maximum -
                minimum
            ) *
            this.clamp(
                ratio,
                0,
                1,
            )
        );
    }

    private clamp(
        value:
            number,

        minimum:
            number,

        maximum:
            number,
    ): number {

        return Math.max(
            minimum,
            Math.min(
                value,
                maximum,
            ),
        );
    }
}
