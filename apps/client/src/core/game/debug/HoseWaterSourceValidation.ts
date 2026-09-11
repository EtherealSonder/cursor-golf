import {
    DEFAULT_HOSE_WATER_DEFINITION,
    createHoseWaterSourceDefinition,
} from "../config/HoseWaterDefinition";

import {
    WaterSourceType,
} from "../config/WaterSourceDefinition";

import {
    WaterSourceSystem,
} from "../environment/WaterSourceSystem";

export interface HoseWaterSourceValidationState {

    readonly registrationPassed:
    boolean;

    readonly directionalJetTypePassed:
    boolean;

    readonly transformPassed:
    boolean;

    readonly tuningPassed:
    boolean;

    readonly disabledByDefaultPassed:
    boolean;

    readonly enableDisablePassed:
    boolean;

    readonly duplicateRejectedPassed:
    boolean;

    readonly noEmissionWhileDisabledPassed:
    boolean;

    readonly removalPassed:
    boolean;

    readonly passed:
    boolean;
}

/**
 * Development-only Phase 8B-10B.2 validation.
 *
 * This test deliberately uses an isolated WaterSourceSystem so it cannot
 * disturb the live Sprinkler or Hydrant/Hose source owned by World.
 */
export class HoseWaterSourceValidation {

    private state:
        HoseWaterSourceValidationState | null =
        null;

    public run():
        HoseWaterSourceValidationState {

        const sourceSystem =
            new WaterSourceSystem();

        const sourceId =
            "hose-water-source-validation";

        const positionX =
            320;

        const positionY =
            240;

        const directionRadians =
            Math.PI /
            3;

        const sourceDefinition =
            createHoseWaterSourceDefinition(
                sourceId,
                positionX,
                positionY,
                directionRadians,

                /*
                 * 8B-10B.2 registers the gameplay Hose source disabled so no
                 * jet is emitted before dynamic nozzle coupling exists.
                 */
                false,
            );

        const source =
            sourceSystem.addSource(
                sourceDefinition,
            );

        const registrationPassed =
            sourceSystem
                .getSourceCount() ===
            1 &&
            sourceSystem
                .getSource(
                    sourceId,
                ) ===
            source;

        const directionalJetTypePassed =
            source.getType() ===
            WaterSourceType
                .DirectionalJet;

        const transformPassed =
            Math.abs(
                source.getPositionX() -
                positionX,
            ) <
            1e-9 &&
            Math.abs(
                source.getPositionY() -
                positionY,
            ) <
            1e-9 &&
            Math.abs(
                source
                    .getDirectionRadians() -
                directionRadians,
            ) <
            1e-9;

        const tuningPassed =
            Math.abs(
                source.getFlowRate() -
                DEFAULT_HOSE_WATER_DEFINITION
                    .flowRate,
            ) <
            1e-9 &&
            Math.abs(
                source.getEmissionInterval() -
                DEFAULT_HOSE_WATER_DEFINITION
                    .emissionInterval,
            ) <
            1e-9 &&
            Math.abs(
                source.getLaunchSpeed() -
                DEFAULT_HOSE_WATER_DEFINITION
                    .launchSpeed,
            ) <
            1e-9 &&
            Math.abs(
                source
                    .getLaunchElevationRadians() -
                DEFAULT_HOSE_WATER_DEFINITION
                    .launchElevationRadians,
            ) <
            1e-9 &&
            Math.abs(
                source.getWindResponse() -
                DEFAULT_HOSE_WATER_DEFINITION
                    .windResponse,
            ) <
            1e-9 &&
            Math.abs(
                (
                    sourceDefinition
                        .impactMomentumRetention ??
                    -1
                ) -
                DEFAULT_HOSE_WATER_DEFINITION
                    .impactMomentumRetention,
            ) <
            1e-9;

        const disabledByDefaultPassed =
            !source.isEnabled();

        source.setEnabled(
            true,
        );

        const enabled =
            source.isEnabled();

        source.setEnabled(
            false,
        );

        const disabledAgain =
            !source.isEnabled();

        const enableDisablePassed =
            enabled &&
            disabledAgain;

        let duplicateRejectedPassed =
            false;

        try {
            sourceSystem.addSource(
                sourceDefinition,
            );
        } catch {
            duplicateRejectedPassed =
                true;
        }

        sourceSystem.update(
            1,
        );

        const noEmissionWhileDisabledPassed =
            sourceSystem
                .getPendingRequestCount() ===
            0 &&
            source
                .getEmissionSequence() ===
            0;

        const removed =
            sourceSystem.removeSource(
                sourceId,
            );

        const removalPassed =
            removed &&
            sourceSystem
                .getSourceCount() ===
            0 &&
            sourceSystem
                .getSource(
                    sourceId,
                ) ===
            null;

        const passed =
            registrationPassed &&
            directionalJetTypePassed &&
            transformPassed &&
            tuningPassed &&
            disabledByDefaultPassed &&
            enableDisablePassed &&
            duplicateRejectedPassed &&
            noEmissionWhileDisabledPassed &&
            removalPassed;

        this.state = {
            registrationPassed,
            directionalJetTypePassed,
            transformPassed,
            tuningPassed,
            disabledByDefaultPassed,
            enableDisablePassed,
            duplicateRejectedPassed,
            noEmissionWhileDisabledPassed,
            removalPassed,
            passed,
        };

        console.group(
            "Phase 8B-10B.2 Hose DirectionalJet Source Validation",
        );

        console.log(
            "Registration",
            {
                registrationPassed,
                sourceCountAfterRegistration:
                    1,
            },
        );

        console.log(
            "Source Type",
            {
                type:
                    source.getType(),
                directionalJetTypePassed,
            },
        );

        console.log(
            "Initial Transform",
            {
                positionX:
                    source.getPositionX(),
                positionY:
                    source.getPositionY(),
                directionRadians:
                    source
                        .getDirectionRadians(),
                transformPassed,
            },
        );

        console.log(
            "Hose Water Tuning",
            {
                flowRate:
                    source.getFlowRate(),
                emissionInterval:
                    source
                        .getEmissionInterval(),
                launchSpeed:
                    source.getLaunchSpeed(),
                launchElevationRadians:
                    source
                        .getLaunchElevationRadians(),
                windResponse:
                    source.getWindResponse(),
                impactMomentumRetention:
                    sourceDefinition
                        .impactMomentumRetention,
                tuningPassed,
            },
        );

        console.log(
            "Disabled Registration",
            {
                disabledByDefaultPassed,
                noEmissionWhileDisabledPassed,
            },
        );

        console.log(
            "Enable / Disable",
            {
                enableDisablePassed,
            },
        );

        console.log(
            "Duplicate Rejection",
            {
                duplicateRejectedPassed,
            },
        );

        console.log(
            "Removal",
            {
                removalPassed,
            },
        );

        console.log(
            "RESULT",
            passed
                ? "PASS"
                : "FAIL",
        );

        console.groupEnd();

        return this.state;
    }

    public getState():
        HoseWaterSourceValidationState | null {

        return this.state;
    }
}
