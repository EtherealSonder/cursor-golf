import {
    DEFAULT_CAMERA_FEEDBACK_DEFINITION,
} from "../config/CameraShakeDefinition";

import type {
    CameraShakeDefinition,
    CameraShakeRequest,
} from "../config/CameraShakeDefinition";

export interface CameraShakeOffset {
    readonly x: number;
    readonly y: number;
}

/**
 * Generic render-only Camera shake engine.
 *
 * This class never changes the authoritative Camera
 * position. It produces only a temporary offset that
 * World applies while rendering the World Container.
 */
export class CameraShake {

    private readonly definition:
        CameraShakeDefinition;

    private enabled:
        boolean;

    private reducedMotionEnabled:
        boolean;

    private elapsedTime =
        0;

    private duration =
        0;

    private amplitude =
        0;

    private frequency =
        0;

    private decayExponent =
        1;

    private roughness =
        0;

    private preferredDirectionX =
        0;

    private preferredDirectionY =
        0;

    private directionalBias =
        0;

    private directionalBiasDecayExponent =
        1;

    private phase =
        0;

    private offsetX =
        0;

    private offsetY =
        0;

    constructor(
        definition:
            CameraShakeDefinition =
            DEFAULT_CAMERA_FEEDBACK_DEFINITION
                .shake,
    ) {

        this.validateDefinition(
            definition,
        );

        this.definition =
            definition;

        this.enabled =
            definition.enabled;

        this.reducedMotionEnabled =
            definition.reducedMotionEnabled;
    }

    // -------------------------------------------------------
    // Triggering
    // -------------------------------------------------------

    /**
     * Adds a new shake request to the current shake.
     *
     * Existing and incoming amplitudes are combined
     * using root-sum-square stacking. This allows
     * overlapping events to feel stronger without
     * growing linearly without limit.
     */
    public trigger(
        request:
            CameraShakeRequest,
    ): void {

        this.validateRequest(
            request,
        );

        if (
            !this.enabled ||
            request.amplitude <=
            0 ||
            request.duration <=
            0
        ) {
            return;
        }

        const amplitudeMultiplier =
            this.reducedMotionEnabled
                ? this.definition
                    .reducedMotionAmplitudeMultiplier
                : 1;

        const durationMultiplier =
            this.reducedMotionEnabled
                ? this.definition
                    .reducedMotionDurationMultiplier
                : 1;

        const incomingAmplitude =
            Math.min(
                request.amplitude *
                amplitudeMultiplier,

                this.definition
                    .maximumAmplitude,
            );

        const incomingDuration =
            Math.min(
                request.duration *
                durationMultiplier,

                this.definition
                    .maximumDuration,
            );

        if (
            incomingAmplitude <
            this.definition
                .minimumVisibleAmplitude ||
            incomingDuration <=
            0
        ) {
            return;
        }

        const existingRemainingRatio =
            this.duration > 0
                ? Math.max(
                    0,
                    1 -
                    this.elapsedTime /
                    this.duration,
                )
                : 0;

        const existingAmplitude =
            this.amplitude *
            Math.pow(
                existingRemainingRatio,
                this.decayExponent,
            );

        const combinedAmplitude =
            Math.hypot(
                existingAmplitude,
                incomingAmplitude,
            );

        const totalEnergy =
            existingAmplitude +
            incomingAmplitude;

        this.amplitude =
            Math.min(
                combinedAmplitude,
                this.definition
                    .maximumAmplitude,
            );

        this.duration =
            Math.min(
                Math.max(
                    this.getRemainingDuration(),
                    incomingDuration,
                ),
                this.definition
                    .maximumDuration,
            );

        this.frequency =
            totalEnergy > 0
                ? (
                    this.frequency *
                    existingAmplitude +
                    request.frequency *
                    incomingAmplitude
                ) /
                totalEnergy
                : request.frequency;

        this.roughness =
            totalEnergy > 0
                ? (
                    this.roughness *
                    existingAmplitude +
                    request.roughness *
                    incomingAmplitude
                ) /
                totalEnergy
                : request.roughness;

        this.decayExponent =
            totalEnergy > 0
                ? (
                    this.decayExponent *
                    existingAmplitude +
                    request.decayExponent *
                    incomingAmplitude
                ) /
                totalEnergy
                : request.decayExponent;

        const incomingDirectionX = request.preferredDirectionX ?? 0;
        const incomingDirectionY = request.preferredDirectionY ?? 0;
        const incomingDirectionMagnitude = Math.hypot(incomingDirectionX, incomingDirectionY);
        const incomingBias = this.clamp01(request.directionalBias ?? 0);
        const existingDirectionalEnergy = existingAmplitude * this.directionalBias;
        const incomingDirectionalEnergy = incomingAmplitude * incomingBias;
        const combinedDirectionX =
            this.preferredDirectionX * existingDirectionalEnergy +
            (incomingDirectionMagnitude > 0 ? incomingDirectionX / incomingDirectionMagnitude : 0) * incomingDirectionalEnergy;
        const combinedDirectionY =
            this.preferredDirectionY * existingDirectionalEnergy +
            (incomingDirectionMagnitude > 0 ? incomingDirectionY / incomingDirectionMagnitude : 0) * incomingDirectionalEnergy;
        const combinedDirectionMagnitude = Math.hypot(combinedDirectionX, combinedDirectionY);
        const combinedDirectionalEnergy = existingDirectionalEnergy + incomingDirectionalEnergy;

        this.preferredDirectionX = combinedDirectionMagnitude > 0 ? combinedDirectionX / combinedDirectionMagnitude : 0;
        this.preferredDirectionY = combinedDirectionMagnitude > 0 ? combinedDirectionY / combinedDirectionMagnitude : 0;
        this.directionalBias = totalEnergy > 0
            ? this.clamp01(combinedDirectionalEnergy / totalEnergy)
            : incomingBias;
        this.directionalBiasDecayExponent = totalEnergy > 0
            ? (
                this.directionalBiasDecayExponent * existingAmplitude +
                (request.directionalBiasDecayExponent ?? 1) * incomingAmplitude
            ) / totalEnergy
            : (request.directionalBiasDecayExponent ?? 1);

        this.elapsedTime =
            0;

        /*
         * Advancing phase for every trigger prevents
         * repeated events from restarting with the
         * exact same screen-space displacement.
         */
        this.phase =
            (
                this.phase +
                Math.PI *
                0.61803398875
            ) %
            (
                Math.PI *
                2
            );
    }

