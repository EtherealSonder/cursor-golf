import {
    EnvironmentField,
} from "../environment/EnvironmentField";

import {
    MoistureSurfaceBridge,
} from "../environment/MoistureSurfaceBridge";

import {
    SurfaceSystem,
} from "../surface/SurfaceSystem";

import {
    SurfaceState,
} from "../surface/SurfaceState";

import {
    SurfaceType,
} from "../surface/SurfaceType";

import type {
    WaterField,
} from "../environment/WaterField";

import type {
    WaterGroundInteractionSystem,
} from "../environment/WaterGroundInteractionSystem";

interface FrameRateInfiltrationResult {
    readonly fps: number;
    readonly finalWater: number;
    readonly finalMoisture: number;
    readonly totalWaterTransferred: number;
    readonly totalMoistureAdded: number;
}

export interface WaterGroundInteractionValidationState {
    readonly waterRemovalPassed: boolean;
    readonly moistureAdditionPassed: boolean;
    readonly moistureClampPassed: boolean;
    readonly coordinateMappingPassed: boolean;
    readonly invalidInputPassed: boolean;
    readonly resetPassed: boolean;

    readonly basicInfiltrationPassed: boolean;
    readonly waterBoundPassed: boolean;
    readonly moistureCapacityPassed: boolean;
    readonly saturatedGroundPassed: boolean;
    readonly transferAccountingPassed: boolean;
    readonly frameRateStabilityPassed: boolean;
    readonly shallowDepthAttenuationPassed: boolean;
    readonly saturationDependentInfiltrationPassed: boolean;

    readonly moistureDiffusionPassed: boolean;
    readonly diffusionCenterInitial: number;
    readonly diffusionCenterFinal: number;
    readonly diffusionNorth: number;
    readonly diffusionSouth: number;
    readonly diffusionWest: number;
    readonly diffusionEast: number;
    readonly diffusionSymmetryError: number;
    readonly diffusionInitialTrackedCount: number;
    readonly diffusionFinalTrackedCount: number;
    readonly diffusionBounded: boolean;
    readonly diffusionSlowSpread: boolean;
    readonly diffusionFrameRateStable: boolean;

    readonly groundDryingPassed: boolean;
    readonly dryingInitialMoisture: number;
    readonly dryingFinalMoisture: number;
    readonly dryingBaselineMoisture: number;
    readonly dryingTrackedInitial: number;
    readonly dryingTrackedFinal: number;
    readonly baselinePreservationPassed: boolean;

    readonly shallowWaterDissipationPassed: boolean;
    readonly tinyFilmInitialWater: number;
    readonly tinyFilmFinalWater: number;
    readonly normalPuddleDissipation: number;

    readonly lifecyclePassed: boolean;
    readonly lifecycleInitialWater: number;
    readonly lifecycleWaterAfterDrain: number;
    readonly lifecycleMoistureAfterDrain: number;
    readonly lifecycleFinalMoisture: number;
    readonly lifecycleBaselineMoisture: number;

    readonly dryingFrameRateStabilityPassed: boolean;

    readonly moistureSurfaceBridgePassed: boolean;
    readonly grassWetTransitionPassed: boolean;
    readonly grassDryTransitionPassed: boolean;
    readonly hysteresisPassed: boolean;
    readonly sandWetDryPassed: boolean;
    readonly scorchedMoistureCompatibilityPassed: boolean;
    readonly burnAmountPreservedPassed: boolean;
    readonly explicitStatePrecedencePassed: boolean;
    readonly moistureSurfaceBridgeResetPassed: boolean;
    readonly moistureSurfaceBridgeFrameRateStable: boolean;
    readonly bridgeWetCellCountAfterWet: number;
    readonly bridgeWetCellCountAfterDry: number;

    readonly dryGrassWaterTransferred: number;
    readonly halfSaturatedGrassWaterTransferred: number;
    readonly nearlySaturatedGrassWaterTransferred: number;

    readonly dryGrassFinalWater: number;
    readonly halfSaturatedGrassFinalWater: number;
    readonly nearlySaturatedGrassFinalWater: number;

    readonly shallowWaterTransferred: number;
    readonly deepWaterTransferred: number;

    readonly injectedWater: number;
    readonly requestedWaterRemoval: number;
    readonly removedWater: number;
    readonly waterAfterRemoval: number;

    readonly baselineMoisture: number;
    readonly acceptedMoisture: number;
    readonly moistureAfterAddition: number;
    readonly moistureAfterClamp: number;
    readonly resetMoisture: number;

    readonly infiltrationInitialWater: number;
    readonly infiltrationFinalWater: number;
    readonly infiltrationInitialMoisture: number;
    readonly infiltrationFinalMoisture: number;
    readonly infiltrationWaterTransferred: number;
    readonly infiltrationMoistureAdded: number;
    readonly expectedMoistureAdded: number;

    readonly frameRate30:
    FrameRateInfiltrationResult;

    readonly frameRate60:
    FrameRateInfiltrationResult;

    readonly frameRate120:
    FrameRateInfiltrationResult;

    readonly passed: boolean;
}

/**
 * Development-only validation for the Phase 8C Water-ground interaction.
 *
 * 8C-1 foundation checks remain active. 8C-2 adds deterministic infiltration,
 * capacity limits, and explicit transfer accounting.
 */
export class WaterGroundInteractionValidation {
    private state:
        WaterGroundInteractionValidationState | null =
        null;

    public constructor(
        private readonly interactionSystem:
            WaterGroundInteractionSystem,
        private readonly waterField:
            WaterField,
        private readonly environmentField:
            EnvironmentField,
        private readonly moistureSurfaceBridge:
            MoistureSurfaceBridge,
        private readonly surfaceSystem:
            SurfaceSystem,
    ) { }

