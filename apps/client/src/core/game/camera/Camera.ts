import {
    DEFAULT_CAMERA_DEFINITION,
} from "../config/CameraDefinition";

import {
    DEFAULT_COURSE_BOUNDARY_DEFINITION,
} from "../config/CourseBoundaryDefinition";

import type {
    CameraDefinition,
} from "../config/CameraDefinition";

import type {
    CourseBoundaryDefinition,
} from "../config/CourseBoundaryDefinition";

export interface CameraPoint {

    readonly x:
    number;

    readonly y:
    number;
}

/**
 * Authoritative world Camera.
 *
 * Camera position represents the world-space
 * coordinate displayed at the top-left corner of the
 * logical game viewport.
 */
export class Camera {

    private readonly definition:
        CameraDefinition;

    private readonly courseBoundaryDefinition:
        CourseBoundaryDefinition;

    // -------------------------------------------------------
    // Logical Viewport
    // -------------------------------------------------------

    private viewportWidth:
        number;

    private viewportHeight:
        number;

    // -------------------------------------------------------
    // Position and Velocity
    // -------------------------------------------------------

    private positionX =
        0;

    private positionY =
        0;

    private velocityX =
        0;

    private velocityY =
        0;

    private targetVelocityX =
        0;

    private targetVelocityY =
        0;

    // -------------------------------------------------------
    // Camera Movement Limits
    // -------------------------------------------------------

    private minimumPositionX =
        0;

    private maximumPositionX =
        0;

    private minimumPositionY =
        0;

    private maximumPositionY =
        0;

    constructor(
        definition:
            CameraDefinition =
            DEFAULT_CAMERA_DEFINITION,

        courseBoundaryDefinition:
            CourseBoundaryDefinition =
            DEFAULT_COURSE_BOUNDARY_DEFINITION,
    ) {

        this.validateDefinition(
            definition,
        );

        this.validateCourseBoundaryDefinition(
            courseBoundaryDefinition,
        );

        this.definition =
            definition;

        this.courseBoundaryDefinition =
            courseBoundaryDefinition;

        this.viewportWidth =
            definition.viewportWidth;

        this.viewportHeight =
            definition.viewportHeight;

        this.recalculatePositionLimits();

        this.resetToInitialPosition();
    }

    // -------------------------------------------------------
    // Frame Update
    // -------------------------------------------------------

    public update(
        deltaTime:
            number,
    ): void {

        const safeDeltaTime =
            Math.min(
                Math.max(
                    deltaTime,
                    0,
                ),

                this.definition
                    .maximumDeltaTime,
            );

        if (
            safeDeltaTime <=
            0
        ) {
            return;
        }

        const responseRateX =
            this.selectResponseRate(
                this.velocityX,
                this.targetVelocityX,
            );

        const responseRateY =
            this.selectResponseRate(
                this.velocityY,
                this.targetVelocityY,
            );

        this.velocityX =
            this.moveToward(
                this.velocityX,
                this.targetVelocityX,
                responseRateX *
                safeDeltaTime,
            );

        this.velocityY =
            this.moveToward(
                this.velocityY,
                this.targetVelocityY,
                responseRateY *
                safeDeltaTime,
            );

        this.applyExactStopThreshold();

        this.setPosition(
            this.positionX +
            this.velocityX *
            safeDeltaTime,

            this.positionY +
            this.velocityY *
            safeDeltaTime,
        );

        this.stopVelocityAgainstBoundaries();

        this.applyExactStopThreshold();
    }

    // -------------------------------------------------------
    // Viewport Size
    // -------------------------------------------------------

    public setViewportSize(
        viewportWidth:
            number,

        viewportHeight:
            number,
    ): void {

        this.validateViewportSize(
            viewportWidth,
            viewportHeight,
        );

        if (
            this.viewportWidth ===
            viewportWidth &&
            this.viewportHeight ===
            viewportHeight
        ) {
            return;
        }

        this.viewportWidth =
            viewportWidth;

        this.viewportHeight =
            viewportHeight;

        this.recalculatePositionLimits();

        this.setPosition(
            this.positionX,
            this.positionY,
        );
    }

    // -------------------------------------------------------
    // Movement Intent
    // -------------------------------------------------------

