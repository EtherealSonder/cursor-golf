import {
    Graphics,
    Sprite,
} from "pixi.js";

import { AssetLoader } from "../../rendering/AssetLoader";
import { Entity } from "./Entity";

export class Club extends Entity {

    private clubSprite: Sprite | null = null;

    /**
     * Connector rendered between
     * the ball and the club.
     */
    private connector: Graphics | null = null;

    // -------------------------------------------------------
    // Club Identity
    // -------------------------------------------------------

    /**
     * Human-readable name of the
     * currently equipped club.
     *
     * This will later allow release data,
     * club selection, and shot records
     * to identify which club was used.
     */
    private readonly clubName =
        "Basic Club";

    // -------------------------------------------------------
    // Club Visual Configuration
    // -------------------------------------------------------

    private readonly ballRadius = 10;

    /**
     * Gap between the ball and
     * the club head.
     */
    private readonly headOffset = 10;

    private readonly minDistance =
        this.ballRadius +
        this.headOffset;

    /**
     * Maximum visual distance between
     * the ball and club.
     *
     * This is separate from the maximum
     * drag distance used to calculate power.
     */
    private readonly maxDistance = 120;

    private currentAngle = 0;

    private currentDistance =
        this.minDistance;

    // -------------------------------------------------------
    // Gameplay Configuration
    // -------------------------------------------------------

    /**
     * Maximum drag distance representing
     * full shot power.
     */
    private readonly maximumDragDistance =
        200;

    /**
     * Length of the aiming guide.
     */
    private readonly aimIndicatorLength =
        70;

    /**
     * Maximum angle by which the aim
     * indicator can oscillate around
     * the base shot direction.
     *
     * Math.PI / 4 = 45 degrees.
     */
    private readonly oscillationAngle =
        Math.PI / 4;

    /**
     * Oscillation speed at minimum power.
     */
    private readonly minimumOscillationSpeed =
        3.0;

    /**
     * Oscillation speed at maximum power.
     */
    private readonly maximumOscillationSpeed =
        8.0;

    // -------------------------------------------------------
    // Current Shot Visual Data
    // -------------------------------------------------------

    /**
     * Ball position is stored so the
     * connector can redraw itself.
     */
    private currentBallX = 0;
    private currentBallY = 0;

    /**
     * Current shot power.
     *
     * Expected range:
     * 0 to 1.
     */
    private normalizedPower = 0;

    /**
     * Human-readable connector
     * colour used by debugging.
     */
    private currentColorName =
        "Yellow";

    // -------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------

    protected onInitialize(): void {

        /*
         * The connector is inserted first,
         * so it renders behind the club.
         */

        this.connector =
            new Graphics();

        this.container.addChild(
            this.connector,
        );

        this.clubSprite =
            new Sprite(
                AssetLoader.getTexture(
                    "golfClub",
                ),
            );

        /*
         * Temporary sprite settings.
         */

        this.clubSprite.anchor.set(
            0.138,
            0.769,
        );

        this.clubSprite.scale.set(
            0.10,
        );

        this.clubSprite.rotation = 0;

        this.container.addChild(
            this.clubSprite,
        );

        this.show();
    }

    protected onUpdate(
        deltaTime: number,
    ): void {

        void deltaTime;
    }

    protected onDestroy(): void {

        this.connector?.destroy();
        this.clubSprite?.destroy();

        this.connector = null;
        this.clubSprite = null;

        this.container.destroy({
            children: true,
        });
    }

    // -------------------------------------------------------
    // Visibility
    // -------------------------------------------------------

    public show(): void {
        this.setVisible(true);
    }

    public hide(): void {
        this.setVisible(false);
    }

    // -------------------------------------------------------
    // Cursor Mode
    // -------------------------------------------------------

    public setCursorPosition(
        mouseX: number,
        mouseY: number,
    ): void {

        this.setPosition(
            mouseX,
            mouseY,
        );

        if (this.clubSprite) {
            this.clubSprite.rotation = 0;
        }
    }

    // -------------------------------------------------------
    // Shot Mode
    // -------------------------------------------------------

    public setPose(
        ballX: number,
        ballY: number,
        angleRadians: number,
        requestedDistance: number,
    ): void {

        this.currentBallX =
            ballX;

        this.currentBallY =
            ballY;

        this.currentAngle =
            angleRadians;

        this.currentDistance =
            Math.max(
                this.minDistance,
                Math.min(
                    requestedDistance,
                    this.maxDistance,
                ),
            );

        const x =
            ballX -
            Math.cos(
                angleRadians,
            ) *
            this.currentDistance;

        const y =
            ballY -
            Math.sin(
                angleRadians,
            ) *
            this.currentDistance;

        this.setPosition(
            x,
            y,
        );

        if (this.clubSprite) {
            this.clubSprite.rotation = 0;
        }

        this.updateConnector();
    }