    public run():
        WaterGroundInteractionValidationState {
        const previousContactWettingState =
            this.interactionSystem
                .isContactWettingEnabled();

        this.interactionSystem
            .setContactWettingEnabledForValidation(
                false,
            );

        const epsilon =
            0.00001;

        const foundation =
            this.runFoundationValidation(
                epsilon,
            );

        const infiltration =
            this.runBasicInfiltrationValidation(
                epsilon,
            );

        const waterBoundPassed =
            this.runWaterBoundValidation(
                epsilon,
            );

        const moistureCapacityPassed =
            this.runMoistureCapacityValidation(
                epsilon,
            );

        const saturatedGroundPassed =
            this.runSaturatedGroundValidation(
                epsilon,
            );

        const depthAttenuation =
            this.runDepthAttenuationValidation(
                epsilon,
            );

        const saturationResponse =
            this.runSaturationDependentValidation(
                epsilon,
            );

        const moistureDiffusion =
            this.runMoistureDiffusionValidation(
                epsilon,
            );

        const groundDrying =
            this.runGroundDryingValidation(
                epsilon,
            );

        const shallowWaterDissipation =
            this.runShallowWaterDissipationValidation(
                epsilon,
            );

        const lifecycle =
            this.runDryingLifecycleValidation(
                epsilon,
            );

        const dryingFrameRateStabilityPassed =
            this.runDryingFrameRateValidation(
                epsilon,
            );

        const moistureSurfaceBridge =
            this.runMoistureSurfaceBridgeValidation(
                epsilon,
            );

        const frameRate30 =
            this.runFrameRateCase(
                30,
                2,
            );

        const frameRate60 =
            this.runFrameRateCase(
                60,
                2,
            );

        const frameRate120 =
            this.runFrameRateCase(
                120,
                2,
            );

        const frameRateStabilityPassed =
            this.frameRateResultsMatch(
                frameRate30,
                frameRate60,
                epsilon,
            ) &&
            this.frameRateResultsMatch(
                frameRate60,
                frameRate120,
                epsilon,
            );

        const passed =
            foundation.waterRemovalPassed &&
            foundation.moistureAdditionPassed &&
            foundation.moistureClampPassed &&
            foundation.coordinateMappingPassed &&
            foundation.invalidInputPassed &&
            foundation.resetPassed &&
            infiltration.basicInfiltrationPassed &&
            infiltration.transferAccountingPassed &&
            waterBoundPassed &&
            moistureCapacityPassed &&
            saturatedGroundPassed &&
            depthAttenuation.passed &&
            saturationResponse.passed &&
            moistureDiffusion.passed &&
            groundDrying.passed &&
            shallowWaterDissipation.passed &&
            lifecycle.passed &&
            dryingFrameRateStabilityPassed &&
            moistureSurfaceBridge.passed &&
            frameRateStabilityPassed;

        /*
         * Leave normal gameplay with clean Water/interaction state, matching
         * the existing development-validation convention.
         */
        this.waterField.reset();
        this.environmentField.reset();
        this.interactionSystem.reset();
        this.moistureSurfaceBridge.reset();

        this.state = {
            ...foundation,

            basicInfiltrationPassed:
                infiltration.basicInfiltrationPassed,

            waterBoundPassed,
            moistureCapacityPassed,
            saturatedGroundPassed,

            transferAccountingPassed:
                infiltration.transferAccountingPassed,

            frameRateStabilityPassed,

            shallowDepthAttenuationPassed:
                depthAttenuation.passed,

            saturationDependentInfiltrationPassed:
                saturationResponse.passed,

            moistureDiffusionPassed:
                moistureDiffusion.passed,

            diffusionCenterInitial:
                moistureDiffusion.centerInitial,

            diffusionCenterFinal:
                moistureDiffusion.centerFinal,

            diffusionNorth:
                moistureDiffusion.north,

            diffusionSouth:
                moistureDiffusion.south,

            diffusionWest:
                moistureDiffusion.west,

            diffusionEast:
                moistureDiffusion.east,

            diffusionSymmetryError:
                moistureDiffusion.symmetryError,

            diffusionInitialTrackedCount:
                moistureDiffusion.initialTrackedCount,

            diffusionFinalTrackedCount:
                moistureDiffusion.finalTrackedCount,

            diffusionBounded:
                moistureDiffusion.bounded,

            diffusionSlowSpread:
                moistureDiffusion.slowSpread,

            diffusionFrameRateStable:
                moistureDiffusion.frameRateStable,

            groundDryingPassed:
                groundDrying.passed,

            dryingInitialMoisture:
                groundDrying.initialMoisture,

            dryingFinalMoisture:
                groundDrying.finalMoisture,

            dryingBaselineMoisture:
                groundDrying.baselineMoisture,

            dryingTrackedInitial:
                groundDrying.initialTrackedCount,

            dryingTrackedFinal:
                groundDrying.finalTrackedCount,

            baselinePreservationPassed:
                groundDrying.baselinePreservationPassed,

            shallowWaterDissipationPassed:
                shallowWaterDissipation.passed,

            tinyFilmInitialWater:
                shallowWaterDissipation.tinyFilmInitialWater,

            tinyFilmFinalWater:
                shallowWaterDissipation.tinyFilmFinalWater,

            normalPuddleDissipation:
                shallowWaterDissipation.normalPuddleDissipation,

            lifecyclePassed:
                lifecycle.passed,

            lifecycleInitialWater:
                lifecycle.initialWater,

            lifecycleWaterAfterDrain:
                lifecycle.waterAfterDrain,

            lifecycleMoistureAfterDrain:
                lifecycle.moistureAfterDrain,

            lifecycleFinalMoisture:
                lifecycle.finalMoisture,

            lifecycleBaselineMoisture:
                lifecycle.baselineMoisture,

            dryingFrameRateStabilityPassed,

            moistureSurfaceBridgePassed:
                moistureSurfaceBridge.passed,

            grassWetTransitionPassed:
                moistureSurfaceBridge.grassWetTransitionPassed,

            grassDryTransitionPassed:
                moistureSurfaceBridge.grassDryTransitionPassed,

            hysteresisPassed:
                moistureSurfaceBridge.hysteresisPassed,

            sandWetDryPassed:
                moistureSurfaceBridge.sandWetDryPassed,

            scorchedMoistureCompatibilityPassed:
                moistureSurfaceBridge.scorchedMoistureCompatibilityPassed,

            burnAmountPreservedPassed:
                moistureSurfaceBridge.burnAmountPreservedPassed,

            explicitStatePrecedencePassed:
                moistureSurfaceBridge.explicitStatePrecedencePassed,

            moistureSurfaceBridgeResetPassed:
                moistureSurfaceBridge.resetPassed,

            moistureSurfaceBridgeFrameRateStable:
                moistureSurfaceBridge.frameRateStable,

            bridgeWetCellCountAfterWet:
                moistureSurfaceBridge.wetCellCountAfterWet,

            bridgeWetCellCountAfterDry:
                moistureSurfaceBridge.wetCellCountAfterDry,

            dryGrassWaterTransferred:
                saturationResponse.dry.waterTransferred,

            halfSaturatedGrassWaterTransferred:
                saturationResponse.half.waterTransferred,

            nearlySaturatedGrassWaterTransferred:
                saturationResponse.nearly.waterTransferred,

            dryGrassFinalWater:
                saturationResponse.dry.finalWater,

            halfSaturatedGrassFinalWater:
                saturationResponse.half.finalWater,

            nearlySaturatedGrassFinalWater:
                saturationResponse.nearly.finalWater,

            shallowWaterTransferred:
                depthAttenuation.shallowWaterTransferred,

            deepWaterTransferred:
                depthAttenuation.deepWaterTransferred,

            infiltrationInitialWater:
                infiltration.initialWater,

            infiltrationFinalWater:
                infiltration.finalWater,

            infiltrationInitialMoisture:
                infiltration.initialMoisture,

            infiltrationFinalMoisture:
                infiltration.finalMoisture,

            infiltrationWaterTransferred:
                infiltration.waterTransferred,

            infiltrationMoistureAdded:
                infiltration.moistureAdded,

            expectedMoistureAdded:
                infiltration.expectedMoistureAdded,

            frameRate30,
            frameRate60,
            frameRate120,

            passed,
        };

        this.interactionSystem
            .setContactWettingEnabledForValidation(
                previousContactWettingState,
            );

        this.logResult(
            this.state,
        );

        return this.state;
    }

    public getState():
        WaterGroundInteractionValidationState | null {
        return this.state;
    }

    private runFoundationValidation(
        epsilon: number,
    ): {
        readonly waterRemovalPassed: boolean;
        readonly moistureAdditionPassed: boolean;
        readonly moistureClampPassed: boolean;
        readonly coordinateMappingPassed: boolean;
        readonly invalidInputPassed: boolean;
        readonly resetPassed: boolean;

        readonly injectedWater: number;
        readonly requestedWaterRemoval: number;
        readonly removedWater: number;
        readonly waterAfterRemoval: number;

        readonly baselineMoisture: number;
        readonly acceptedMoisture: number;
        readonly moistureAfterAddition: number;
        readonly moistureAfterClamp: number;
        readonly resetMoisture: number;
    } {
        this.resetAll();

        const {
            index,
            gridX,
            gridY,
            waterCenter,
            environmentCenter,
        } =
            this.getValidationCell();

        const coordinateMappingPassed =
            Math.abs(
                waterCenter.x -
                environmentCenter.x,
            ) <= epsilon &&
            Math.abs(
                waterCenter.y -
                environmentCenter.y,
            ) <= epsilon;

        const maximumDepth =
            this.waterField
                .getDefinition()
                .maximumDepth;

        const injectedWater =
            this.waterField
                .injectWater(
                    waterCenter.x,
                    waterCenter.y,
                    Math.min(
                        2,
                        maximumDepth * 0.5,
                    ),
                );

        const requestedWaterRemoval =
            injectedWater * 0.4;

        const removedWater =
            this.waterField
                .removeWaterByIndex(
                    index,
                    requestedWaterRemoval,
                );

        const waterAfterRemoval =
            this.waterField
                .getCell(
                    gridX,
                    gridY,
                )?.depth ?? 0;

        const waterRemovalPassed =
            injectedWater > 0 &&
            Math.abs(
                removedWater -
                requestedWaterRemoval,
            ) <= epsilon &&
            Math.abs(
                waterAfterRemoval -
                (injectedWater - removedWater),
            ) <= epsilon &&
            Math.abs(
                this.waterField
                    .getTotalWaterAmount() -
                waterAfterRemoval,
            ) <= epsilon &&
            waterAfterRemoval >= 0;

        const baselineMoisture =
            this.environmentField
                .getMoistureByIndex(
                    index,
                );

        const moistureRequest =
            Math.min(
                0.2,
                Math.max(
                    0,
                    this.environmentField
                        .getDefinition()
                        .maximumMoisture -
                    baselineMoisture,
                ),
            );

        const acceptedMoisture =
            this.environmentField
                .addMoistureByIndex(
                    index,
                    moistureRequest,
                );

        const moistureAfterAddition =
            this.environmentField
                .getMoistureByIndex(
                    index,
                );

        const moistureAdditionPassed =
            Math.abs(
                acceptedMoisture -
                moistureRequest,
            ) <= epsilon &&
            Math.abs(
                moistureAfterAddition -
                (
                    baselineMoisture +
                    acceptedMoisture
                ),
            ) <= epsilon;

        this.environmentField
            .addMoistureByIndex(
                index,
                this.environmentField
                    .getDefinition()
                    .maximumMoisture *
                10,
            );

        const moistureAfterClamp =
            this.environmentField
                .getMoistureByIndex(
                    index,
                );

        const moistureClampPassed =
            Math.abs(
                moistureAfterClamp -
                this.environmentField
                    .getDefinition()
                    .maximumMoisture,
            ) <= epsilon;

        const invalidInputPassed =
            this.waterField
                .removeWaterByIndex(
                    -1,
                    1,
                ) ===
            0 &&
            this.waterField
                .removeWater(
                    Number.NaN,
                    waterCenter.y,
                    1,
                ) ===
            0 &&
            this.environmentField
                .addMoistureByIndex(
                    -1,
                    1,
                ) ===
            0 &&
            this.environmentField
                .addMoistureAt(
                    Number.NaN,
                    environmentCenter.y,
                    1,
                ) ===
            0;

        this.resetAll();

        const resetMoisture =
            this.environmentField
                .getMoistureByIndex(
                    index,
                );

        const resetPassed =
            this.waterField
                .getTotalWaterAmount() ===
            0 &&
            this.waterField
                .getNonEmptyCellCount() ===
            0 &&
            this.waterField
                .getTrackedWaterCellCount() ===
            0 &&
            Math.abs(
                resetMoisture -
                baselineMoisture,
            ) <= epsilon;

        return {
            waterRemovalPassed,
            moistureAdditionPassed,
            moistureClampPassed,
            coordinateMappingPassed,
            invalidInputPassed,
            resetPassed,

            injectedWater,
            requestedWaterRemoval,
            removedWater,
            waterAfterRemoval,

            baselineMoisture,
            acceptedMoisture,
            moistureAfterAddition,
            moistureAfterClamp,
            resetMoisture,
        };
    }

