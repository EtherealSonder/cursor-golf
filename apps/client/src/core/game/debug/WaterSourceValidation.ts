import {
    WaterSourceType,
} from "../config/WaterSourceDefinition";

import {
    WaterSourceSystem,
} from "../environment/WaterSourceSystem";

export interface WaterSourceValidationState {
    readonly registrationPassed: boolean;
    readonly duplicateRejected: boolean;
    readonly timingPassed: boolean;
    readonly disabledPassed: boolean;
    readonly transformPassed: boolean;
    readonly resetPassed: boolean;
    readonly removalPassed: boolean;
    readonly passed: boolean;
}

/** Development-only validation for Phase 8B-1 Water source infrastructure. */
export class WaterSourceValidation {
    private state:
        WaterSourceValidationState | null =
        null;

    public run(): WaterSourceValidationState {
        const system =
            new WaterSourceSystem();

        const source =
            system.addSource({
                id: "8B-1-validation-sprinkler",
                type: WaterSourceType.Sprinkler,
                enabled: true,
                positionX: 100,
                positionY: 200,
                directionRadians: 0,
                flowRate: 4,
                emissionInterval: 0.1,
                launchSpeed: 300,
                launchElevationRadians:
                    Math.PI / 4,
                windResponse: 0.75,
            });

        const registrationPassed =
            system.getSourceCount() === 1 &&
            system.getSource(
                source.getId(),
            ) === source;

        let duplicateRejected = false;

        try {
            system.addSource({
                id: source.getId(),
                type: WaterSourceType.Sprinkler,
                enabled: true,
                positionX: 0,
                positionY: 0,
                directionRadians: 0,
                flowRate: 1,
                emissionInterval: 0.1,
                launchSpeed: 1,
                launchElevationRadians:
                    Math.PI / 4,
                windResponse: 1,
            });
        } catch {
            duplicateRejected = true;
        }

        system.update(0.05);
        const firstHalfIntervalCount =
            system.getPendingRequestCount();

        system.update(0.05);
        const firstFullIntervalRequests =
            system.drainEmissionRequests();

        system.update(0.3);
        const threeIntervalRequests =
            system.drainEmissionRequests();

        const timingPassed =
            firstHalfIntervalCount === 0 &&
            firstFullIntervalRequests.length === 1 &&
            threeIntervalRequests.length === 3 &&
            firstFullIntervalRequests[0]?.sequence === 1 &&
            firstFullIntervalRequests[0]
                ?.launchElevationRadians ===
            Math.PI / 4 &&
            threeIntervalRequests[2]?.sequence === 4 &&
            Math.abs(
                (
                    firstFullIntervalRequests[0]?.waterAmount ??
                    0
                ) -
                0.4,
            ) <= 0.000001;

        source.setEnabled(false);
        system.update(0.5);
        const disabledPassed =
            system.getPendingRequestCount() === 0;

        source.setPosition(321, 654);
        source.setDirectionRadians(1.25);

        const transformPassed =
            source.getPositionX() === 321 &&
            source.getPositionY() === 654 &&
            source.getDirectionRadians() === 1.25;

        system.reset();

        const resetPassed =
            system.getSourceCount() === 1 &&
            system.getPendingRequestCount() === 0 &&
            source.isEnabled() &&
            source.getPositionX() === 100 &&
            source.getPositionY() === 200 &&
            source.getDirectionRadians() === 0 &&
            source.getEmissionSequence() === 0;

        const removalPassed =
            system.removeSource(
                source.getId(),
            ) &&
            system.getSourceCount() === 0;

        const passed =
            registrationPassed &&
            duplicateRejected &&
            timingPassed &&
            disabledPassed &&
            transformPassed &&
            resetPassed &&
            removalPassed;

        this.state = {
            registrationPassed,
            duplicateRejected,
            timingPassed,
            disabledPassed,
            transformPassed,
            resetPassed,
            removalPassed,
            passed,
        };

        console.group(
            "Phase 8B-1 WaterSource core validation",
        );

        console.log("Registration", {
            registrationPassed,
            duplicateRejected,
        });

        console.log("Timing", {
            firstHalfIntervalCount,
            firstFullIntervalCount:
                firstFullIntervalRequests.length,
            threeIntervalCount:
                threeIntervalRequests.length,
            timingPassed,
        });

        console.log("Enabled State", {
            disabledPassed,
        });

        console.log("Runtime Transform", {
            transformPassed,
        });

        console.log("Reset", {
            resetPassed,
        });

        console.log("Removal", {
            removalPassed,
        });

        if (
            passed
        ) {
            console.log("RESULT: PASS");
        } else {
            console.error(
                "RESULT: FAIL",
                this.state,
            );
        }

        console.groupEnd();

        return this.state;
    }

    public getState(): WaterSourceValidationState | null {
        return this.state;
    }
}