    /**
     * Receives normalized gameplay power
     * from ShotController.
     */
    public setPower(
        normalizedPower: number,
    ): void {

        this.normalizedPower =
            Math.max(
                0,
                Math.min(
                    normalizedPower,
                    1,
                ),
            );

        this.updateConnector();
    }

    // -------------------------------------------------------
    // Connector Rendering
    // -------------------------------------------------------

    private updateConnector(): void {

        if (!this.connector) {
            return;
        }

        this.connector.clear();

        const color =
            this.calculateConnectorColor();

        /*
         * The connector belongs to the club
         * container, so the ball's world-space
         * position must be converted into the
         * club's local coordinate space.
         */

        const localBallX =
            this.currentBallX -
            this.getX();

        const localBallY =
            this.currentBallY -
            this.getY();

        this.connector
            .moveTo(
                localBallX,
                localBallY,
            )
            .lineTo(
                0,
                0,
            )
            .stroke({
                width: 4,
                color,
            });
    }

    /**
     * Creates a smooth colour transition:
     *
     * Yellow
     *   ↓
     * Orange
     *   ↓
     * Red
     *
     * Rendering uses smooth interpolation.
     * Debug names use three thresholds.
     */
    private calculateConnectorColor(): number {

        // -----------------------------
        // Debug Colour Name
        // -----------------------------

        if (
            this.normalizedPower <
            0.33
        ) {
            this.currentColorName =
                "Yellow";
        }
        else if (
            this.normalizedPower <
            0.66
        ) {
            this.currentColorName =
                "Orange";
        }
        else {
            this.currentColorName =
                "Red";
        }

        // -----------------------------
        // Yellow to Orange
        // -----------------------------

        if (
            this.normalizedPower <=
            0.5
        ) {

            const t =
                this.normalizedPower /
                0.5;

            return this.interpolateColor(
                0xffff00,
                0xffa500,
                t,
            );
        }

        // -----------------------------
        // Orange to Red
        // -----------------------------

        const t =
            (
                this.normalizedPower -
                0.5
            ) /
            0.5;

        return this.interpolateColor(
            0xffa500,
            0xff0000,
            t,
        );
    }

    /**
     * Linear RGB interpolation.
     */
    private interpolateColor(
        startColor: number,
        endColor: number,
        t: number,
    ): number {

        const r1 =
            (
                startColor >>
                16
            ) &
            0xff;

        const g1 =
            (
                startColor >>
                8
            ) &
            0xff;

        const b1 =
            startColor &
            0xff;

        const r2 =
            (
                endColor >>
                16
            ) &
            0xff;

        const g2 =
            (
                endColor >>
                8
            ) &
            0xff;

        const b2 =
            endColor &
            0xff;

        const r =
            Math.round(
                r1 +
                (
                    r2 -
                    r1
                ) *
                t,
            );

        const g =
            Math.round(
                g1 +
                (
                    g2 -
                    g1
                ) *
                t,
            );

        const b =
            Math.round(
                b1 +
                (
                    b2 -
                    b1
                ) *
                t,
            );

        return (
            (
                r <<
                16
            ) |
            (
                g <<
                8
            ) |
            b
        );
    }

    // -------------------------------------------------------
    // Shot Visual Reset
    // -------------------------------------------------------

    public resetShotVisuals(): void {

        this.normalizedPower = 0;

        this.currentBallX = 0;
        this.currentBallY = 0;

        this.currentDistance =
            this.minDistance;

        this.currentAngle = 0;

        this.currentColorName =
            "Yellow";

        this.connector?.clear();
    }

    // -------------------------------------------------------
    // Club Identity
    // -------------------------------------------------------

    public getClubName(): string {
        return this.clubName;
    }

    // -------------------------------------------------------
    // Current Visual State
    // -------------------------------------------------------

    public getAngle(): number {
        return this.currentAngle;
    }

    public getDistance(): number {
        return this.currentDistance;
    }

    public getNormalizedPower(): number {
        return this.normalizedPower;
    }

    public getConnectorColorName(): string {
        return this.currentColorName;
    }

    // -------------------------------------------------------
    // Visual Configuration
    // -------------------------------------------------------

    public getMinimumDistance(): number {
        return this.minDistance;
    }

    public getMaximumDistance(): number {
        return this.maxDistance;
    }

    public getAimIndicatorLength(): number {
        return this.aimIndicatorLength;
    }

    // -------------------------------------------------------
    // Gameplay Configuration
    // -------------------------------------------------------

    public getMaximumDragDistance(): number {
        return this.maximumDragDistance;
    }

    public getOscillationAngle(): number {
        return this.oscillationAngle;
    }

    public getMinimumOscillationSpeed(): number {
        return this.minimumOscillationSpeed;
    }

    public getMaximumOscillationSpeed(): number {
        return this.maximumOscillationSpeed;
    }
}