    private runBasicInfiltrationValidation(
        epsilon: number,
    ): {
        readonly initialWater: number;
        readonly finalWater: number;
        readonly initialMoisture: number;
        readonly finalMoisture: number;
        readonly waterTransferred: number;
        readonly moistureAdded: number;
        readonly expectedMoistureAdded: number;
        readonly basicInfiltrationPassed: boolean;
        readonly transferAccountingPassed: boolean;
    } {
        this.resetAll();

        const {
            index,
            waterCenter,
        } =
            this.getValidationCell();

        const initialWater =
            this.waterField
                .injectWater(
                    waterCenter.x,
                    waterCenter.y,
                    1,
                );

        const initialMoisture =
            this.environmentField
                .getMoistureByIndex(
                    index,
                );

        const durationSeconds =
            1;

        const fps =
            60;

        for (
            let frame = 0;
            frame <
            durationSeconds * fps;
            frame += 1
        ) {
            this.interactionSystem
                .update(
                    1 / fps,
                );
        }

        const finalWater =
            this.getWaterDepthAtIndex(
                index,
            );

        const finalMoisture =
            this.environmentField
                .getMoistureByIndex(
                    index,
                );

        const accounting =
            this.interactionSystem
                .getTransferAccounting();

        const waterTransferred =
            accounting.totalWaterTransferred;

        const moistureAdded =
            accounting.totalMoistureAdded;

        const expectedMoistureAdded =
            waterTransferred *
            this.interactionSystem
                .getDefinition()
                .waterDepthToMoisture;

        const basicInfiltrationPassed =
            finalWater <
            initialWater &&
            finalWater >=
            0 &&
            finalMoisture >
            initialMoisture &&
            finalMoisture <=
            this.environmentField
                .getDefinition()
                .maximumMoisture +
            epsilon;

        const totalExcessMoisture =
            this.getTotalTrackedExcessMoisture();

        const transferAccountingPassed =
            Math.abs(
                (
                    initialWater -
                    finalWater
                ) -
                waterTransferred
            ) <=
            epsilon * 4 &&
            Math.abs(
                totalExcessMoisture -
                (
                    moistureAdded -
                    accounting
                        .totalGroundMoistureDried
                ),
            ) <=
            epsilon * 8 &&
            Math.abs(
                moistureAdded -
                expectedMoistureAdded,
            ) <=
            epsilon * 4;

        return {
            initialWater,
            finalWater,
            initialMoisture,
            finalMoisture,
            waterTransferred,
            moistureAdded,
            expectedMoistureAdded,
            basicInfiltrationPassed,
            transferAccountingPassed,
        };
    }

    private runWaterBoundValidation(
        epsilon: number,
    ): boolean {
        this.resetAll();

        const {
            index,
            waterCenter,
        } =
            this.getValidationCell();

        const definition =
            this.interactionSystem
                .getDefinition();

        const availableWater =
            definition.baseInfiltrationRate *
            definition.minimumDepthInfiltrationMultiplier *
            definition.fixedTimeStep *
            0.25;

        this.waterField
            .injectWater(
                waterCenter.x,
                waterCenter.y,
                availableWater,
            );

        this.interactionSystem
            .update(
                this.interactionSystem
                    .getDefinition()
                    .fixedTimeStep,
            );

        const remainingWater =
            this.getWaterDepthAtIndex(
                index,
            );

        const accounting =
            this.interactionSystem
                .getTransferAccounting();

        return (
            remainingWater >=
            -epsilon &&
            Math.abs(
                remainingWater,
            ) <= epsilon &&
            accounting.totalWaterTransferred <=
            availableWater +
            epsilon
        );
    }

    private runMoistureCapacityValidation(
        epsilon: number,
    ): boolean {
        this.resetAll();

        const {
            index,
            waterCenter,
        } =
            this.getValidationCell();

        const maximumMoisture =
            this.environmentField
                .getDefinition()
                .maximumMoisture;

        const definition =
            this.interactionSystem
                .getDefinition();

        const grassProfile =
            definition.surfaceProfiles
                .find(
                    (profile): boolean =>
                        profile.surfaceType ===
                        this.interactionSystem
                            .getSurfaceSystem()
                            .getSurfaceAt(
                                waterCenter.x,
                                waterCenter.y,
                            )
                            .surfaceType,
                );

        if (!grassProfile) {
            return false;
        }

        const minimumOneStepMoisture =
            definition.baseInfiltrationRate *
            grassProfile.infiltrationRateMultiplier *
            grassProfile.minimumSaturatedAbsorption *
            definition.fixedTimeStep *
            definition.waterDepthToMoisture;

        const remainingCapacity =
            minimumOneStepMoisture *
            0.5;

        const targetMoisture =
            maximumMoisture -
            remainingCapacity;

        const baselineMoisture =
            this.environmentField
                .getMoistureByIndex(
                    index,
                );

        this.environmentField
            .addMoistureByIndex(
                index,
                Math.max(
                    0,
                    targetMoisture -
                    baselineMoisture,
                ),
            );

        const initialWater =
            this.waterField
                .injectWater(
                    waterCenter.x,
                    waterCenter.y,
                    0.5,
                );

        this.interactionSystem
            .update(
                this.interactionSystem
                    .getDefinition()
                    .fixedTimeStep,
            );

        const finalWater =
            this.getWaterDepthAtIndex(
                index,
            );

        const finalMoisture =
            this.environmentField
                .getMoistureByIndex(
                    index,
                );

        const waterRemoved =
            initialWater -
            finalWater;

        const maximumWaterAllowedByCapacity =
            remainingCapacity /
            definition.waterDepthToMoisture;

        const accounting =
            this.interactionSystem
                .getTransferAccounting();

        return (
            finalMoisture <=
            maximumMoisture +
            epsilon &&
            waterRemoved <=
            maximumWaterAllowedByCapacity +
            epsilon * 4 &&
            Math.abs(
                accounting.totalMoistureAdded -
                remainingCapacity,
            ) <=
            epsilon * 8
        );
    }

    private runSaturatedGroundValidation(
        epsilon: number,
    ): boolean {
        this.resetAll();

        const {
            index,
            waterCenter,
        } =
            this.getValidationCell();

        const maximumMoisture =
            this.environmentField
                .getDefinition()
                .maximumMoisture;

        const baselineMoisture =
            this.environmentField
                .getMoistureByIndex(
                    index,
                );

        this.environmentField
            .addMoistureByIndex(
                index,
                Math.max(
                    0,
                    maximumMoisture -
                    baselineMoisture,
                ),
            );

        const initialWater =
            this.waterField
                .injectWater(
                    waterCenter.x,
                    waterCenter.y,
                    0.5,
                );

        this.interactionSystem
            .update(
                this.interactionSystem
                    .getDefinition()
                    .fixedTimeStep,
            );

        const finalWater =
            this.getWaterDepthAtIndex(
                index,
            );

        const finalMoisture =
            this.environmentField
                .getMoistureByIndex(
                    index,
                );

        const accounting =
            this.interactionSystem
                .getTransferAccounting();

        return (
            Math.abs(
                finalWater -
                initialWater,
            ) <= epsilon &&
            finalMoisture <=
            maximumMoisture +
            epsilon &&
            Math.abs(
                accounting.totalWaterTransferred,
            ) <= epsilon &&
            Math.abs(
                accounting.totalMoistureAdded,
            ) <= epsilon
        );
    }

    private runDepthAttenuationValidation(
        epsilon: number,
    ): {
        readonly shallowWaterTransferred: number;
        readonly deepWaterTransferred: number;
        readonly passed: boolean;
    } {
        const definition =
            this.interactionSystem
                .getDefinition();

        const runCase =
            (
                initialDepth: number,
            ): number => {
                this.resetAll();

                const {
                    waterCenter,
                } =
                    this.getValidationCell();

                this.waterField
                    .injectWater(
                        waterCenter.x,
                        waterCenter.y,
                        initialDepth,
                    );

                this.interactionSystem
                    .update(
                        definition.fixedTimeStep,
                    );

                return this.interactionSystem
                    .getTransferAccounting()
                    .totalWaterTransferred;
            };

        const shallowDepth =
            Math.max(
                definition.minimumInfiltrationDepth *
                0.5,
                definition.baseInfiltrationRate *
                definition.fixedTimeStep *
                2,
            );

        const deepDepth =
            Math.max(
                definition.fullInfiltrationDepth,
                shallowDepth * 4,
            );

        const shallowWaterTransferred =
            runCase(
                shallowDepth,
            );

        const deepWaterTransferred =
            runCase(
                deepDepth,
            );

        const expectedShallowMaximum =
            definition.baseInfiltrationRate *
            definition.minimumDepthInfiltrationMultiplier *
            definition.fixedTimeStep;

        const expectedDeepTransfer =
            definition.baseInfiltrationRate *
            definition.fixedTimeStep;

        const passed =
            shallowWaterTransferred >
            0 &&
            deepWaterTransferred >
            shallowWaterTransferred &&
            shallowWaterTransferred <=
            expectedShallowMaximum +
            epsilon &&
            Math.abs(
                deepWaterTransferred -
                expectedDeepTransfer,
            ) <=
            epsilon * 4;

        return {
            shallowWaterTransferred,
            deepWaterTransferred,
            passed,
        };
    }

