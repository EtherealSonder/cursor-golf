import {
    WaterSourceType,
} from "../config/WaterSourceDefinition";

import {
    AirborneWaterCollisionField,
} from "../environment/AirborneWaterCollisionField";

import {
    AirborneWaterSystem,
} from "../environment/AirborneWaterSystem";

import type {
    AirborneWaterPresentationImpact,
} from "../environment/AirborneWaterSystem";

import {
    WaterField,
} from "../environment/WaterField";

import type {
    WaterEmissionRequest,
} from "../environment/WaterSourceSystem";

/**
 * Phase 8I-7A deterministic validation for the read-only airborne-Water
 * presentation impact contract.
 *
 * The validation owns isolated Water/collision fields. It never touches the
 * live World simulation, so proving the presentation handoff cannot alter
 * gameplay state is independent from the current course.
 */
export class WaterImpactPresentationValidation {
    private static readonly EPSILON = 0.000001;

    public run(): void {
        console.info(
            "[8I-7A] AUTHORITATIVE WATER IMPACT CONTRACT",
        );

        const groundResult =
            this.runGroundImpactCase();

        this.assertPass(
            "Ground impact record",
            groundResult.impacts.length === 1 &&
            !groundResult.impacts[0]?.isStaticCollision,
        );

        const groundImpact = groundResult.impacts[0];

        this.assertPass(
            "Ground impact payload",
            !!groundImpact &&
            groundImpact.sourceId === "8i7a-ground" &&
            groundImpact.emissionOrdinal === 0 &&
            Number.isFinite(groundImpact.positionX) &&
            Number.isFinite(groundImpact.positionY) &&
            Number.isFinite(groundImpact.velocityX) &&
            Number.isFinite(groundImpact.velocityY) &&
            this.nearlyEqual(groundImpact.waterAmount, 0.4),
        );

        this.assertPass(
            "Ground deposition unchanged",
            this.nearlyEqual(
                groundResult.system.getTotalRequestedWaterAmount(),
                groundResult.system.getTotalDepositedWaterAmount() +
                groundResult.system.getTotalRejectedWaterAmount(),
            ) &&
            groundResult.system.getTotalImpactedPacketCount() === 1,
        );

        const obstacleResult =
            this.runStaticCollisionCase();

        const obstacleImpact = obstacleResult.impacts[0];

        this.assertPass(
            "Static obstacle impact record",
            obstacleResult.impacts.length === 1 &&
            !!obstacleImpact?.isStaticCollision,
        );

        this.assertPass(
            "Static obstacle payload",
            !!obstacleImpact &&
            obstacleImpact.sourceId === "8i7a-obstacle" &&
            obstacleImpact.emissionOrdinal === 0 &&
            Number.isFinite(obstacleImpact.positionX) &&
            Number.isFinite(obstacleImpact.positionY) &&
            Number.isFinite(obstacleImpact.velocityX) &&
            Number.isFinite(obstacleImpact.velocityY) &&
            this.nearlyEqual(obstacleImpact.waterAmount, 0.35),
        );

        this.assertPass(
            "Static collision accounting unchanged",
            obstacleResult.system.getTotalStaticCollisionCount() === 1 &&
            this.nearlyEqual(
                obstacleResult.system.getTotalRequestedWaterAmount(),
                obstacleResult.system.getTotalDepositedWaterAmount() +
                obstacleResult.system.getTotalRejectedWaterAmount(),
            ),
        );

        this.validateRetentionLifecycle();
        this.validateResetLifecycle();

        console.info(
            "[8I-7A] RESULT: PASS",
        );
    }

    private runGroundImpactCase(): {
        readonly system: AirborneWaterSystem;
        readonly impacts: readonly AirborneWaterPresentationImpact[];
    } {
        const waterField = new WaterField();
        const system = new AirborneWaterSystem(waterField);

        system.consumeEmissionRequests([
            this.makeRequest(
                "8i7a-ground",
                300,
                300,
                0,
                320,
                50 * Math.PI / 180,
                0.4,
            ),
        ]);

        this.stepUntilTerminated(system, 240);

        return {
            system,
            impacts: this.collectImpacts(system, "8i7a-ground"),
        };
    }