    public setMovementIntent(
        directionX:
            number,

        directionY:
            number,

        strength:
            number,
    ): void {

        if (
            ![
                directionX,
                directionY,
                strength,
            ].every(
                Number.isFinite,
            )
        ) {
            throw new Error(
                "Camera movement intent values must be finite numbers.",
            );
        }

        const directionMagnitude =
            Math.hypot(
                directionX,
                directionY,
            );

        const clampedStrength =
            this.clamp(
                strength,
                0,
                1,
            );

        if (
            directionMagnitude <=
            0 ||
            clampedStrength <
            this.definition
                .minimumInputStrength
        ) {
            this.clearMovementIntent();

            return;
        }

        const normalizedDirectionX =
            directionX /
            directionMagnitude;

        const normalizedDirectionY =
            directionY /
            directionMagnitude;

        const targetSpeed =
            this.definition
                .maximumPanSpeed *
            clampedStrength;

        this.targetVelocityX =
            normalizedDirectionX *
            targetSpeed;

        this.targetVelocityY =
            normalizedDirectionY *
            targetSpeed;
    }

    public clearMovementIntent():
        void {

        this.targetVelocityX =
            0;

        this.targetVelocityY =
            0;
    }

    // -------------------------------------------------------
    // Position
    // -------------------------------------------------------

    public setPosition(
        positionX:
            number,

        positionY:
            number,
    ): void {

        if (
            !Number.isFinite(
                positionX,
            ) ||
            !Number.isFinite(
                positionY,
            )
        ) {
            throw new Error(
                "Camera position values must be finite numbers.",
            );
        }

        this.positionX =
            this.clamp(
                positionX,
                this.minimumPositionX,
                this.maximumPositionX,
            );

        this.positionY =
            this.clamp(
                positionY,
                this.minimumPositionY,
                this.maximumPositionY,
            );
    }

    public translate(
        deltaX:
            number,

        deltaY:
            number,
    ): void {

        this.setPosition(
            this.positionX +
            deltaX,

            this.positionY +
            deltaY,
        );
    }

    public resetToInitialPosition():
        void {

        this.velocityX =
            0;

        this.velocityY =
            0;

        this.clearMovementIntent();

        this.setPosition(
            this.definition
                .initialPositionX,

            this.definition
                .initialPositionY,
        );
    }

    // -------------------------------------------------------
    // Coordinate Conversion
    // -------------------------------------------------------

    public viewportToWorld(
        viewportX:
            number,

        viewportY:
            number,
    ): CameraPoint {

        return {
            x:
                viewportX +
                this.positionX,

            y:
                viewportY +
                this.positionY,
        };
    }

    public worldToViewport(
        worldX:
            number,

        worldY:
            number,
    ): CameraPoint {

        return {
            x:
                worldX -
                this.positionX,

            y:
                worldY -
                this.positionY,
        };
    }

    // -------------------------------------------------------
    // Activation Boundary
    // -------------------------------------------------------

    public getHorizontalActivationInset():
        number {

        const absoluteMaximum =
            Math.max(
                0,

                this.viewportWidth /
                2 -
                1,
            );

        const minimumInset =
            Math.min(
                this.definition
                    .minimumHorizontalActivationInset,

                absoluteMaximum,
            );

        const maximumInset =
            Math.min(
                this.definition
                    .maximumHorizontalActivationInset,

                absoluteMaximum,
            );

        return this.clamp(
            this.viewportWidth *
            this.definition
                .horizontalActivationInsetRatio,

            minimumInset,
            maximumInset,
        );
    }

    public getVerticalActivationInset():
        number {

        const absoluteMaximum =
            Math.max(
                0,

                this.viewportHeight /
                2 -
                1,
            );

        const minimumInset =
            Math.min(
                this.definition
                    .minimumVerticalActivationInset,

                absoluteMaximum,
            );

        const maximumInset =
            Math.min(
                this.definition
                    .maximumVerticalActivationInset,

                absoluteMaximum,
            );

        return this.clamp(
            this.viewportHeight *
            this.definition
                .verticalActivationInsetRatio,

            minimumInset,
            maximumInset,
        );
    }

    // -------------------------------------------------------
    // Queries
    // -------------------------------------------------------

    public getPositionX():
        number {

        return this.positionX;
    }

    public getPositionY():
        number {

        return this.positionY;
    }

    public getPosition():
        CameraPoint {

        return {
            x:
                this.positionX,

            y:
                this.positionY,
        };
    }

    public getVelocityX():
        number {

        return this.velocityX;
    }

    public getVelocityY():
        number {

        return this.velocityY;
    }

    public getTargetVelocityX():
        number {

        return this.targetVelocityX;
    }