    private runSaturationDependentValidation(
        epsilon: number,
    ): {
        readonly dry: {
            readonly waterTransferred: number;
            readonly finalWater: number;
        };
        readonly half: {
            readonly waterTransferred: number;
            readonly finalWater: number;
        };
        readonly nearly: {
            readonly waterTransferred: number;
            readonly finalWater: number;
        };
        readonly passed: boolean;
    } {
        const runCase =
            (
                normalizedSaturation: number,
            ): {
                readonly waterTransferred: number;
                readonly finalWater: number;
            } => {
                this.resetAll();

                const {
                    index,
                    waterCenter,
                } =
                    this.getValidationCell();

                const environmentDefinition =
                    this.environmentField
                        .getDefinition();

                const baselineMoisture =
                    environmentDefinition
                        .normalGrassInitialMoisture;

                const targetMoisture =
                    baselineMoisture +
                    (
                        environmentDefinition
                            .maximumMoisture -
                        baselineMoisture
                    ) *
                    normalizedSaturation;

                const currentMoisture =
                    this.environmentField
                        .getMoistureByIndex(
                            index,
                        );

                this.environmentField
                    .addMoistureByIndex(
                        index,
                        Math.max(
                            0,
                            targetMoisture -
                            currentMoisture,
                        ),
                    );

                const initialWater =
                    this.waterField
                        .injectWater(
                            waterCenter.x,
                            waterCenter.y,
                            1,
                        );

                const durationSeconds =
                    1;

                const fps =
                    60;

                for (
                    let frame = 0;
                    frame <
                    durationSeconds * fps;
                    frame += 1
                ) {
                    this.interactionSystem
                        .update(
                            1 / fps,
                        );
                }

                const finalWater =
                    this.getWaterDepthAtIndex(
                        index,
                    );

                return {
                    waterTransferred:
                        this.interactionSystem
                            .getTransferAccounting()
                            .totalWaterTransferred,

                    finalWater,
                };
            };

        const dry =
            runCase(
                0,
            );

        const half =
            runCase(
                0.5,
            );

        const nearly =
            runCase(
                0.9,
            );

        const transferredOrderingPassed =
            dry.waterTransferred >
            half.waterTransferred +
            epsilon &&
            half.waterTransferred >
            nearly.waterTransferred +
            epsilon;

        const puddleOrderingPassed =
            dry.finalWater <
            half.finalWater -
            epsilon &&
            half.finalWater <
            nearly.finalWater -
            epsilon;

        return {
            dry,
            half,
            nearly,

            passed:
                transferredOrderingPassed &&
                puddleOrderingPassed,
        };
    }

    private runMoistureDiffusionValidation(
        epsilon: number,
    ): {
        readonly centerInitial: number;
        readonly centerFinal: number;
        readonly north: number;
        readonly south: number;
        readonly west: number;
        readonly east: number;
        readonly symmetryError: number;
        readonly initialTrackedCount: number;
        readonly finalTrackedCount: number;
        readonly bounded: boolean;
        readonly slowSpread: boolean;
        readonly frameRateStable: boolean;
        readonly passed: boolean;
    } {
        const runCase =
            (
                fps: number,
            ): {
                readonly centerInitial: number;
                readonly centerFinal: number;
                readonly north: number;
                readonly south: number;
                readonly west: number;
                readonly east: number;
                readonly initialTrackedCount: number;
                readonly finalTrackedCount: number;
            } => {
                this.resetAll();

                const {
                    index,
                } =
                    this.getValidationCell();

                const columnCount =
                    this.environmentField
                        .getColumnCount();

                const northIndex =
                    index -
                    columnCount;

                const southIndex =
                    index +
                    columnCount;

                const westIndex =
                    index - 1;

                const eastIndex =
                    index + 1;

                const addedMoisture =
                    this.environmentField
                        .addMoistureByIndex(
                            index,
                            0.60,
                        );

                const centerInitial =
                    this.environmentField
                        .getMoistureByIndex(
                            index,
                        );

                const initialTrackedCount =
                    this.environmentField
                        .getTrackedMoistureCellCount();

                const durationSeconds =
                    2;

                for (
                    let frame = 0;
                    frame <
                    durationSeconds * fps;
                    frame += 1
                ) {
                    this.interactionSystem
                        .update(
                            1 / fps,
                        );
                }

                return {
                    centerInitial:
                        centerInitial,

                    centerFinal:
                        this.environmentField
                            .getMoistureByIndex(
                                index,
                            ),

                    north:
                        this.environmentField
                            .getMoistureByIndex(
                                northIndex,
                            ),

                    south:
                        this.environmentField
                            .getMoistureByIndex(
                                southIndex,
                            ),

                    west:
                        this.environmentField
                            .getMoistureByIndex(
                                westIndex,
                            ),

                    east:
                        this.environmentField
                            .getMoistureByIndex(
                                eastIndex,
                            ),

                    initialTrackedCount,
                    finalTrackedCount:
                        this.environmentField
                            .getTrackedMoistureCellCount(),
                };
            };

        const fps30 =
            runCase(
                30,
            );

        const fps60 =
            runCase(
                60,
            );

        const fps120 =
            runCase(
                120,
            );

        const neighbours =
            [
                fps60.north,
                fps60.south,
                fps60.west,
                fps60.east,
            ];

        const symmetryError =
            Math.max(
                ...neighbours,
            ) -
            Math.min(
                ...neighbours,
            );

        const baseline =
            this.environmentField
                .getDefinition()
                .normalGrassInitialMoisture;

        const maximumMoisture =
            this.environmentField
                .getDefinition()
                .maximumMoisture;

        const spreadOccurred =
            fps60.centerFinal <
            fps60.centerInitial -
            epsilon &&
            neighbours.every(
                (
                    value,
                ): boolean =>
                    value >
                    baseline +
                    epsilon,
            );

        const bounded =
            [
                fps60.centerFinal,
                ...neighbours,
            ].every(
                (
                    value,
                ): boolean =>
                    value >=
                    baseline -
                    epsilon &&
                    value <=
                    maximumMoisture +
                    epsilon,
            );

        const slowSpread =
            neighbours.every(
                (
                    value,
                ): boolean =>
                    fps60.centerFinal >
                    value +
                    epsilon,
            );

        const compareCases =
            (
                a:
                    typeof fps30,

                b:
                    typeof fps30,
            ): boolean =>
                Math.abs(
                    a.centerFinal -
                    b.centerFinal,
                ) <=
                epsilon * 8 &&
                Math.abs(
                    a.north -
                    b.north,
                ) <=
                epsilon * 8 &&
                Math.abs(
                    a.south -
                    b.south,
                ) <=
                epsilon * 8 &&
                Math.abs(
                    a.west -
                    b.west,
                ) <=
                epsilon * 8 &&
                Math.abs(
                    a.east -
                    b.east,
                ) <=
                epsilon * 8 &&
                a.finalTrackedCount ===
                b.finalTrackedCount;

        const frameRateStable =
            compareCases(
                fps30,
                fps60,
            ) &&
            compareCases(
                fps60,
                fps120,
            );

        const passed =
            spreadOccurred &&
            symmetryError <=
            epsilon * 8 &&
            bounded &&
            slowSpread &&
            fps60.initialTrackedCount ===
            1 &&
            fps60.finalTrackedCount >=
            5 &&
            frameRateStable;

        return {
            centerInitial:
                fps60.centerInitial,

            centerFinal:
                fps60.centerFinal,

            north:
                fps60.north,

            south:
                fps60.south,

            west:
                fps60.west,

            east:
                fps60.east,

            symmetryError,

            initialTrackedCount:
                fps60.initialTrackedCount,

            finalTrackedCount:
                fps60.finalTrackedCount,

            bounded,
            slowSpread,
            frameRateStable,
            passed,
        };
    }

