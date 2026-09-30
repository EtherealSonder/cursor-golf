import type {
    LocalWindSourceDefinition,
} from "../config/LocalWindDefinition";
import {
    LocalWindSystem,
} from "../environment/LocalWindSystem";
import type {
    DynamicCollidable,
} from "../physics/DynamicCollidable";
import {
    WindSuctionCaptureSystem,
} from "../physics/wind/WindSuctionCaptureSystem";

/**
 * D-7 focused contract validation for lethal Ball suction.
 *
 * Uses the real capture system with a minimal test body. No World state,
 * presentation or lives are mutated.
 */
export class BallWindSuctionDeathValidation {
    public static validate(): void {
        let x = 0;
        let y = 0;
        let deathRequests = 0;

        const body = {
            getX: (): number => x,
            getY: (): number => y,
            getInverseMass: (): number => 1,
        } as DynamicCollidable;

        const makeSource = (
            overrides:
                Partial<LocalWindSourceDefinition> = {},
        ): LocalWindSourceDefinition => ({
            id: "d7-validation-wind",
            positionX: 0,
            positionY: 0,
            directionRadians: 0,
            range: 300,
            startHalfWidth: 40,
            endHalfWidth: 80,
            acceleration: 900,
            endStrengthMultiplier: 0.5,
            edgeFalloffFraction: 0.2,
            flowMode: "pull",
            enabled: true,
            ...overrides,
        });

        const localWindSystem =
            new LocalWindSystem([
                makeSource(),
            ]);

        const captureSystem =
            new WindSuctionCaptureSystem(
                localWindSystem,
            );

        captureSystem.registerTarget({
            id: "d7-validation-ball",
            body,
            captureMode: "instant",
            beginCapture: (): void => {
                deathRequests += 1;
            },
            setCaptureScale: (): void => {
                throw new Error(
                    "[D-7] Instant Ball capture must never shrink the Ball.",
                );
            },
        });

        const expect = (
            condition: boolean,
            message: string,
        ): void => {
            if (!condition) {
                throw new Error(
                    `[D-7] ${message}`,
                );
            }
        };

        // In pull influence, but outside the nozzle-capture mouth.
        x = 120;
        y = 0;
        captureSystem.update(1 / 60);
        expect(
            deathRequests === 0,
            "Ball outside nozzle capture must survive.",
        );

        // Genuine active suction nozzle entry.
        x = 10;
        captureSystem.update(1 / 60);
        expect(
            deathRequests === 1,
            "Enabled pull source plus nozzle entry must request one death.",
        );

        // Same contact cannot consume another life on following frames.
        captureSystem.update(1 / 60);
        captureSystem.update(1 / 60);
        expect(
            deathRequests === 1,
            "One nozzle entry must remain one-shot while contact persists.",
        );

        // Leave the mouth so the instant-capture latch re-arms.
        x = 120;
        captureSystem.update(1 / 60);

        // Physical nozzle overlap with suction disabled is harmless.
        localWindSystem.replaceSources([
            makeSource({
                enabled: false,
            }),
        ]);
        x = 10;
        captureSystem.update(1 / 60);
        expect(
            deathRequests === 1,
            "Disabled suction must not trigger Ball death.",
        );

        // Push/fan Wind is never a suction death source.
        localWindSystem.replaceSources([
            makeSource({
                flowMode: "push",
                enabled: true,
            }),
        ]);
        captureSystem.update(1 / 60);
        expect(
            deathRequests === 1,
            "Push Wind must not trigger Ball suction death.",
        );

        // A later independent active pull capture is valid.
        localWindSystem.replaceSources([
            makeSource(),
        ]);
        captureSystem.update(1 / 60);
        expect(
            deathRequests === 2,
            "A later independent suction capture must be allowed.",
        );
    }
}