    private runStaticCollisionCase(): {
        readonly system: AirborneWaterSystem;
        readonly impacts: readonly AirborneWaterPresentationImpact[];
    } {
        const waterField = new WaterField();
        const collisionField = new AirborneWaterCollisionField();

        collisionField.addRectangle(
            420,
            300,
            24,
            180,
            "8i7a-wall",
        );

        const system = new AirborneWaterSystem(
            waterField,
            undefined,
            null,
            null,
            collisionField,
        );

        system.consumeEmissionRequests([
            this.makeRequest(
                "8i7a-obstacle",
                300,
                300,
                0,
                900,
                12 * Math.PI / 180,
                0.35,
            ),
        ]);

        this.stepUntilTerminated(system, 120);

        return {
            system,
            impacts: this.collectImpacts(system, "8i7a-obstacle"),
        };
    }

    private validateRetentionLifecycle(): void {
        const waterField = new WaterField();
        const system = new AirborneWaterSystem(waterField);

        system.consumeEmissionRequests([
            this.makeRequest(
                "8i7a-retention",
                300,
                300,
                0,
                300,
                45 * Math.PI / 180,
                0.2,
            ),
        ]);

        this.stepUntilTerminated(system, 240);

        const beforeExpiry =
            this.collectImpacts(system, "8i7a-retention");

        system.update(0.36);

        const afterExpiry =
            this.collectImpacts(system, "8i7a-retention");

        this.assertPass(
            "Presentation impact retention lifecycle",
            beforeExpiry.length === 1 &&
            afterExpiry.length === 0,
        );
    }

    private validateResetLifecycle(): void {
        const waterField = new WaterField();
        const system = new AirborneWaterSystem(waterField);

        system.consumeEmissionRequests([
            this.makeRequest(
                "8i7a-reset",
                300,
                300,
                0,
                300,
                45 * Math.PI / 180,
                0.2,
            ),
        ]);

        this.stepUntilTerminated(system, 240);

        const beforeReset =
            this.collectImpacts(system, "8i7a-reset");

        system.reset();

        const afterReset =
            this.collectImpacts(system, "8i7a-reset");

        this.assertPass(
            "Reset clears presentation impacts",
            beforeReset.length === 1 &&
            afterReset.length === 0 &&
            system.getActivePacketCount() === 0,
        );
    }

    private makeRequest(
        sourceId: string,
        positionX: number,
        positionY: number,
        directionRadians: number,
        launchSpeed: number,
        launchElevationRadians: number,
        waterAmount: number,
    ): WaterEmissionRequest {
        return {
            sourceId,
            sourceType: WaterSourceType.DirectionalJet,
            sequence: 1,
            positionX,
            positionY,
            directionRadians,
            launchSpeed,
            launchElevationRadians,
            waterAmount,
            windResponse: 0,
            impactMomentumRetention: 0.9,
        };
    }

    private stepUntilTerminated(
        system: AirborneWaterSystem,
        maximumSteps: number,
    ): void {
        for (let index = 0; index < maximumSteps; index += 1) {
            system.update(1 / 60);

            if (system.getActivePacketCount() === 0) {
                return;
            }
        }
    }

    private collectImpacts(
        system: AirborneWaterSystem,
        sourceId: string,
    ): readonly AirborneWaterPresentationImpact[] {
        const impacts: AirborneWaterPresentationImpact[] = [];

        system.forEachRecentPresentationImpact(
            sourceId,
            (impact): void => {
                impacts.push({ ...impact });
            },
        );

        return impacts;
    }

    private nearlyEqual(
        left: number,
        right: number,
    ): boolean {
        return Math.abs(left - right) <=
            WaterImpactPresentationValidation.EPSILON;
    }

    private assertPass(
        label: string,
        condition: boolean,
    ): void {
        if (!condition) {
            throw new Error(
                `[8I-7A] ${label}: FAIL`,
            );
        }

        console.info(
            `[8I-7A] ${label}: PASS`,
        );
    }
}