    private runGroundDryingValidation(
        epsilon: number,
    ): {
        readonly baselineMoisture: number;
        readonly initialMoisture: number;
        readonly finalMoisture: number;
        readonly initialTrackedCount: number;
        readonly finalTrackedCount: number;
        readonly baselinePreservationPassed: boolean;
        readonly passed: boolean;
    } {
        this.resetAll();

        const {
            index,
        } =
            this.getValidationCell();

        const baselineMoisture =
            this.environmentField
                .getBaselineMoistureByIndex(
                    index,
                );

        this.environmentField
            .addMoistureByIndex(
                index,
                0.60,
            );

        const initialMoisture =
            this.environmentField
                .getMoistureByIndex(
                    index,
                );

        const initialTrackedCount =
            this.environmentField
                .getTrackedMoistureCellCount();

        /*
         * Long enough for the configured gameplay drying rate to return the
         * test region to baseline and exercise sparse untracking.
         */
        const durationSeconds =
            180;

        const fps =
            60;

        for (
            let frame = 0;
            frame <
            durationSeconds * fps;
            frame += 1
        ) {
            this.interactionSystem
                .update(
                    1 / fps,
                );
        }

        const finalMoisture =
            this.environmentField
                .getMoistureByIndex(
                    index,
                );

        const finalTrackedCount =
            this.environmentField
                .getTrackedMoistureCellCount();

        /*
         * Baseline-only terrain should remain exactly at baseline when the
         * system runs without added moisture.
         */
        this.resetAll();

        const baselineBefore =
            this.environmentField
                .getMoistureByIndex(
                    index,
                );

        for (
            let frame = 0;
            frame < 60 * 30;
            frame += 1
        ) {
            this.interactionSystem
                .update(
                    1 / 60,
                );
        }

        const baselineAfter =
            this.environmentField
                .getMoistureByIndex(
                    index,
                );

        const baselinePreservationPassed =
            Math.abs(
                baselineAfter -
                baselineBefore,
            ) <=
            epsilon;

        return {
            baselineMoisture,
            initialMoisture,
            finalMoisture,
            initialTrackedCount,
            finalTrackedCount,
            baselinePreservationPassed,

            passed:
                initialMoisture >
                baselineMoisture +
                epsilon &&
                finalMoisture <
                initialMoisture -
                epsilon &&
                finalMoisture >=
                baselineMoisture -
                epsilon &&
                Math.abs(
                    finalMoisture -
                    baselineMoisture,
                ) <=
                this.environmentField
                    .getDefinition()
                    .minimumTrackedMoistureExcess +
                epsilon * 4 &&
                initialTrackedCount >=
                1 &&
                finalTrackedCount ===
                0 &&
                baselinePreservationPassed,
        };
    }

    private runShallowWaterDissipationValidation(
        epsilon: number,
    ): {
        readonly tinyFilmInitialWater: number;
        readonly tinyFilmFinalWater: number;
        readonly normalPuddleDissipation: number;
        readonly passed: boolean;
    } {
        const definition =
            this.interactionSystem
                .getDefinition();

        this.resetAll();

        const {
            index,
            waterCenter,
        } =
            this.getValidationCell();

        /*
         * Saturate the ground so infiltration cannot consume the tiny film.
         * This isolates the 8C-5 cleanup sink.
         */
        const currentMoisture =
            this.environmentField
                .getMoistureByIndex(
                    index,
                );

        this.environmentField
            .addMoistureByIndex(
                index,
                Math.max(
                    0,
                    this.environmentField
                        .getDefinition()
                        .maximumMoisture -
                    currentMoisture,
                ),
            );

        const tinyFilmInitialWater =
            this.waterField
                .injectWater(
                    waterCenter.x,
                    waterCenter.y,
                    definition
                        .shallowWaterDissipationDepth *
                    0.75,
                );

        const tinyFilmDurationSeconds =
            Math.max(
                1,
                (
                    tinyFilmInitialWater /
                    Math.max(
                        definition
                            .shallowWaterDissipationRate,
                        epsilon,
                    )
                ) +
                1,
            );

        const fps =
            60;

        for (
            let frame = 0;
            frame <
            tinyFilmDurationSeconds * fps;
            frame += 1
        ) {
            this.interactionSystem
                .update(
                    1 / fps,
                );
        }

        const tinyFilmFinalWater =
            this.getWaterDepthAtIndex(
                index,
            );

        /*
         * A normal puddle above the threshold must not use the special
         * dissipation sink. Infiltration may still occur independently.
         */
        this.resetAll();

        const normalPuddleDepth =
            Math.max(
                definition
                    .shallowWaterDissipationDepth *
                4,
                definition
                    .minimumInfiltrationDepth *
                2,
            );

        this.waterField
            .injectWater(
                waterCenter.x,
                waterCenter.y,
                normalPuddleDepth,
            );

        this.interactionSystem
            .update(
                definition.fixedTimeStep,
            );

        const normalPuddleDissipation =
            this.interactionSystem
                .getTransferAccounting()
                .totalShallowWaterDissipated;

        return {
            tinyFilmInitialWater,
            tinyFilmFinalWater,
            normalPuddleDissipation,

            passed:
                tinyFilmInitialWater >
                0 &&
                tinyFilmFinalWater <=
                epsilon &&
                normalPuddleDissipation <=
                epsilon,
        };
    }

    private runDryingLifecycleValidation(
        epsilon: number,
    ): {
        readonly initialWater: number;
        readonly waterAfterDrain: number;
        readonly moistureAfterDrain: number;
        readonly finalMoisture: number;
        readonly baselineMoisture: number;
        readonly passed: boolean;
    } {
        this.resetAll();

        const {
            index,
            waterCenter,
        } =
            this.getValidationCell();

        const baselineMoisture =
            this.environmentField
                .getBaselineMoistureByIndex(
                    index,
                );

        /*
         * Start with a small puddle on moderately wet ground. After input
         * stops, infiltration plus the microscopic-film cleanup should remove
         * standing Water before the ground itself finishes drying.
         */
        this.environmentField
            .addMoistureByIndex(
                index,
                0.30,
            );

        const initialWater =
            this.waterField
                .injectWater(
                    waterCenter.x,
                    waterCenter.y,
                    0.012,
                );

        let waterAfterDrain =
            initialWater;

        let moistureAfterDrain =
            this.environmentField
                .getMoistureByIndex(
                    index,
                );

        const fps =
            60;

        const maximumDrainSeconds =
            90;

        for (
            let frame = 0;
            frame <
            maximumDrainSeconds * fps;
            frame += 1
        ) {
            this.interactionSystem
                .update(
                    1 / fps,
                );

            waterAfterDrain =
                this.getWaterDepthAtIndex(
                    index,
                );

            if (
                waterAfterDrain <=
                epsilon
            ) {
                moistureAfterDrain =
                    this.environmentField
                        .getMoistureByIndex(
                            index,
                        );
                break;
            }
        }

        const groundStillWetAfterPuddle =
            moistureAfterDrain >
            baselineMoisture +
            this.environmentField
                .getDefinition()
                .minimumTrackedMoistureExcess;

        const additionalDryingSeconds =
            180;

        for (
            let frame = 0;
            frame <
            additionalDryingSeconds * fps;
            frame += 1
        ) {
            this.interactionSystem
                .update(
                    1 / fps,
                );
        }

        const finalMoisture =
            this.environmentField
                .getMoistureByIndex(
                    index,
                );

        return {
            initialWater,
            waterAfterDrain,
            moistureAfterDrain,
            finalMoisture,
            baselineMoisture,

            passed:
                initialWater >
                0 &&
                waterAfterDrain <=
                epsilon &&
                groundStillWetAfterPuddle &&
                finalMoisture <
                moistureAfterDrain -
                epsilon &&
                finalMoisture >=
                baselineMoisture -
                epsilon,
        };
    }

    private runDryingFrameRateValidation(
        epsilon: number,
    ): boolean {
        const runCase =
            (
                fps: number,
            ): {
                readonly moisture: number;
                readonly water: number;
                readonly tracked: number;
            } => {
                this.resetAll();

                const {
                    index,
                    waterCenter,
                } =
                    this.getValidationCell();

                this.environmentField
                    .addMoistureByIndex(
                        index,
                        0.45,
                    );

                this.waterField
                    .injectWater(
                        waterCenter.x,
                        waterCenter.y,
                        0.0015,
                    );

                const durationSeconds =
                    12;

                for (
                    let frame = 0;
                    frame <
                    durationSeconds * fps;
                    frame += 1
                ) {
                    this.interactionSystem
                        .update(
                            1 / fps,
                        );
                }

                return {
                    moisture:
                        this.environmentField
                            .getMoistureByIndex(
                                index,
                            ),

                    water:
                        this.getWaterDepthAtIndex(
                            index,
                        ),

                    tracked:
                        this.environmentField
                            .getTrackedMoistureCellCount(),
                };
            };

        const fps30 =
            runCase(
                30,
            );

        const fps60 =
            runCase(
                60,
            );

        const fps120 =
            runCase(
                120,
            );

        return (
            Math.abs(
                fps30.moisture -
                fps60.moisture,
            ) <=
            epsilon * 8 &&
            Math.abs(
                fps60.moisture -
                fps120.moisture,
            ) <=
            epsilon * 8 &&
            Math.abs(
                fps30.water -
                fps60.water,
            ) <=
            epsilon * 8 &&
            Math.abs(
                fps60.water -
                fps120.water,
            ) <=
            epsilon * 8 &&
            fps30.tracked ===
            fps60.tracked &&
            fps60.tracked ===
            fps120.tracked
        );
    }

