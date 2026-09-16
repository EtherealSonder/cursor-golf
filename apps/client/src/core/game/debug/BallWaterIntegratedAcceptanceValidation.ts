import {
    DEFAULT_BALL_WATER_INTERACTION_DEFINITION,
} from "../config/BallWaterInteractionDefinition";

import {
    DEFAULT_BALL_WATER_SPLASH_DEFINITION,
} from "../config/BallWaterSplashDefinition";

import {
    BallWaterInteraction,
} from "../physics/water/BallWaterInteraction";

import {
    BallWaterSplashSystem,
} from "../physics/water/BallWaterSplashSystem";

import type {
    BallWaterSample,
} from "../physics/water/BallWaterSampler";

export interface BallWaterIntegratedAcceptanceReport {
    readonly dryPassed: boolean;
    readonly entryPassed: boolean;
    readonly continuousPassed: boolean;
    readonly exitReentryPassed: boolean;
    readonly resetPassed: boolean;
    readonly allFinitePassed: boolean;
    readonly passed: boolean;
}

/**
 * Phase 8E-10 final integrated Ball/Water lifecycle acceptance.
 *
 * This validation intentionally changes no production physics. It exercises
 * the existing standing-Water interaction and splash detector together through
 * dry, entry, continuous contact, exit, re-entry and reset states.
 */
export class BallWaterIntegratedAcceptanceValidation {
    private readonly deltaTime = 1 / 60;
    private readonly entrySpeed = 600;