    public getTargetVelocityY():
        number {

        return this.targetVelocityY;
    }

    public getMinimumPositionX():
        number {

        return this.minimumPositionX;
    }

    public getMaximumPositionX():
        number {

        return this.maximumPositionX;
    }

    public getMinimumPositionY():
        number {

        return this.minimumPositionY;
    }

    public getMaximumPositionY():
        number {

        return this.maximumPositionY;
    }

    public isHorizontalMovementLocked():
        boolean {

        return (
            this.minimumPositionX ===
            this.maximumPositionX
        );
    }

    public isVerticalMovementLocked():
        boolean {

        return (
            this.minimumPositionY ===
            this.maximumPositionY
        );
    }

    public getViewportWidth():
        number {

        return this.viewportWidth;
    }

    public getViewportHeight():
        number {

        return this.viewportHeight;
    }

    public getDefinition():
        CameraDefinition {

        return this.definition;
    }

    public getCourseBoundaryDefinition():
        CourseBoundaryDefinition {

        return this.courseBoundaryDefinition;
    }

    // -------------------------------------------------------
    // Internal Motion
    // -------------------------------------------------------

    /**
     * Uses acceleration only when building speed in
     * the same direction.
     *
     * Deceleration is used while:
     *
     * - slowing down
     * - reversing direction
     * - moving toward zero
     */
    private selectResponseRate(
        current:
            number,

        target:
            number,
    ): number {

        const acceleratingSameDirection =
            target !==
            0 &&
            (
                current ===
                0 ||
                Math.sign(
                    current,
                ) ===
                Math.sign(
                    target,
                )
            ) &&
            Math.abs(
                target,
            ) >
            Math.abs(
                current,
            );

        return acceleratingSameDirection
            ? this.definition
                .acceleration
            : this.definition
                .deceleration;
    }

    private moveToward(
        current:
            number,

        target:
            number,

        maximumDelta:
            number,
    ): number {

        if (
            current <
            target
        ) {
            return Math.min(
                current +
                maximumDelta,

                target,
            );
        }

        if (
            current >
            target
        ) {
            return Math.max(
                current -
                maximumDelta,

                target,
            );
        }

        return target;
    }

    /**
     * Removes tiny residual velocity after movement
     * intent returns to zero.
     */
    private applyExactStopThreshold():
        void {

        const stopThreshold =
            this.definition
                .velocityStopThreshold;

        if (
            this.targetVelocityX ===
            0 &&
            Math.abs(
                this.velocityX,
            ) <=
            stopThreshold
        ) {
            this.velocityX =
                0;
        }

        if (
            this.targetVelocityY ===
            0 &&
            Math.abs(
                this.velocityY,
            ) <=
            stopThreshold
        ) {
            this.velocityY =
                0;
        }
    }

    /**
     * Removes velocity that points farther beyond a
     * reached course boundary.
     */
    private stopVelocityAgainstBoundaries():
        void {

        if (
            (
                this.positionX <=
                this.minimumPositionX &&
                this.velocityX <
                0
            ) ||
            (
                this.positionX >=
                this.maximumPositionX &&
                this.velocityX >
                0
            )
        ) {
            this.velocityX =
                0;
        }

        if (
            (
                this.positionY <=
                this.minimumPositionY &&
                this.velocityY <
                0
            ) ||
            (
                this.positionY >=
                this.maximumPositionY &&
                this.velocityY >
                0
            )
        ) {
            this.velocityY =
                0;
        }
    }

    // -------------------------------------------------------
    // Position Limits
    // -------------------------------------------------------

    private recalculatePositionLimits():
        void {

        const horizontalLimits =
            this.calculateAxisLimits(
                this.courseBoundaryDefinition
                    .minimumX,

                this.courseBoundaryDefinition
                    .maximumX,

                this.viewportWidth,
            );

        const verticalLimits =
            this.calculateAxisLimits(
                this.courseBoundaryDefinition
                    .minimumY,

                this.courseBoundaryDefinition
                    .maximumY,

                this.viewportHeight,
            );

        this.minimumPositionX =
            horizontalLimits.minimum;

        this.maximumPositionX =
            horizontalLimits.maximum;

        this.minimumPositionY =
            verticalLimits.minimum;

        this.maximumPositionY =
            verticalLimits.maximum;
    }