    private runMoistureSurfaceBridgeValidation(
        epsilon: number,
    ): {
        readonly grassWetTransitionPassed: boolean;
        readonly grassDryTransitionPassed: boolean;
        readonly hysteresisPassed: boolean;
        readonly sandWetDryPassed: boolean;
        readonly scorchedMoistureCompatibilityPassed: boolean;
        readonly burnAmountPreservedPassed: boolean;
        readonly explicitStatePrecedencePassed: boolean;
        readonly resetPassed: boolean;
        readonly frameRateStable: boolean;
        readonly wetCellCountAfterWet: number;
        readonly wetCellCountAfterDry: number;
        readonly passed: boolean;
    } {
        this.resetAll();

        const {
            index,
            environmentCenter,
        } =
            this.getValidationCell();

        const grassProfile =
            this.moistureSurfaceBridge
                .getProfileForSurfaceType(
                    SurfaceType.Grass,
                );

        if (!grassProfile) {
            throw new Error(
                "Phase 8C-6 validation requires a Grass moisture surface profile.",
            );
        }

        const setMoisture =
            (
                target:
                    number,
            ): void => {
                const current =
                    this.environmentField
                        .getMoistureByIndex(
                            index,
                        );

                if (
                    target >
                    current
                ) {
                    this.environmentField
                        .addMoistureByIndex(
                            index,
                            target -
                            current,
                        );
                }
                else if (
                    target <
                    current
                ) {
                    this.environmentField
                        .removeMoistureByIndex(
                            index,
                            current -
                            target,
                        );
                }
            };

        const dryStateBefore =
            this.surfaceSystem
                .getSurfaceAt(
                    environmentCenter.x,
                    environmentCenter.y,
                )
                .surfaceState;

        const middleMoisture =
            (
                grassProfile
                    .dryThreshold +
                grassProfile
                    .wetThreshold
            ) /
            2;

        setMoisture(
            middleMoisture,
        );

        this.moistureSurfaceBridge
            .update();

        const middleFromDryState =
            this.surfaceSystem
                .getSurfaceAt(
                    environmentCenter.x,
                    environmentCenter.y,
                )
                .surfaceState;

        setMoisture(
            Math.min(
                1,
                grassProfile
                    .wetThreshold +
                0.02,
            ),
        );

        this.moistureSurfaceBridge
            .update();

        const wetState =
            this.surfaceSystem
                .getSurfaceAt(
                    environmentCenter.x,
                    environmentCenter.y,
                )
                .surfaceState;

        const wetCellCountAfterWet =
            this.moistureSurfaceBridge
                .getWetCellCount();

        setMoisture(
            middleMoisture,
        );

        this.moistureSurfaceBridge
            .update();

        const middleFromWetState =
            this.surfaceSystem
                .getSurfaceAt(
                    environmentCenter.x,
                    environmentCenter.y,
                )
                .surfaceState;

        setMoisture(
            Math.max(
                this.environmentField
                    .getBaselineMoistureByIndex(
                        index,
                    ),
                grassProfile
                    .dryThreshold -
                0.02,
            ),
        );

        this.moistureSurfaceBridge
            .update();

        const dryStateAfter =
            this.surfaceSystem
                .getSurfaceAt(
                    environmentCenter.x,
                    environmentCenter.y,
                )
                .surfaceState;

        const wetCellCountAfterDry =
            this.moistureSurfaceBridge
                .getWetCellCount();

        const grassWetTransitionPassed =
            dryStateBefore ===
            grassProfile
                .dryState &&
            wetState ===
            grassProfile
                .wetState &&
            wetCellCountAfterWet >
            0;

        const grassDryTransitionPassed =
            dryStateAfter ===
            grassProfile
                .dryState &&
            wetCellCountAfterDry ===
            0;

        const hysteresisPassed =
            middleFromDryState ===
            grassProfile
                .dryState &&
            middleFromWetState ===
            grassProfile
                .wetState;

        /*
         * Sand is validated in an isolated default-Sand field so the test does
         * not need to alter authored course zones in the live World.
         */
        const sandSurfaceSystem =
            new SurfaceSystem(
                SurfaceType.Sand,
            );

        const sandEnvironmentField =
            new EnvironmentField(
                sandSurfaceSystem,
            );

        const sandBridge =
            new MoistureSurfaceBridge(
                sandEnvironmentField,
                sandSurfaceSystem,
            );

        const sandProfile =
            sandBridge
                .getProfileForSurfaceType(
                    SurfaceType.Sand,
                );

        if (!sandProfile) {
            sandBridge.destroy();

            throw new Error(
                "Phase 8C-6 validation requires a Sand moisture surface profile.",
            );
        }

        const sandIndex =
            Math.min(
                24,
                sandEnvironmentField
                    .getColumnCount() -
                1,
            ) +
            Math.min(
                24,
                sandEnvironmentField
                    .getRowCount() -
                1,
            ) *
            sandEnvironmentField
                .getColumnCount();

        const sandCenter =
            sandEnvironmentField
                .getWorldCenterByIndex(
                    sandIndex,
                );

        if (!sandCenter) {
            sandBridge.destroy();

            throw new Error(
                "Phase 8C-6 Sand validation could not resolve a field cell.",
            );
        }

        const sandInitial =
            sandEnvironmentField
                .getMoistureByIndex(
                    sandIndex,
                );

        sandEnvironmentField
            .addMoistureByIndex(
                sandIndex,
                Math.max(
                    0,
                    sandProfile
                        .wetThreshold +
                    0.02 -
                    sandInitial,
                ),
            );

        sandBridge.update();

        const sandWetState =
            sandSurfaceSystem
                .getSurfaceAt(
                    sandCenter.x,
                    sandCenter.y,
                )
                .surfaceState;

        const sandCurrentMoisture =
            sandEnvironmentField
                .getMoistureByIndex(
                    sandIndex,
                );

        sandEnvironmentField
            .removeMoistureByIndex(
                sandIndex,
                Math.max(
                    0,
                    sandCurrentMoisture -
                    Math.max(
                        sandEnvironmentField
                            .getBaselineMoistureByIndex(
                                sandIndex,
                            ),
                        sandProfile
                            .dryThreshold -
                        0.02,
                    ),
                ),
            );

        sandBridge.update();

        const sandDryState =
            sandSurfaceSystem
                .getSurfaceAt(
                    sandCenter.x,
                    sandCenter.y,
                )
                .surfaceState;

        const sandWetDryPassed =
            sandWetState ===
            sandProfile
                .wetState &&
            sandDryState ===
            sandProfile
                .dryState;

        sandBridge.destroy();

        /*
         * Scorch compatibility is also isolated so no production Fire region
         * or authored surface zone needs to be altered.
         */
        const scorchSurfaceSystem =
            new SurfaceSystem(
                SurfaceType.Grass,
            );

        const scorchEnvironmentField =
            new EnvironmentField(
                scorchSurfaceSystem,
            );

        const scorchBridge =
            new MoistureSurfaceBridge(
                scorchEnvironmentField,
                scorchSurfaceSystem,
            );

        const scorchIndex =
            Math.min(
                24,
                scorchEnvironmentField
                    .getColumnCount() -
                1,
            ) +
            Math.min(
                24,
                scorchEnvironmentField
                    .getRowCount() -
                1,
            ) *
            scorchEnvironmentField
                .getColumnCount();

        const scorchCenter =
            scorchEnvironmentField
                .getWorldCenterByIndex(
                    scorchIndex,
                );

        if (!scorchCenter) {
            scorchBridge.destroy();

            throw new Error(
                "Phase 8C-6 Scorched validation could not resolve a field cell.",
            );
        }

        const scorchCellSize =
            scorchEnvironmentField
                .getDefinition()
                .cellSize;

        scorchSurfaceSystem
            .addStateRegion({
                id:
                    "8c6-validation-scorch",

                surfaceType:
                    SurfaceType.Grass,

                state:
                    SurfaceState.Scorched,

                x:
                    scorchCenter.x -
                    scorchCellSize /
                    2,

                y:
                    scorchCenter.y -
                    scorchCellSize /
                    2,

                width:
                    scorchCellSize,

                height:
                    scorchCellSize,

                durationSeconds:
                    null,

                reversionState:
                    null,
            });

        scorchEnvironmentField
            .depositBurn(
                scorchCenter.x,
                scorchCenter.y,
                scorchCellSize *
                0.4,
                0.6,
                8.6,
            );

        const burnAmountBefore =
            scorchEnvironmentField
                .getBurnAmountByIndex(
                    scorchIndex,
                );

        const scorchCurrentMoisture =
            scorchEnvironmentField
                .getMoistureByIndex(
                    scorchIndex,
                );

        scorchEnvironmentField
            .addMoistureByIndex(
                scorchIndex,
                Math.max(
                    0,
                    grassProfile
                        .wetThreshold +
                    0.08 -
                    scorchCurrentMoisture,
                ),
            );

        scorchBridge.update();

        const scorchSampleAfterWater =
            scorchSurfaceSystem
                .getSurfaceAt(
                    scorchCenter.x,
                    scorchCenter.y,
                );

        const burnAmountAfter =
            scorchEnvironmentField
                .getBurnAmountByIndex(
                    scorchIndex,
                );

        const scorchedMoistureCompatibilityPassed =
            scorchSampleAfterWater
                .surfaceState ===
            SurfaceState.Scorched &&
            scorchEnvironmentField
                .getMoistureByIndex(
                    scorchIndex,
                ) >=
            grassProfile
                .wetThreshold;

        const burnAmountPreservedPassed =
            burnAmountBefore >
            epsilon &&
            Math.abs(
                burnAmountAfter -
                burnAmountBefore,
            ) <=
            epsilon;

        scorchBridge.destroy();

        /*
         * Explicit authored state precedence: a zone deliberately set Wet must
         * remain Wet even if moisture-derived classification is dry.
         */
        const explicitSurfaceSystem =
            new SurfaceSystem(
                SurfaceType.Grass,
            );

        explicitSurfaceSystem
            .addZone({
                id:
                    "8c6-explicit-wet-zone",

                surfaceType:
                    SurfaceType.Grass,

                x:
                    -16,

                y:
                    -16,

                width:
                    32,

                height:
                    32,
            });

        explicitSurfaceSystem
            .setZoneState(
                "8c6-explicit-wet-zone",
                SurfaceState.Wet,
                null,
            );

        const explicitEnvironmentField =
            new EnvironmentField(
                explicitSurfaceSystem,
            );

        const explicitBridge =
            new MoistureSurfaceBridge(
                explicitEnvironmentField,
                explicitSurfaceSystem,
            );

        explicitBridge.update();

        const explicitStatePrecedencePassed =
            explicitSurfaceSystem
                .getSurfaceAt(
                    0,
                    0,
                )
                .surfaceState ===
            SurfaceState.Wet;

        explicitBridge.destroy();

        /*
         * Reset clears the bridge's own derived Wet classification without
         * mutating EnvironmentField physical moisture.
         */
        this.resetAll();

        const resetCell =
            this.getValidationCell();

        const resetBaseline =
            this.environmentField
                .getMoistureByIndex(
                    resetCell.index,
                );

        this.environmentField
            .addMoistureByIndex(
                resetCell.index,
                Math.max(
                    0,
                    grassProfile
                        .wetThreshold +
                    0.02 -
                    resetBaseline,
                ),
            );

        this.moistureSurfaceBridge
            .update();

        const resetWasWet =
            this.surfaceSystem
                .getSurfaceAt(
                    resetCell
                        .environmentCenter
                        .x,
                    resetCell
                        .environmentCenter
                        .y,
                )
                .surfaceState ===
            grassProfile
                .wetState;

        this.moistureSurfaceBridge
            .reset();

        const resetIsDry =
            this.surfaceSystem
                .getSurfaceAt(
                    resetCell
                        .environmentCenter
                        .x,
                    resetCell
                        .environmentCenter
                        .y,
                )
                .surfaceState ===
            grassProfile
                .dryState;

        const resetPassed =
            resetWasWet &&
            resetIsDry &&
            this.moistureSurfaceBridge
                .getWetCellCount() ===
            0;

        const frameRateStable =
            this.runMoistureSurfaceBridgeFrameRateValidation(
                epsilon,
            );

        return {
            grassWetTransitionPassed,
            grassDryTransitionPassed,
            hysteresisPassed,
            sandWetDryPassed,
            scorchedMoistureCompatibilityPassed,
            burnAmountPreservedPassed,
            explicitStatePrecedencePassed,
            resetPassed,
            frameRateStable,
            wetCellCountAfterWet,
            wetCellCountAfterDry,

            passed:
                grassWetTransitionPassed &&
                grassDryTransitionPassed &&
                hysteresisPassed &&
                sandWetDryPassed &&
                scorchedMoistureCompatibilityPassed &&
                burnAmountPreservedPassed &&
                explicitStatePrecedencePassed &&
                resetPassed &&
                frameRateStable,
        };
    }

