import type {
    EnvironmentField,
} from "../environment/EnvironmentField";

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
    ) { }

    public run():
        WaterGroundInteractionValidationState {
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
            frameRateStabilityPassed;

        /*
         * Leave normal gameplay with clean Water/interaction state, matching
         * the existing development-validation convention.
         */
        this.waterField.reset();
        this.environmentField.reset();
        this.interactionSystem.reset();

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

        const transferAccountingPassed =
            Math.abs(
                (
                    initialWater -
                    finalWater
                ) -
                waterTransferred,
            ) <=
            epsilon * 4 &&
            Math.abs(
                (
                    finalMoisture -
                    initialMoisture
                ) -
                moistureAdded,
            ) <=
            epsilon * 4 &&
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

        return (
            finalMoisture <=
            maximumMoisture +
            epsilon &&
            Math.abs(
                finalMoisture -
                maximumMoisture,
            ) <=
            epsilon * 4 &&
            waterRemoved <=
            maximumWaterAllowedByCapacity +
            epsilon * 4
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
                    .fixedTimeStep *
                2,
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
            Math.abs(
                finalMoisture -
                maximumMoisture,
            ) <= epsilon &&
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

    private resetAll():
        void {
        this.waterField.reset();
        this.environmentField.reset();
        this.interactionSystem.reset();
    }

    private logResult(
        state: WaterGroundInteractionValidationState,
    ): void {
        console.group(
            "Phase 8C-3 Saturation-Dependent Infiltration validation",
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