    // -------------------------------------------------------
    // Frame Update
    // -------------------------------------------------------

    public update(
        deltaTime:
            number,
    ): void {

        if (
            !this.enabled ||
            this.duration <=
            0 ||
            this.amplitude <=
            0
        ) {
            this.resetOffset();

            return;
        }

        const safeDeltaTime =
            Math.min(
                Math.max(
                    deltaTime,
                    0,
                ),

                this.definition
                    .maximumDeltaTime,
            );

        if (
            safeDeltaTime <=
            0
        ) {
            return;
        }

        this.elapsedTime +=
            safeDeltaTime;

        if (
            this.elapsedTime >=
            this.duration
        ) {
            this.clear();

            return;
        }

        const normalizedTime =
            this.elapsedTime /
            this.duration;

        const remainingRatio =
            1 -
            normalizedTime;

        const decayedAmplitude =
            this.amplitude *
            Math.pow(
                remainingRatio,
                this.decayExponent,
            );

        if (
            decayedAmplitude <
            this.definition
                .minimumVisibleAmplitude
        ) {
            this.clear();

            return;
        }

        const angularTime =
            this.elapsedTime *
            this.frequency *
            Math.PI *
            2 +
            this.phase;

        const cleanX =
            Math.sin(
                angularTime,
            );

        const cleanY =
            Math.cos(
                angularTime *
                this.definition
                    .secondaryFrequencyRatio +
                0.73,
            );

        const roughX =
            Math.sin(
                angularTime *
                this.definition
                    .tertiaryFrequencyRatio +
                1.91,
            );

        const roughY =
            Math.cos(
                angularTime *
                (
                    this.definition
                        .tertiaryFrequencyRatio +
                    0.27
                ) +
                2.47,
            );

        const mixedX =
            cleanX *
            (
                1 -
                this.roughness
            ) +
            roughX *
            this.roughness;

        const mixedY =
            cleanY *
            (
                1 -
                this.roughness
            ) +
            roughY *
            this.roughness;

        const vectorMagnitude =
            Math.hypot(
                mixedX,
                mixedY,
            );

        if (
            vectorMagnitude <=
            0
        ) {
            this.resetOffset();

            return;
        }

        const ordinaryX = mixedX / vectorMagnitude;
        const ordinaryY = mixedY / vectorMagnitude;
        const directionalWave = Math.sin(angularTime * 0.83 + 0.41);
        const activeDirectionalBias =
            this.directionalBias *
            Math.pow(remainingRatio, this.directionalBiasDecayExponent);

        const blendedX =
            ordinaryX * (1 - activeDirectionalBias) +
            this.preferredDirectionX * directionalWave * activeDirectionalBias;
        const blendedY =
            ordinaryY * (1 - activeDirectionalBias) +
            this.preferredDirectionY * directionalWave * activeDirectionalBias;
        const blendedMagnitude = Math.hypot(blendedX, blendedY);

        if (blendedMagnitude <= 0) {
            this.resetOffset();
            return;
        }

        this.offsetX = blendedX / blendedMagnitude * decayedAmplitude;
        this.offsetY = blendedY / blendedMagnitude * decayedAmplitude;
    }

