import { Graphics } from "pixi.js";

import { Entity } from "./Entity";

export class AimIndicator extends Entity {

    private graphics: Graphics | null = null;

    // -------------------------------------------------------
    // Visual Configuration
    // -------------------------------------------------------

    /**
     * Empty space between the ball
     * and the beginning of the guide.
     */
    private readonly startDistance = 16;

    /**
     * Length of each visible section
     * of the dotted guide.
     */
    private readonly dashLength = 10;

    /**
     * Empty space between guide segments.
     */
    private readonly gapLength = 6;

    /**
     * Thickness of the guide and arrowhead.
     */
    private readonly lineThickness = 3;

    /**
     * Temporary arrowhead size.
     *
     * The arrowhead can be removed later
     * without affecting aiming behaviour.
     */
    private readonly arrowSize = 12;

    /**
     * Current rendered guide length.
     * The active club supplies this value.
     */
    private currentLineLength = 0;

    /**
     * Current direction of the guide.
     */
    private currentAngle = 0;

    // -------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------

    protected onInitialize(): void {

        this.graphics =
            new Graphics();

        this.container.addChild(
            this.graphics,
        );

        this.hide();
    }

    protected onUpdate(
        deltaTime: number,
    ): void {

        void deltaTime;
    }

    protected onDestroy(): void {

        this.graphics?.destroy();

        this.graphics = null;

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

        /*
         * Clear the previous guide so stale
         * graphics cannot appear briefly when
         * the next shot begins.
         */
        this.graphics?.clear();
    }

    // -------------------------------------------------------
    // Direction
    // -------------------------------------------------------

    /**
     * Draws the aiming guide from the ball
     * in the supplied direction.
     *
     * The guide length comes from the
     * currently equipped club.
     */
    public setDirection(
        centerX: number,
        centerY: number,
        angleRadians: number,
        lineLength: number,
    ): void {

        if (!this.graphics) {
            return;
        }

        this.container.position.set(
            centerX,
            centerY,
        );

        this.currentAngle =
            angleRadians;

        this.currentLineLength =
            Math.max(
                0,
                lineLength,
            );

        this.redraw();
    }

    // -------------------------------------------------------
    // Rendering
    // -------------------------------------------------------

    private redraw(): void {

        if (!this.graphics) {
            return;
        }

        this.graphics.clear();

        /*
         * Do not draw a guide when its
         * configured length is too short.
         */
        if (
            this.currentLineLength <=
            this.startDistance
        ) {
            return;
        }

        const directionX =
            Math.cos(
                this.currentAngle,
            );

        const directionY =
            Math.sin(
                this.currentAngle,
            );

        this.drawDottedLine(
            directionX,
            directionY,
        );

        this.drawArrowhead(
            directionX,
            directionY,
        );
    }

    /**
     * Draws the short dotted guide.
     */
    private drawDottedLine(
        directionX: number,
        directionY: number,
    ): void {

        if (!this.graphics) {
            return;
        }

        let travelled =
            this.startDistance;

        while (
            travelled <
            this.currentLineLength
        ) {

            const startX =
                directionX *
                travelled;

            const startY =
                directionY *
                travelled;

            const dashEndDistance =
                Math.min(
                    travelled +
                    this.dashLength,
                    this.currentLineLength,
                );

            const endX =
                directionX *
                dashEndDistance;

            const endY =
                directionY *
                dashEndDistance;

            this.graphics
                .moveTo(
                    startX,
                    startY,
                )
                .lineTo(
                    endX,
                    endY,
                )
                .stroke({
                    color: 0xffffff,
                    width:
                        this.lineThickness,
                });

            travelled =
                dashEndDistance +
                this.gapLength;
        }
    }

    /**
     * Draws the temporary arrowhead
     * at the end of the guide.
     */
    private drawArrowhead(
        directionX: number,
        directionY: number,
    ): void {

        if (!this.graphics) {
            return;
        }

        const tipX =
            directionX *
            this.currentLineLength;

        const tipY =
            directionY *
            this.currentLineLength;

        const leftAngle =
            this.currentAngle +
            Math.PI * 0.85;

        const rightAngle =
            this.currentAngle -
            Math.PI * 0.85;

        const leftX =
            tipX +
            Math.cos(
                leftAngle,
            ) *
            this.arrowSize;

        const leftY =
            tipY +
            Math.sin(
                leftAngle,
            ) *
            this.arrowSize;

        const rightX =
            tipX +
            Math.cos(
                rightAngle,
            ) *
            this.arrowSize;

        const rightY =
            tipY +
            Math.sin(
                rightAngle,
            ) *
            this.arrowSize;

        this.graphics
            .moveTo(
                tipX,
                tipY,
            )
            .lineTo(
                leftX,
                leftY,
            )
            .stroke({
                color: 0xffffff,
                width:
                    this.lineThickness,
            });

        this.graphics
            .moveTo(
                tipX,
                tipY,
            )
            .lineTo(
                rightX,
                rightY,
            )
            .stroke({
                color: 0xffffff,
                width:
                    this.lineThickness,
            });
    }

    // -------------------------------------------------------
    // Debug
    // -------------------------------------------------------

    public getLineLength(): number {
        return this.currentLineLength;
    }

    public getAngle(): number {
        return this.currentAngle;
    }
}