    private runMoistureSurfaceBridgeFrameRateValidation(
        epsilon: number,
    ): boolean {
        const runCase =
            (
                fps:
                    number,
            ): {
                readonly wetAfterWatering: boolean;
                readonly wetInHysteresisBand: boolean;
                readonly dryAfterDrying: boolean;
                readonly wetCellCount: number;
            } => {
                this.resetAll();

                const {
                    index,
                    environmentCenter,
                } =
                    this.getValidationCell();

                const profile =
                    this.moistureSurfaceBridge
                        .getProfileForSurfaceType(
                            SurfaceType.Grass,
                        );

                if (!profile) {
                    throw new Error(
                        "Phase 8C-6 frame-rate validation requires a Grass profile.",
                    );
                }

                const baseline =
                    this.environmentField
                        .getMoistureByIndex(
                            index,
                        );

                const wateringTarget =
                    Math.min(
                        1,
                        profile.wetThreshold +
                        0.06,
                    );

                const wateringDuration =
                    2;

                const wateringRate =
                    (
                        wateringTarget -
                        baseline
                    ) /
                    wateringDuration;

                for (
                    let frame = 0;
                    frame <
                    wateringDuration *
                    fps;
                    frame += 1
                ) {
                    this.environmentField
                        .addMoistureByIndex(
                            index,
                            wateringRate /
                            fps,
                        );

                    this.moistureSurfaceBridge
                        .update();
                }

                const wetAfterWatering =
                    this.surfaceSystem
                        .getSurfaceAt(
                            environmentCenter.x,
                            environmentCenter.y,
                        )
                        .surfaceState ===
                    profile.wetState;

                const middleTarget =
                    (
                        profile.dryThreshold +
                        profile.wetThreshold
                    ) /
                    2;

                const currentAfterWatering =
                    this.environmentField
                        .getMoistureByIndex(
                            index,
                        );

                const firstDryingDuration =
                    1;

                const firstDryingRate =
                    Math.max(
                        0,
                        currentAfterWatering -
                        middleTarget,
                    ) /
                    firstDryingDuration;

                for (
                    let frame = 0;
                    frame <
                    firstDryingDuration *
                    fps;
                    frame += 1
                ) {
                    this.environmentField
                        .removeMoistureByIndex(
                            index,
                            firstDryingRate /
                            fps,
                        );

                    this.moistureSurfaceBridge
                        .update();
                }

                const wetInHysteresisBand =
                    this.surfaceSystem
                        .getSurfaceAt(
                            environmentCenter.x,
                            environmentCenter.y,
                        )
                        .surfaceState ===
                    profile.wetState;

                const finalTarget =
                    Math.max(
                        this.environmentField
                            .getBaselineMoistureByIndex(
                                index,
                            ),
                        profile.dryThreshold -
                        0.04,
                    );

                const currentMiddle =
                    this.environmentField
                        .getMoistureByIndex(
                            index,
                        );

                const finalDryingDuration =
                    1;

                const finalDryingRate =
                    Math.max(
                        0,
                        currentMiddle -
                        finalTarget,
                    ) /
                    finalDryingDuration;

                for (
                    let frame = 0;
                    frame <
                    finalDryingDuration *
                    fps;
                    frame += 1
                ) {
                    this.environmentField
                        .removeMoistureByIndex(
                            index,
                            finalDryingRate /
                            fps,
                        );

                    this.moistureSurfaceBridge
                        .update();
                }

                const dryAfterDrying =
                    this.surfaceSystem
                        .getSurfaceAt(
                            environmentCenter.x,
                            environmentCenter.y,
                        )
                        .surfaceState ===
                    profile.dryState;

                return {
                    wetAfterWatering,
                    wetInHysteresisBand,
                    dryAfterDrying,
                    wetCellCount:
                        this.moistureSurfaceBridge
                            .getWetCellCount(),
                };
            };

        const result30 =
            runCase(
                30,
            );

        const result60 =
            runCase(
                60,
            );

        const result120 =
            runCase(
                120,
            );

        void epsilon;

        return (
            result30.wetAfterWatering &&
            result60.wetAfterWatering &&
            result120.wetAfterWatering &&
            result30.wetInHysteresisBand &&
            result60.wetInHysteresisBand &&
            result120.wetInHysteresisBand &&
            result30.dryAfterDrying &&
            result60.dryAfterDrying &&
            result120.dryAfterDrying &&
            result30.wetCellCount ===
            result60.wetCellCount &&
            result60.wetCellCount ===
            result120.wetCellCount
        );
    }

    private runFrameRateCase(
        fps: number,
        durationSeconds: number,
    ): FrameRateInfiltrationResult {
        this.resetAll();

        const {
            index,
            waterCenter,
        } =
            this.getValidationCell();

        this.waterField
            .injectWater(
                waterCenter.x,
                waterCenter.y,
                1,
            );

        const frameCount =
            fps *
            durationSeconds;

        for (
            let frame = 0;
            frame < frameCount;
            frame += 1
        ) {
            this.interactionSystem
                .update(
                    1 / fps,
                );
        }

        const accounting =
            this.interactionSystem
                .getTransferAccounting();

        return {
            fps,

            finalWater:
                this.getWaterDepthAtIndex(
                    index,
                ),

            finalMoisture:
                this.environmentField
                    .getMoistureByIndex(
                        index,
                    ),

            totalWaterTransferred:
                accounting
                    .totalWaterTransferred,

            totalMoistureAdded:
                accounting
                    .totalMoistureAdded,
        };
    }

