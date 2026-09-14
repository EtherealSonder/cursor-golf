import {
    DEFAULT_HYDRANT_DAMAGE_DEFINITION,
} from "../config/HydrantDamageDefinition";

import {
    HydrantDamageState,
} from "../config/HydrantDamageState";

import {
    HydrantDamageController,
} from "../entities/mechanisms/HydrantDamageController";

export interface HydrantDamageValidationState {
    readonly initialStateNormalPassed: boolean;
    readonly weakNormalImpactIgnoredPassed: boolean;
    readonly repeatedWeakHitsDoNotAccumulatePassed: boolean;
    readonly qualifyingNormalImpactDamagesPassed: boolean;
    readonly normalCannotSkipDirectlyToBrokenPassed: boolean;
    readonly cooldownPassed: boolean;
    readonly weakDamagedImpactIgnoredPassed: boolean;
    readonly qualifyingDamagedImpactBreaksPassed: boolean;
    readonly brokenStateTerminalPassed: boolean;
    readonly resetRestoresNormalPassed: boolean;
    readonly passed: boolean;
}

export class HydrantDamageValidation {
    private readonly state:
        HydrantDamageValidationState;

    public constructor() {
        this.state =
            this.run();
    }

    public getState():
        HydrantDamageValidationState {
        return this.state;
    }

    private run():
        HydrantDamageValidationState {
        const definition =
            DEFAULT_HYDRANT_DAMAGE_DEFINITION;

        const controller =
            new HydrantDamageController(
                definition,
            );

        const initialStateNormalPassed =
            controller.getState() ===
            HydrantDamageState.Normal &&
            controller.getCooldownRemaining() ===
            0;

        const weakNormalSpeed =
            definition
                .normalToDamagedImpactSpeed *
            0.75;

        const weak =
            controller.applyImpact(
                weakNormalSpeed,
            );

        const weakNormalImpactIgnoredPassed =
            !weak.accepted &&
            !weak.stateChanged &&
            controller.getState() ===
            HydrantDamageState.Normal;

        for (
            let index = 0;
            index < 100;
            index += 1
        ) {
            controller.applyImpact(
                weakNormalSpeed,
            );
        }

        const repeatedWeakHitsDoNotAccumulatePassed =
            controller.getState() ===
            HydrantDamageState.Normal &&
            controller.getCooldownRemaining() ===
            0;

        const extremelyStrongFirstImpact =
            controller.applyImpact(
                definition
                    .damagedToBrokenImpactSpeed *
                3,
            );

        const qualifyingNormalImpactDamagesPassed =
            extremelyStrongFirstImpact
                .accepted &&
            extremelyStrongFirstImpact
                .stateChanged &&
            controller.getState() ===
            HydrantDamageState.Damaged;

        const normalCannotSkipDirectlyToBrokenPassed =
            controller.getState() !==
            HydrantDamageState.Broken;

        const immediateSecondImpact =
            controller.applyImpact(
                definition
                    .damagedToBrokenImpactSpeed *
                2,
            );

        const cooldownPassed =
            !immediateSecondImpact
                .accepted &&
            controller.getState() ===
            HydrantDamageState.Damaged;

        controller.update(
            definition
                .impactCooldown,
        );

        const weakDamaged =
            controller.applyImpact(
                definition
                    .damagedToBrokenImpactSpeed *
                0.75,
            );

        const weakDamagedImpactIgnoredPassed =
            !weakDamaged.accepted &&
            controller.getState() ===
            HydrantDamageState.Damaged;

        for (
            let index = 0;
            index < 50;
            index += 1
        ) {
            controller.applyImpact(
                definition
                    .damagedToBrokenImpactSpeed *
                0.75,
            );
        }

        const qualifyingBreak =
            controller.applyImpact(
                definition
                    .damagedToBrokenImpactSpeed,
            );

        const qualifyingDamagedImpactBreaksPassed =
            qualifyingBreak.accepted &&
            qualifyingBreak.destroyed &&
            controller.getState() ===
            HydrantDamageState.Broken;

        controller.update(
            definition
                .impactCooldown,
        );

        const postBreak =
            controller.applyImpact(
                definition
                    .damagedToBrokenImpactSpeed *
                4,
            );

        const brokenStateTerminalPassed =
            !postBreak.accepted &&
            !postBreak.stateChanged &&
            controller.getState() ===
            HydrantDamageState.Broken;

        controller.reset();

        const resetRestoresNormalPassed =
            controller.getState() ===
            HydrantDamageState.Normal &&
            controller.getCooldownRemaining() ===
            0;

        const passed =
            initialStateNormalPassed &&
            weakNormalImpactIgnoredPassed &&
            repeatedWeakHitsDoNotAccumulatePassed &&
            qualifyingNormalImpactDamagesPassed &&
            normalCannotSkipDirectlyToBrokenPassed &&
            cooldownPassed &&
            weakDamagedImpactIgnoredPassed &&
            qualifyingDamagedImpactBreaksPassed &&
            brokenStateTerminalPassed &&
            resetRestoresNormalPassed;

        const state = {
            initialStateNormalPassed,
            weakNormalImpactIgnoredPassed,
            repeatedWeakHitsDoNotAccumulatePassed,
            qualifyingNormalImpactDamagesPassed,
            normalCannotSkipDirectlyToBrokenPassed,
            cooldownPassed,
            weakDamagedImpactIgnoredPassed,
            qualifyingDamagedImpactBreaksPassed,
            brokenStateTerminalPassed,
            resetRestoresNormalPassed,
            passed,
        };

        console.group(
            "Phase 8B-14A Hydrant Discrete Damage Validation",
        );

        console.log(
            "Initial State",
            { initialStateNormalPassed },
        );

        console.log(
            "Weak Impacts",
            {
                weakNormalImpactIgnoredPassed,
                repeatedWeakHitsDoNotAccumulatePassed,
                weakDamagedImpactIgnoredPassed,
            },
        );

        console.log(
            "State Progression",
            {
                qualifyingNormalImpactDamagesPassed,
                normalCannotSkipDirectlyToBrokenPassed,
                qualifyingDamagedImpactBreaksPassed,
            },
        );

        console.log(
            "Impact Cooldown",
            { cooldownPassed },
        );

        console.log(
            "Terminal / Reset",
            {
                brokenStateTerminalPassed,
                resetRestoresNormalPassed,
            },
        );

        console.log(
            "RESULT",
            passed
                ? "PASS"
                : "FAIL",
        );

        console.groupEnd();

        return state;
    }
}
