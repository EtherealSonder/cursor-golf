import {
    DEFAULT_HYDRANT_DAMAGE_DEFINITION,
} from "../config/HydrantDamageDefinition";

import {
    HydrantDamageController,
} from "../entities/mechanisms/HydrantDamageController";

export interface HydrantDamageValidationState {
    readonly weakImpactIgnoredPassed: boolean;
    readonly moderateImpactDamagesPassed: boolean;
    readonly strongImpactDamagesMorePassed: boolean;
    readonly cooldownPassed: boolean;
    readonly repeatedStrongImpactsDestroyPassed: boolean;
    readonly durabilityBoundPassed: boolean;
    readonly brokenTerminalPassed: boolean;
    readonly resetPassed: boolean;
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

        const weak =
            controller.applyImpact(
                definition.minimumImpactSpeed *
                    0.5,
                1,
            );

        const weakImpactIgnoredPassed =
            !weak.accepted &&
            weak.damage === 0 &&
            controller.getDurability() ===
                definition.maxDurability;

        /*
         * These speeds deliberately sit above both the speed and energy
         * thresholds for a unit-mass validation body.
         */
        const moderateSpeed =
            Math.max(
                definition.minimumImpactSpeed +
                    40,
                Math.sqrt(
                    definition.minimumImpactEnergy *
                    3,
                ),
            );

        const moderate =
            controller.applyImpact(
                moderateSpeed,
                1,
            );

        const moderateImpactDamagesPassed =
            moderate.accepted &&
            moderate.damage > 0 &&
            moderate.remainingDurability <
                definition.maxDurability;

        controller.update(
            definition.impactCooldown,
        );

        const strong =
            controller.applyImpact(
                moderateSpeed * 1.75,
                1,
            );

        const strongImpactDamagesMorePassed =
            strong.accepted &&
            strong.damage >
                moderate.damage;

        const immediateRepeat =
            controller.applyImpact(
                moderateSpeed * 1.75,
                1,
            );

        const cooldownPassed =
            !immediateRepeat.accepted &&
            immediateRepeat.damage === 0;

        controller.reset();

        let destroyed =
            false;

        for (
            let index = 0;
            index < 4 &&
            !destroyed;
            index += 1
        ) {
            const result =
                controller.applyImpact(
                    moderateSpeed * 2,
                    1,
                );

            destroyed =
                result.destroyed;

            controller.update(
                definition.impactCooldown,
            );
        }

        const repeatedStrongImpactsDestroyPassed =
            destroyed &&
            controller.isBroken();

        const durabilityBoundPassed =
            controller.getDurability() >= 0;

        const durabilityBefore =
            controller.getDurability();

        const postBreak =
            controller.applyImpact(
                moderateSpeed * 3,
                1,
            );

        const brokenTerminalPassed =
            !postBreak.accepted &&
            controller.getDurability() ===
                durabilityBefore;

        controller.reset();

        const resetPassed =
            !controller.isBroken() &&
            controller.getDurability() ===
                definition.maxDurability &&
            controller.getCooldownRemaining() ===
                0;

        const passed =
            weakImpactIgnoredPassed &&
            moderateImpactDamagesPassed &&
            strongImpactDamagesMorePassed &&
            cooldownPassed &&
            repeatedStrongImpactsDestroyPassed &&
            durabilityBoundPassed &&
            brokenTerminalPassed &&
            resetPassed;

        const state = {
            weakImpactIgnoredPassed,
            moderateImpactDamagesPassed,
            strongImpactDamagesMorePassed,
            cooldownPassed,
            repeatedStrongImpactsDestroyPassed,
            durabilityBoundPassed,
            brokenTerminalPassed,
            resetPassed,
            passed,
        };

        console.group(
            "Phase 8B-11 Hydrant Damage Validation",
        );

        console.log(
            "Weak Impact",
            { weakImpactIgnoredPassed },
        );

        console.log(
            "Damage Scaling",
            {
                moderateImpactDamagesPassed,
                strongImpactDamagesMorePassed,
            },
        );

        console.log(
            "Impact Cooldown",
            { cooldownPassed },
        );

        console.log(
            "Destruction",
            {
                repeatedStrongImpactsDestroyPassed,
                durabilityBoundPassed,
            },
        );

        console.log(
            "Broken State",
            { brokenTerminalPassed },
        );

        console.log(
            "Reset",
            { resetPassed },
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
