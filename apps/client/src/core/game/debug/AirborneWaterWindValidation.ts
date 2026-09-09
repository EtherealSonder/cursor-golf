import {
    WaterSourceType,
} from "../config/WaterSourceDefinition";

import {
    AirborneWaterPacket,
} from "../environment/AirborneWaterPacket";

import {
    LocalWindSystem,
} from "../environment/LocalWindSystem";

import {
    WindManager,
} from "../environment/WindManager";

export interface AirborneWaterWindValidationState {
    readonly noWindPassed: boolean;
    readonly globalWindPassed: boolean;
    readonly localWindPassed: boolean;
    readonly outsideLocalWindPassed: boolean;
    readonly zeroResponsePassed: boolean;
    readonly responseScalingPassed: boolean;
    readonly combinedWindPassed: boolean;
    readonly fixedStepDeterminismPassed: boolean;
    readonly passed: boolean;
}

interface LandingResult {
    readonly x: number;
    readonly y: number;
    readonly velocityX: number;
    readonly velocityY: number;
}

/**
 * Development-only numerical validation for Phase 8B-7.
 *
 * The tests exercise the same authoritative packet integration and Wind query
 * services used at runtime without depositing Water into the gameplay field.
 */
export class AirborneWaterWindValidation {
    private state:
        AirborneWaterWindValidationState | null =
        null;

    public run():
        AirborneWaterWindValidationState {

        const calm =
            this.simulateLanding(
                0,
                0,
                0.8,
                null,
            );

        const ballisticExpectedX =
            this.calculateBallisticLandingX(
                420,
                Math.PI / 4,
                980,
            );

        const noWindPassed =
            Math.abs(
                calm.x -
                ballisticExpectedX,
            ) <= 0.0001 &&
            Math.abs(calm.y) <=
            0.0001;

        const globalRight =
            this.simulateLanding(
                0,
                80,
                0.8,
                null,
            );

        const globalWindPassed =
            globalRight.x >
            calm.x + 1;

        const localSource = {
            id: "8B-7-local-right",
            positionX: 0,
            positionY: 0,
            directionRadians: 0,
            range: 600,
            startHalfWidth: 120,
            endHalfWidth: 120,
            acceleration: 900,
            endStrengthMultiplier: 1,
            edgeFalloffFraction: 0,
            enabled: true,
        } as const;

        const localRight =
            this.simulateLanding(
                0,
                0,
                0.8,
                new LocalWindSystem([
                    localSource,
                ]),
            );

        const localWindPassed =
            localRight.x >
            calm.x + 1;

        const outsideLocal =
            this.simulateLanding(
                Math.PI,
                0,
                0.8,
                new LocalWindSystem([
                    localSource,
                ]),
            );

        const outsideLocalWindPassed =
            Math.abs(
                outsideLocal.x +
                ballisticExpectedX,
            ) <= 0.0001;

        const zeroResponse =
            this.simulateLanding(
                0,
                80,
                0,
                new LocalWindSystem([
                    localSource,
                ]),
            );

        const zeroResponsePassed =
            Math.abs(
                zeroResponse.x -
                ballisticExpectedX,
            ) <= 0.0001;

        const responseLow =
            this.simulateLanding(
                0,
                80,
                0.4,
                null,
            );

        const responseMedium =
            this.simulateLanding(
                0,
                80,
                0.8,
                null,
            );

        const responseHigh =
            this.simulateLanding(
                0,
                80,
                1,
                null,
            );

        const responseScalingPassed =
            responseLow.x <
            responseMedium.x &&
            responseMedium.x <
            responseHigh.x;

        const combined =
            this.simulateLanding(
                0,
                80,
                0.8,
                new LocalWindSystem([
                    localSource,
                ]),
            );

        const combinedWindPassed =
            combined.x >
            globalRight.x &&
            combined.x >
            localRight.x;

        /*
         * AirborneWaterSystem always advances packets with its fixed 1/60 s
         * simulation step. This reproduces the transport result using three
         * different render-frame groupings while retaining the same fixed
         * packet substeps.
         */
        const at30 =
            this.simulateFixedStepGrouped(
                1 / 30,
            );

        const at60 =
            this.simulateFixedStepGrouped(
                1 / 60,
            );

        const at120 =
            this.simulateFixedStepGrouped(
                1 / 120,
            );

        const fixedStepDeterminismPassed =
            Math.max(
                Math.abs(
                    at30.x -
                    at60.x,
                ),
                Math.abs(
                    at120.x -
                    at60.x,
                ),
                Math.abs(
                    at30.y -
                    at60.y,
                ),
                Math.abs(
                    at120.y -
                    at60.y,
                ),
            ) <=
            0.0001;

        const passed =
            noWindPassed &&
            globalWindPassed &&
            localWindPassed &&
            outsideLocalWindPassed &&
            zeroResponsePassed &&
            responseScalingPassed &&
            combinedWindPassed &&
            fixedStepDeterminismPassed;

        this.state = {
            noWindPassed,
            globalWindPassed,
            localWindPassed,
            outsideLocalWindPassed,
            zeroResponsePassed,
            responseScalingPassed,
            combinedWindPassed,
            fixedStepDeterminismPassed,
            passed,
        };

        console.log(
            "Phase 8B-7 Airborne Water + Wind Validation",
            {
                ...this.state,
                calmLandingX:
                    calm.x,
                globalWindLandingX:
                    globalRight.x,
                localWindLandingX:
                    localRight.x,
                combinedLandingX:
                    combined.x,
                responseLandingX: {
                    low:
                        responseLow.x,
                    medium:
                        responseMedium.x,
                    high:
                        responseHigh.x,
                },
                groupedLandingX: {
                    fps30:
                        at30.x,
                    fps60:
                        at60.x,
                    fps120:
                        at120.x,
                },
            },
        );

        return this.state;
    }