    private calculateAxisLimits(
        minimum:
            number,

        maximum:
            number,

        viewportSize:
            number,
    ): {
        readonly minimum:
        number;

        readonly maximum:
        number;
    } {

        const courseSize =
            maximum -
            minimum;

        if (
            courseSize <=
            viewportSize
        ) {
            const lockedPosition =
                (
                    minimum +
                    maximum -
                    viewportSize
                ) /
                2;

            return {
                minimum:
                    lockedPosition,

                maximum:
                    lockedPosition,
            };
        }

        return {
            minimum,

            maximum:
                maximum -
                viewportSize,
        };
    }

    // -------------------------------------------------------
    // Validation
    // -------------------------------------------------------

    private validateDefinition(
        definition:
            CameraDefinition,
    ): void {

        const finiteValues = [
            definition.viewportWidth,
            definition.viewportHeight,
            definition.initialPositionX,
            definition.initialPositionY,
            definition.horizontalActivationInsetRatio,
            definition.verticalActivationInsetRatio,
            definition.minimumHorizontalActivationInset,
            definition.maximumHorizontalActivationInset,
            definition.minimumVerticalActivationInset,
            definition.maximumVerticalActivationInset,
            definition.inputResponseExponent,
            definition.minimumInputStrength,
            definition.maximumPanSpeed,
            definition.acceleration,
            definition.deceleration,
            definition.velocityStopThreshold,
            definition.maximumDeltaTime,
        ];

        if (
            !finiteValues.every(
                Number.isFinite,
            )
        ) {
            throw new Error(
                "Camera definition values must be finite numbers.",
            );
        }

        this.validateViewportSize(
            definition.viewportWidth,
            definition.viewportHeight,
        );

        if (
            definition
                .horizontalActivationInsetRatio <=
            0 ||
            definition
                .horizontalActivationInsetRatio >=
            0.5 ||
            definition
                .verticalActivationInsetRatio <=
            0 ||
            definition
                .verticalActivationInsetRatio >=
            0.5
        ) {
            throw new Error(
                "Camera activation inset ratios must remain between zero and 0.5.",
            );
        }

        if (
            definition
                .minimumHorizontalActivationInset <
            0 ||
            definition
                .maximumHorizontalActivationInset <
            definition
                .minimumHorizontalActivationInset ||
            definition
                .minimumVerticalActivationInset <
            0 ||
            definition
                .maximumVerticalActivationInset <
            definition
                .minimumVerticalActivationInset
        ) {
            throw new Error(
                "Camera activation inset pixel limits are invalid.",
            );
        }

        if (
            definition.inputResponseExponent <=
            0
        ) {
            throw new Error(
                "Camera inputResponseExponent must be greater than zero.",
            );
        }

        if (
            definition.maximumPanSpeed <
            0 ||
            definition.acceleration <=
            0 ||
            definition.deceleration <=
            0 ||
            definition.velocityStopThreshold <
            0 ||
            definition.maximumDeltaTime <=
            0
        ) {
            throw new Error(
                "Camera movement values are invalid.",
            );
        }

        if (
            definition.minimumInputStrength <
            0 ||
            definition.minimumInputStrength >
            1
        ) {
            throw new Error(
                "Camera minimum input strength must remain between zero and one.",
            );
        }
    }

    private validateViewportSize(
        viewportWidth:
            number,

        viewportHeight:
            number,
    ): void {

        if (
            !Number.isFinite(
                viewportWidth,
            ) ||
            !Number.isFinite(
                viewportHeight,
            ) ||
            viewportWidth <=
            0 ||
            viewportHeight <=
            0
        ) {
            throw new Error(
                "Camera viewport dimensions must be finite values greater than zero.",
            );
        }
    }

    private validateCourseBoundaryDefinition(
        definition:
            CourseBoundaryDefinition,
    ): void {

        if (
            ![
                definition.minimumX,
                definition.maximumX,
                definition.minimumY,
                definition.maximumY,
            ].every(
                Number.isFinite,
            )
        ) {
            throw new Error(
                "Camera course boundary values must be finite numbers.",
            );
        }

        if (
            definition.maximumX <=
            definition.minimumX ||
            definition.maximumY <=
            definition.minimumY
        ) {
            throw new Error(
                "Camera course boundaries are invalid.",
            );
        }
    }

    // -------------------------------------------------------
    // Utility
    // -------------------------------------------------------

    private clamp(
        value:
            number,

        minimum:
            number,

        maximum:
            number,
    ): number {

        if (
            maximum <
            minimum
        ) {
            return minimum;
        }

        return Math.max(
            minimum,
            Math.min(
                value,
                maximum,
            ),
        );
    }
}