    // -------------------------------------------------------
    // State
    // -------------------------------------------------------

    public clear(): void {

        this.elapsedTime =
            0;

        this.duration =
            0;

        this.amplitude =
            0;

        this.frequency =
            0;

        this.decayExponent =
            1;

        this.roughness =
            0;

        this.preferredDirectionX = 0;
        this.preferredDirectionY = 0;
        this.directionalBias = 0;
        this.directionalBiasDecayExponent = 1;

        this.resetOffset();
    }

    public setEnabled(
        enabled:
            boolean,
    ): void {

        this.enabled =
            enabled;

        if (!enabled) {
            this.clear();
        }
    }

    public isEnabled():
        boolean {

        return this.enabled;
    }

    public setReducedMotionEnabled(
        enabled:
            boolean,
    ): void {

        this.reducedMotionEnabled =
            enabled;
    }

    public isReducedMotionEnabled():
        boolean {

        return this.reducedMotionEnabled;
    }

    public isActive():
        boolean {

        return (
            this.enabled &&
            this.duration >
            0 &&
            this.elapsedTime <
            this.duration
        );
    }

    public getOffset():
        CameraShakeOffset {

        return {
            x:
                this.offsetX,

            y:
                this.offsetY,
        };
    }

    public getOffsetX():
        number {

        return this.offsetX;
    }

    public getOffsetY():
        number {

        return this.offsetY;
    }

    private getRemainingDuration():
        number {

        return Math.max(
            0,
            this.duration -
            this.elapsedTime,
        );
    }

    private resetOffset():
        void {

        this.offsetX =
            0;

        this.offsetY =
            0;
    }

    private clamp01(value: number): number {
        return Math.max(0, Math.min(value, 1));
    }

    // -------------------------------------------------------
    // Validation
    // -------------------------------------------------------

    private validateDefinition(
        definition:
            CameraShakeDefinition,
    ): void {

        const finiteValues = [
            definition.reducedMotionAmplitudeMultiplier,
            definition.reducedMotionDurationMultiplier,
            definition.maximumAmplitude,
            definition.maximumDuration,
            definition.minimumVisibleAmplitude,
            definition.maximumDeltaTime,
            definition.secondaryFrequencyRatio,
            definition.tertiaryFrequencyRatio,
        ];

        if (
            !finiteValues.every(
                Number.isFinite,
            )
        ) {
            throw new Error(
                "Camera shake definition values must be finite numbers.",
            );
        }

        if (
            definition
                .reducedMotionAmplitudeMultiplier <
            0 ||
            definition
                .reducedMotionAmplitudeMultiplier >
            1 ||
            definition
                .reducedMotionDurationMultiplier <
            0 ||
            definition
                .reducedMotionDurationMultiplier >
            1
        ) {
            throw new Error(
                "Camera shake reduced-motion multipliers must remain between zero and one.",
            );
        }

        if (
            definition.maximumAmplitude <=
            0 ||
            definition.maximumDuration <=
            0 ||
            definition.minimumVisibleAmplitude <
            0 ||
            definition.maximumDeltaTime <=
            0 ||
            definition.secondaryFrequencyRatio <=
            0 ||
            definition.tertiaryFrequencyRatio <=
            0
        ) {
            throw new Error(
                "Camera shake limits and frequency ratios are invalid.",
            );
        }
    }

    private validateRequest(
        request:
            CameraShakeRequest,
    ): void {

        if (
            ![
                request.amplitude,
                request.duration,
                request.frequency,
                request.decayExponent,
                request.roughness,
                request.preferredDirectionX ?? 0,
                request.preferredDirectionY ?? 0,
                request.directionalBias ?? 0,
                request.directionalBiasDecayExponent ?? 1,
            ].every(
                Number.isFinite,
            )
        ) {
            throw new Error(
                "Camera shake request values must be finite numbers.",
            );
        }

        if (
            request.amplitude <
            0 ||
            request.duration <
            0 ||
            request.frequency <=
            0 ||
            request.decayExponent <=
            0 ||
            request.roughness <
            0 ||
            request.roughness >
            1 ||
            (request.directionalBias ?? 0) < 0 ||
            (request.directionalBias ?? 0) > 1 ||
            (request.directionalBiasDecayExponent ?? 1) <= 0
        ) {
            throw new Error(
                "Camera shake request values are outside their legal ranges.",
            );
        }
    }
}