    public getState():
        AirborneWaterWindValidationState | null {

        return this.state;
    }

    private simulateLanding(
        directionRadians: number,
        globalWindStrength: number,
        windResponse: number,
        localWindSystem:
            LocalWindSystem | null,
    ): LandingResult {

        const windManager =
            new WindManager();

        windManager.setWind(
            0,
            globalWindStrength,
        );

        const launchSpeed =
            420;

        const elevation =
            Math.PI / 4;

        const horizontalSpeed =
            Math.cos(elevation) *
            launchSpeed;

        const packet =
            new AirborneWaterPacket(
                "8B-7-validation",
                WaterSourceType.Sprinkler,
                1,
                0,
                0,
                Math.cos(directionRadians) *
                horizontalSpeed,
                Math.sin(directionRadians) *
                horizontalSpeed,
                Math.sin(elevation) *
                launchSpeed,
                0.01,
                windResponse,
            );

        const fixedStep =
            1 / 60;

        for (
            let step = 0;
            step < 600;
            step += 1
        ) {
            const global =
                windManager
                    .getAcceleration();

            const local =
                localWindSystem
                    ?.getAccelerationAt(
                        packet.getPositionX(),
                        packet.getPositionY(),
                    ) ??
                { x: 0, y: 0 };

            const impact =
                packet.step(
                    fixedStep,
                    980,
                    global.x +
                    local.x,
                    global.y +
                    local.y,
                );

            if (impact) {
                return {
                    x:
                        impact.positionX,
                    y:
                        impact.positionY,
                    velocityX:
                        impact.velocityX,
                    velocityY:
                        impact.velocityY,
                };
            }
        }

        throw new Error(
            "8B-7 validation packet did not land.",
        );
    }

    private simulateFixedStepGrouped(
        renderDelta: number,
    ): LandingResult {

        const windManager =
            new WindManager();

        windManager.setWind(
            0,
            80,
        );

        const localWindSystem =
            new LocalWindSystem([
                {
                    id:
                        "8B-7-determinism-local",
                    positionX: 0,
                    positionY: 0,
                    directionRadians:
                        Math.PI / 2,
                    range: 600,
                    startHalfWidth: 180,
                    endHalfWidth: 180,
                    acceleration: 700,
                    endStrengthMultiplier: 1,
                    edgeFalloffFraction: 0,
                    enabled: true,
                },
            ]);

        const launchSpeed =
            420;

        const elevation =
            Math.PI / 4;

        const packet =
            new AirborneWaterPacket(
                "8B-7-determinism",
                WaterSourceType.Sprinkler,
                1,
                0,
                0,
                Math.cos(elevation) *
                launchSpeed,
                0,
                Math.sin(elevation) *
                launchSpeed,
                0.01,
                0.8,
            );

        const fixedStep =
            1 / 60;

        let accumulator =
            0;

        for (
            let frame = 0;
            frame < 600;
            frame += 1
        ) {
            accumulator +=
                renderDelta;

            while (
                accumulator +
                1e-12 >=
                fixedStep
            ) {
                const global =
                    windManager
                        .getAcceleration();

                const local =
                    localWindSystem
                        .getAccelerationAt(
                            packet.getPositionX(),
                            packet.getPositionY(),
                        );

                const impact =
                    packet.step(
                        fixedStep,
                        980,
                        global.x +
                        local.x,
                        global.y +
                        local.y,
                    );

                accumulator -=
                    fixedStep;

                if (impact) {
                    return {
                        x:
                            impact.positionX,
                        y:
                            impact.positionY,
                        velocityX:
                            impact.velocityX,
                        velocityY:
                            impact.velocityY,
                    };
                }
            }
        }

        throw new Error(
            "8B-7 grouped validation packet did not land.",
        );
    }

    private calculateBallisticLandingX(
        launchSpeed: number,
        elevationRadians: number,
        gravity: number,
    ): number {

        const horizontalSpeed =
            Math.cos(
                elevationRadians,
            ) *
            launchSpeed;

        const verticalSpeed =
            Math.sin(
                elevationRadians,
            ) *
            launchSpeed;

        const flightTime =
            2 *
            verticalSpeed /
            gravity;

        return (
            horizontalSpeed *
            flightTime
        );
    }
}
