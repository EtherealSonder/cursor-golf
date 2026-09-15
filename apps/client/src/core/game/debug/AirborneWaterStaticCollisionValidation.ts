import type {
    AirborneWaterCollisionField,
} from "../environment/AirborneWaterCollisionField";

/**
 * Phase 8D-5 deterministic validation for continuous static collision queries
 * used by airborne Water packets.
 */
export class AirborneWaterStaticCollisionValidation {
    public constructor(
        private readonly collisionField:
            AirborneWaterCollisionField,
    ) { }

    public run(): void {
        this.collisionField.clear();

        this.collisionField.addRectangle(
            100,
            100,
            20,
            40,
        );

        const rectangleHit =
            this.collisionField.sweep(
                0,
                100,
                200,
                100,
            );

        this.assertPass(
            "Rectangle Sweep Collision",
            rectangleHit !== null &&
            Math.abs(
                rectangleHit.positionX -
                90,
            ) < 0.00001 &&
            rectangleHit.normalX < -0.99,
        );

        this.collisionField.clear();

        this.collisionField.addCircle(
            100,
            100,
            15,
        );

        const circleHit =
            this.collisionField.sweep(
                0,
                100,
                200,
                100,
            );

        this.assertPass(
            "Circle Sweep Collision",
            circleHit !== null &&
            Math.abs(
                circleHit.positionX -
                85,
            ) < 0.00001,
        );

        const clearPath =
            this.collisionField.sweep(
                0,
                10,
                200,
                10,
            );

        this.assertPass(
            "Clear Path",
            clearPath === null,
        );

        this.collisionField.clear();

        this.collisionField.addRectangle(
            140,
            100,
            10,
            30,
        );

        this.collisionField.addRectangle(
            60,
            100,
            10,
            30,
        );

        const nearestHit =
            this.collisionField.sweep(
                0,
                100,
                200,
                100,
            );

        this.assertPass(
            "Nearest Hit Selection",
            nearestHit !== null &&
            nearestHit.positionX < 60,
        );

        this.collisionField.clear();

        /*
         * A single very long sweep represents a packet moving far enough in
         * one fixed step that endpoint-only collision could tunnel through a
         * thin obstacle.
         */
        this.collisionField.addRectangle(
            500,
            100,
            2,
            80,
        );

        const highSpeedHit =
            this.collisionField.sweep(
                0,
                100,
                1000,
                100,
            );

        this.assertPass(
            "High-Speed Anti-Tunnelling",
            highSpeedHit !== null &&
            highSpeedHit.fraction > 0 &&
            highSpeedHit.fraction < 1,
        );

        this.collisionField.clear();

        this.assertPass(
            "Reset",
            this.collisionField
                .getShapeCount() ===
            0,
        );

        console.info(
            "[8D-5] Airborne Water Static Collision: PASS",
        );
    }

    private assertPass(
        name: string,
        condition: boolean,
    ): void {
        if (!condition) {
            throw new Error(
                `[8D-5] ${name}: FAIL`,
            );
        }

        console.info(
            `[8D-5] ${name}: PASS`,
        );
    }
}