    public run(): BallWaterIntegratedAcceptanceReport {
        const interaction = new BallWaterInteraction();
        const splashSystem = new BallWaterSplashSystem();

        const drySample = this.createSample(0, 0);

        const interactionDefinition =
            DEFAULT_BALL_WATER_INTERACTION_DEFINITION;

        const usableDepthRange =
            interactionDefinition.fullEffectDepth -
            interactionDefinition.minimumMeaningfulDepth;

        const meaningfulDepth =
            interactionDefinition.minimumMeaningfulDepth +
            usableDepthRange * 0.60;

        const wetSample =
            this.createSample(meaningfulDepth, 1);

        const checks: Array<readonly [string, boolean]> = [];

        // ---------------------------------------------------
        // A. Dry baseline
        // ---------------------------------------------------

        const dryState =
            interaction.update(
                drySample,
                this.deltaTime,
            );

        const drySplash =
            splashSystem.update({
                worldX: 0,
                worldY: 0,
                velocityX: this.entrySpeed,
                velocityY: 0,
                sample: drySample,
            });

        const dryResistancePassed =
            dryState.targetExposure === 0 &&
            dryState.smoothedExposure === 0 &&
            dryState.additionalResistance === 0;

        const drySplashPassed =
            drySplash === null &&
            splashSystem.isArmed() &&
            !splashSystem.isInSplashWater();

        checks.push(
            ["Dry baseline has zero Water resistance", dryResistancePassed],
            ["Dry baseline produces no splash", drySplashPassed],
        );

        // ---------------------------------------------------
        // B. Meaningful Water entry
        // ---------------------------------------------------

        const entryState =
            interaction.update(
                wetSample,
                this.deltaTime,
            );

        const firstSplash =
            splashSystem.update({
                worldX: 0,
                worldY: 0,
                velocityX: this.entrySpeed,
                velocityY: 0,
                sample: wetSample,
            });

        const entryDetectedPassed =
            entryState.isMeaningfullyWet &&
            entryState.representativeWetDepth >=
            interactionDefinition.minimumMeaningfulDepth;

        const entryExposurePassed =
            entryState.targetExposure > 0 &&
            entryState.smoothedExposure > 0;

        const entryResistancePassed =
            entryState.additionalResistance > 0;

        const firstSplashPassed =
            firstSplash !== null &&
            !splashSystem.isArmed() &&
            splashSystem.isInSplashWater();

        checks.push(
            ["Meaningful Water entry detected", entryDetectedPassed],
            ["Entry increases Water exposure", entryExposurePassed],
            ["Entry adds standing-Water resistance", entryResistancePassed],
            ["Entry emits exactly one splash", firstSplashPassed],
        );

        // ---------------------------------------------------
        // C. Continuous Water contact
        // ---------------------------------------------------

        let continuousState = entryState;
        let repeatedSplashCount = 0;

        for (let i = 0; i < 30; i += 1) {
            continuousState =
                interaction.update(
                    wetSample,
                    this.deltaTime,
                );

            const event =
                splashSystem.update({
                    worldX: 0,
                    worldY: 0,
                    velocityX: this.entrySpeed,
                    velocityY: 0,
                    sample: wetSample,
                });

            if (event !== null) {
                repeatedSplashCount += 1;
            }
        }

        const continuousResistancePassed =
            continuousState.additionalResistance > 0 &&
            continuousState.smoothedExposure > 0;

        const noSplashSpamPassed =
            repeatedSplashCount === 0 &&
            !splashSystem.isArmed();

        const boundedResistancePassed =
            continuousState.additionalResistance >= 0 &&
            continuousState.additionalResistance <=
            interactionDefinition.maximumAdditionalResistance;

        checks.push(
            ["Continuous Water maintains resistance", continuousResistancePassed],
            ["Continuous Water does not spam splashes", noSplashSpamPassed],
            ["Water resistance remains bounded", boundedResistancePassed],
        );

        // ---------------------------------------------------
        // D. Exit and re-entry
        // ---------------------------------------------------

        const exposureBeforeExit =
            continuousState.smoothedExposure;

        let exitState =
            interaction.update(
                drySample,
                this.deltaTime,
            );

        splashSystem.update({
            worldX: 0,
            worldY: 0,
            velocityX: this.entrySpeed,
            velocityY: 0,
            sample: drySample,
        });

        // Allow the existing exit smoothing to decay while dry.
        for (let i = 0; i < 30; i += 1) {
            exitState =
                interaction.update(
                    drySample,
                    this.deltaTime,
                );

            splashSystem.update({
                worldX: 0,
                worldY: 0,
                velocityX: this.entrySpeed,
                velocityY: 0,
                sample: drySample,
            });
        }

        const exitExposurePassed =
            exitState.targetExposure === 0 &&
            exitState.smoothedExposure <
            exposureBeforeExit;

        const exitRearmPassed =
            splashSystem.isArmed() &&
            !splashSystem.isInSplashWater();

        const reentryState =
            interaction.update(
                wetSample,
                this.deltaTime,
            );

        const secondSplash =
            splashSystem.update({
                worldX: 0,
                worldY: 0,
                velocityX: this.entrySpeed,
                velocityY: 0,
                sample: wetSample,
            });

        const secondSplashPassed =
            secondSplash !== null &&
            !splashSystem.isArmed() &&
            splashSystem.isInSplashWater();

        const reentryResistancePassed =
            reentryState.additionalResistance > 0 &&
            reentryState.targetExposure > 0;

        checks.push(
            ["Exit lowers Water exposure", exitExposurePassed],
            ["Exit re-arms splash system", exitRearmPassed],
            ["Re-entry emits second splash", secondSplashPassed],
            ["Re-entry restores Water resistance", reentryResistancePassed],
        );

        // ---------------------------------------------------
        // E. Reset
        // ---------------------------------------------------

        interaction.reset();
        splashSystem.reset();

        const resetState =
            interaction.update(
                drySample,
                0,
            );

        const resetInteractionPassed =
            resetState.targetExposure === 0 &&
            resetState.smoothedExposure === 0 &&
            resetState.additionalResistance === 0;

        const resetSplashPassed =
            splashSystem.isArmed() &&
            !splashSystem.isInSplashWater();

        checks.push(
            ["Reset clears Water interaction state", resetInteractionPassed],
            ["Reset restores splash readiness", resetSplashPassed],
        );

        const finiteValues = [
            dryState.targetExposure,
            dryState.smoothedExposure,
            dryState.additionalResistance,
            entryState.targetExposure,
            entryState.smoothedExposure,
            entryState.additionalResistance,
            continuousState.targetExposure,
            continuousState.smoothedExposure,
            continuousState.additionalResistance,
            exitState.targetExposure,
            exitState.smoothedExposure,
            exitState.additionalResistance,
            reentryState.targetExposure,
            reentryState.smoothedExposure,
            reentryState.additionalResistance,
        ];

        const allFinitePassed =
            finiteValues.every(Number.isFinite);

        checks.push(
            ["All integrated values finite", allFinitePassed],
        );

        console.log(
            "[8E-10] BALL/WATER INTEGRATED ACCEPTANCE",
        );

        for (const [name, passed] of checks) {
            console.log(
                `[8E-10] ${name} ${passed ? "PASS" : "FAIL"}`,
            );
        }

        const dryPassed =
            dryResistancePassed &&
            drySplashPassed;

        const entryPassed =
            entryDetectedPassed &&
            entryExposurePassed &&
            entryResistancePassed &&
            firstSplashPassed;

        const continuousPassed =
            continuousResistancePassed &&
            noSplashSpamPassed &&
            boundedResistancePassed;

        const exitReentryPassed =
            exitExposurePassed &&
            exitRearmPassed &&
            secondSplashPassed &&
            reentryResistancePassed;

        const resetPassed =
            resetInteractionPassed &&
            resetSplashPassed;

        const passed =
            dryPassed &&
            entryPassed &&
            continuousPassed &&
            exitReentryPassed &&
            resetPassed &&
            allFinitePassed;

        console.log(
            `[8E-10] Ball/Water Integrated Acceptance: ${passed ? "PASS" : "FAIL"}`,
        );

        if (!passed) {
            throw new Error(
                "Phase 8E-10 Ball/Water Integrated Acceptance validation failed.",
            );
        }

        return {
            dryPassed,
            entryPassed,
            continuousPassed,
            exitReentryPassed,
            resetPassed,
            allFinitePassed,
            passed,
        };
    }

    private createSample(
        representativeDepth: number,
        coveredFraction: number,
    ): BallWaterSample {
        const coverage =
            Math.max(
                0,
                Math.min(1, coveredFraction),
            );

        const depth =
            Math.max(
                0,
                representativeDepth,
            );

        const coveredSampleCount =
            Math.round(9 * coverage);

        return {
            averageDepth:
                depth * coverage,
            maximumDepth:
                depth,
            coveredFraction:
                coverage,
            averageVelocityX: 0,
            averageVelocityY: 0,
            sampleCount: 9,
            coveredSampleCount,
        };
    }
}