    private frameRateResultsMatch(
        a: FrameRateInfiltrationResult,
        b: FrameRateInfiltrationResult,
        epsilon: number,
    ): boolean {
        return (
            Math.abs(
                a.finalWater -
                b.finalWater,
            ) <=
            epsilon * 4 &&
            Math.abs(
                a.finalMoisture -
                b.finalMoisture,
            ) <=
            epsilon * 4 &&
            Math.abs(
                a.totalWaterTransferred -
                b.totalWaterTransferred,
            ) <=
            epsilon * 4 &&
            Math.abs(
                a.totalMoistureAdded -
                b.totalMoistureAdded,
            ) <=
            epsilon * 4
        );
    }

    private getValidationCell(): {
        readonly index: number;
        readonly gridX: number;
        readonly gridY: number;
        readonly waterCenter: {
            readonly x: number;
            readonly y: number;
        };
        readonly environmentCenter: {
            readonly x: number;
            readonly y: number;
        };
    } {
        const gridX =
            Math.min(
                24,
                this.waterField
                    .getColumnCount() -
                1,
            );

        const gridY =
            Math.min(
                24,
                this.waterField
                    .getRowCount() -
                1,
            );

        const index =
            gridY *
            this.waterField
                .getColumnCount() +
            gridX;

        const waterCenter =
            this.waterField
                .getWorldCenterByIndex(
                    index,
                );

        const environmentCenter =
            this.environmentField
                .getWorldCenterByIndex(
                    index,
                );

        if (
            !waterCenter ||
            !environmentCenter
        ) {
            throw new Error(
                "Phase 8C validation could not resolve a shared field cell.",
            );
        }

        return {
            index,
            gridX,
            gridY,
            waterCenter,
            environmentCenter,
        };
    }

    private getWaterDepthAtIndex(
        index: number,
    ): number {
        const center =
            this.waterField
                .getWorldCenterByIndex(
                    index,
                );

        if (!center) {
            return 0;
        }

        return this.waterField
            .sampleAt(
                center.x,
                center.y,
            )?.depth ?? 0;
    }

    /**
     * Validation-only full-field moisture total.
     *
     * Sparse moisture tracking intentionally drops cells whose excess falls
     * below the tracking threshold. Those tiny amounts still physically exist,
     * so a conservation/accounting test must include every EnvironmentField
     * cell rather than only the sparse tracked set.
     *
     * This full scan runs only inside the development validator, never in the
     * production simulation loop.
     */
    private getTotalTrackedExcessMoisture():
        number {
        let total =
            0;

        const cellCount =
            this.environmentField
                .getCellCount();

        for (
            let index = 0;
            index < cellCount;
            index += 1
        ) {
            total +=
                this.environmentField
                    .getExcessMoistureByIndex(
                        index,
                    );
        }

        return total;
    }

    private resetAll():
        void {
        this.waterField.reset();
        this.environmentField.reset();
        this.interactionSystem.reset();
        this.moistureSurfaceBridge.reset();
    }

    private logResult(
        state: WaterGroundInteractionValidationState,
    ): void {
        console.group(
            "Phase 8C-6 Moisture-to-Surface Bridge validation",
        );

        console.log(
            "8C-1 Foundation",
            {
                coordinateMapping:
                    state.coordinateMappingPassed,

                waterSink:
                    state.waterRemovalPassed,

                groundMoisture:
                    state.moistureAdditionPassed &&
                    state.moistureClampPassed,

                invalidInput:
                    state.invalidInputPassed,

                reset:
                    state.resetPassed,
            },
        );

        console.log(
            "Basic Infiltration",
            {
                initialWater:
                    state.infiltrationInitialWater,

                finalWater:
                    state.infiltrationFinalWater,

                initialMoisture:
                    state.infiltrationInitialMoisture,

                finalMoisture:
                    state.infiltrationFinalMoisture,

                waterTransferred:
                    state.infiltrationWaterTransferred,

                moistureAdded:
                    state.infiltrationMoistureAdded,

                expectedMoistureAdded:
                    state.expectedMoistureAdded,

                passed:
                    state.basicInfiltrationPassed,
            },
        );

        console.log(
            "Transfer Accounting",
            {
                waterTransferred:
                    state.infiltrationWaterTransferred,

                moistureAdded:
                    state.infiltrationMoistureAdded,

                expectedMoistureAdded:
                    state.expectedMoistureAdded,

                passed:
                    state.transferAccountingPassed,
            },
        );

        console.log(
            "Bounds",
            {
                waterBound:
                    state.waterBoundPassed,

                moistureCapacity:
                    state.moistureCapacityPassed,

                saturatedGround:
                    state.saturatedGroundPassed,

                passed:
                    state.waterBoundPassed &&
                    state.moistureCapacityPassed &&
                    state.saturatedGroundPassed,
            },
        );

        console.log(
            "Shallow Water Infiltration",
            {
                shallowWaterTransferred:
                    state.shallowWaterTransferred,

                deepWaterTransferred:
                    state.deepWaterTransferred,

                passed:
                    state.shallowDepthAttenuationPassed,
            },
        );

        console.log(
            "Saturation-Dependent Infiltration",
            {
                dryGrass:
                {
                    waterTransferred:
                        state.dryGrassWaterTransferred,

                    finalWater:
                        state.dryGrassFinalWater,
                },

                halfSaturatedGrass:
                {
                    waterTransferred:
                        state.halfSaturatedGrassWaterTransferred,

                    finalWater:
                        state.halfSaturatedGrassFinalWater,
                },

                nearlySaturatedGrass:
                {
                    waterTransferred:
                        state.nearlySaturatedGrassWaterTransferred,

                    finalWater:
                        state.nearlySaturatedGrassFinalWater,
                },

                passed:
                    state.saturationDependentInfiltrationPassed,
            },
        );

        console.log(
            "Ground Moisture Diffusion",
            {
                centerInitial:
                    state.diffusionCenterInitial,

                centerFinal:
                    state.diffusionCenterFinal,

                north:
                    state.diffusionNorth,

                south:
                    state.diffusionSouth,

                west:
                    state.diffusionWest,

                east:
                    state.diffusionEast,

                symmetryError:
                    state.diffusionSymmetryError,

                initialTrackedCount:
                    state.diffusionInitialTrackedCount,

                finalTrackedCount:
                    state.diffusionFinalTrackedCount,

                bounded:
                    state.diffusionBounded,

                slowSpread:
                    state.diffusionSlowSpread,

                frameRateStable:
                    state.diffusionFrameRateStable,

                passed:
                    state.moistureDiffusionPassed,
            },
        );

        console.log(
            "Ground Drying",
            {
                baselineMoisture:
                    state.dryingBaselineMoisture,

                initialMoisture:
                    state.dryingInitialMoisture,

                finalMoisture:
                    state.dryingFinalMoisture,

                initialTrackedCount:
                    state.dryingTrackedInitial,

                finalTrackedCount:
                    state.dryingTrackedFinal,

                baselinePreservation:
                    state.baselinePreservationPassed,

                passed:
                    state.groundDryingPassed,
            },
        );

        console.log(
            "Shallow Water Dissipation",
            {
                tinyFilmInitialWater:
                    state.tinyFilmInitialWater,

                tinyFilmFinalWater:
                    state.tinyFilmFinalWater,

                normalPuddleDissipation:
                    state.normalPuddleDissipation,

                passed:
                    state.shallowWaterDissipationPassed,
            },
        );

        console.log(
            "Drying Lifecycle",
            {
                initialWater:
                    state.lifecycleInitialWater,

                waterAfterDrain:
                    state.lifecycleWaterAfterDrain,

                moistureAfterDrain:
                    state.lifecycleMoistureAfterDrain,

                finalMoisture:
                    state.lifecycleFinalMoisture,

                baselineMoisture:
                    state.lifecycleBaselineMoisture,

                passed:
                    state.lifecyclePassed,
            },
        );

        console.log(
            "8C-5 Frame Rate Stability",
            {
                passed:
                    state.dryingFrameRateStabilityPassed,
            },
        );

        console.log(
            "Moisture-to-Surface Bridge",
            {
                grassWetTransition:
                    state.grassWetTransitionPassed,

                grassDryTransition:
                    state.grassDryTransitionPassed,

                hysteresis:
                    state.hysteresisPassed,

                sandWetDry:
                    state.sandWetDryPassed,

                scorchedMoistureCompatibility:
                    state.scorchedMoistureCompatibilityPassed,

                burnAmountPreserved:
                    state.burnAmountPreservedPassed,

                explicitStatePrecedence:
                    state.explicitStatePrecedencePassed,

                reset:
                    state.moistureSurfaceBridgeResetPassed,

                frameRateStable:
                    state.moistureSurfaceBridgeFrameRateStable,

                wetCellCountAfterWet:
                    state.bridgeWetCellCountAfterWet,

                wetCellCountAfterDry:
                    state.bridgeWetCellCountAfterDry,

                passed:
                    state.moistureSurfaceBridgePassed,
            },
        );

        console.log(
            "Frame Rate Stability",
            {
                fps30:
                    state.frameRate30,

                fps60:
                    state.frameRate60,

                fps120:
                    state.frameRate120,

                passed:
                    state.frameRateStabilityPassed,
            },
        );

        if (state.passed) {
            console.log(
                "RESULT: PASS",
            );
        } else {
            console.error(
                "RESULT: FAIL",
                state,
            );
        }

        console.groupEnd();
    }
}
