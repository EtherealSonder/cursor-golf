import {
    Sprite,
} from "pixi.js";

import {
    BASIC_CLUB_DEFINITION,
    MAXIMUM_CLUB_DRAG_DISTANCE,
    MINIMUM_CLUB_DRAG_DISTANCE,
} from "../config/ClubDefinition";

import type {
    ClubDefinition,
} from "../config/ClubDefinition";

import {
    DEFAULT_CLUB_SWING_DEFINITION,
} from "../config/ClubSwingDefinition";

import type {
    ClubSwingDefinition,
} from "../config/ClubSwingDefinition";

import { AssetLoader } from "../../rendering/AssetLoader";
import { Entity } from "./Entity";

export class Club extends Entity {

    private clubSprite:
        Sprite | null = null;

    // -------------------------------------------------------
    // Club Definition
    // -------------------------------------------------------

    private readonly definition:
        ClubDefinition;

    private readonly swingDefinition:
        ClubSwingDefinition;

    // -------------------------------------------------------
    // Club Visual Configuration
    // -------------------------------------------------------

    private readonly ballRadius = 10;

    private readonly minDistance:
        number;

    private currentAngle = 0;

    private currentDistance:
        number;

    // -------------------------------------------------------
    // Current Shot Visual Data
    // -------------------------------------------------------

    private normalizedPower = 0;

    private shotVisualActive = false;

    private swingActive = false;
    private recoveryActive = false;

    private swingElapsedTime = 0;
    private recoveryElapsedTime = 0;
    private swingDuration = 0;

    private swingStartX = 0;
    private swingStartY = 0;
    private contactX = 0;
    private contactY = 0;
    private followThroughX = 0;
    private followThroughY = 0;

    private recoveryFollowThroughComplete = false;

    private recoveryCursorX = 0;
    private recoveryCursorY = 0;

    constructor(
        definition:
            ClubDefinition =
            BASIC_CLUB_DEFINITION,

        swingDefinition:
            ClubSwingDefinition =
            DEFAULT_CLUB_SWING_DEFINITION,
    ) {

        super();

        this.definition =
            definition;

        this.swingDefinition =
            swingDefinition;

        this.minDistance =
            this.ballRadius +
            this.definition
                .visual
                .headOffset;

        this.currentDistance =
            this.minDistance;

        this.validateDefinition();
    }

    // -------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------

    protected onInitialize(): void {

        this.clubSprite =
            new Sprite(
                AssetLoader.getTexture(
                    "golfClub",
                ),
            );

        /*
         * The Sprite anchor is the gameplay contact point.
         *
         * Club.setCursorPosition() places the Entity at the mouse world
         * position. Anchoring the artwork at the club-head contact region
         * therefore makes the visible club head coincide with the same
         * point used by PlayerController for Ball hover interaction.
         */
        this.clubSprite.anchor.set(
            this.definition
                .visual
                .contactAnchorX,

            this.definition
                .visual
                .contactAnchorY,
        );

        this.clubSprite.scale.set(
            this.definition
                .visual
                .renderScale,
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

        const safeDeltaTime =
            Number.isFinite(deltaTime)
                ? Math.max(0, deltaTime)
                : 0;

        if (this.swingActive) {
            this.updateSwing(safeDeltaTime);
            return;
        }

        if (this.recoveryActive) {
            this.updateRecovery(safeDeltaTime);
        }
    }

    protected onDestroy(): void {

        this.clubSprite?.destroy();

        this.clubSprite = null;

        this.container.destroy({
            children: true,
        });
    }

    // -------------------------------------------------------
    // Definition Validation
    // -------------------------------------------------------

    private validateDefinition(): void {

        if (
            this.definition
                .maximumDragDistance <
            MINIMUM_CLUB_DRAG_DISTANCE
        ) {
            throw new Error(
                `Club maximum drag distance must be at least ${MINIMUM_CLUB_DRAG_DISTANCE} pixels.`,
            );
        }

        if (
            this.definition
                .maximumDragDistance >
            MAXIMUM_CLUB_DRAG_DISTANCE
        ) {
            throw new Error(
                `Club maximum drag distance cannot exceed ${MAXIMUM_CLUB_DRAG_DISTANCE} pixels.`,
            );
        }

        if (
            this.definition
                .maximumDragDistance <=
            this.minDistance
        ) {
            throw new Error(
                "Club maximum drag distance must be greater than its minimum visual distance.",
            );
        }

        const visual =
            this.definition.visual;

        if (
            !Number.isFinite(
                visual.renderScale,
            ) ||
            visual.renderScale <=
            0
        ) {
            throw new Error(
                "Club visual render scale must be a finite value greater than zero.",
            );
        }

        this.validateNormalizedValue(
            visual.contactAnchorX,
            "Club visual contact anchor X",
        );

        this.validateNormalizedValue(
            visual.contactAnchorY,
            "Club visual contact anchor Y",
        );

        if (
            !Number.isFinite(
                visual.headOffset,
            ) ||
            visual.headOffset <
            0
        ) {
            throw new Error(
                "Club visual head offset must be a finite non-negative value.",
            );
        }

        if (
            this.definition
                .oscillationAngle <
            0
        ) {
            throw new Error(
                "Club oscillation angle cannot be negative.",
            );
        }

        if (
            this.definition
                .optimalAccuracyRatio <
            0 ||
            this.definition
                .optimalAccuracyRatio >
            1
        ) {
            throw new Error(
                "Club optimal accuracy ratio must remain between zero and one.",
            );
        }

        if (
            this.definition
                .minimumOscillationSpeed <
            0
        ) {
            throw new Error(
                "Club minimum oscillation speed cannot be negative.",
            );
        }

        if (
            this.definition
                .maximumOscillationSpeed <
            this.definition
                .minimumOscillationSpeed
        ) {
            throw new Error(
                "Club maximum oscillation speed cannot be lower than its minimum oscillation speed.",
            );
        }

        if (
            this.definition
                .oscillationCurveStrength <
            0
        ) {
            throw new Error(
                "Club oscillation curve strength cannot be negative.",
            );
        }

        if (
            this.definition
                .oscillationCurveStrength >=
            1 / 3
        ) {
            throw new Error(
                "Club oscillation curve strength must be lower than one third.",
            );
        }

        if (
            !Number.isFinite(
                this.swingDefinition.minimumSwingDuration,
            ) ||
            this.swingDefinition.minimumSwingDuration <= 0 ||
            !Number.isFinite(
                this.swingDefinition.maximumSwingDuration,
            ) ||
            this.swingDefinition.maximumSwingDuration <
            this.swingDefinition.minimumSwingDuration ||
            !Number.isFinite(
                this.swingDefinition.followThroughDistance,
            ) ||
            this.swingDefinition.followThroughDistance < 0 ||
            !Number.isFinite(
                this.swingDefinition.recoveryDuration,
            ) ||
            this.swingDefinition.recoveryDuration <= 0 ||
            !Number.isFinite(
                this.swingDefinition.cursorReturnResponseSpeed,
            ) ||
            this.swingDefinition.cursorReturnResponseSpeed <= 0 ||
            !Number.isFinite(
                this.swingDefinition.cursorReturnSnapDistance,
            ) ||
            this.swingDefinition.cursorReturnSnapDistance < 0
        ) {
            throw new Error(
                "Club swing definition contains invalid timing or geometry values.",
            );
        }

        const aimGuide =
            this.definition.aimGuide;

        if (
            !Number.isFinite(
                aimGuide.startDistance,
            ) ||
            aimGuide.startDistance <
            0
        ) {
            throw new Error(
                "Aim-guide start distance must be a finite non-negative value.",
            );
        }

        if (
            !Number.isFinite(
                aimGuide.dotSpacing,
            ) ||
            aimGuide.dotSpacing <=
            0
        ) {
            throw new Error(
                "Aim-guide dot spacing must be a finite value greater than zero.",
            );
        }

        if (
            !Number.isFinite(
                aimGuide.dotRadius,
            ) ||
            aimGuide.dotRadius <=
            0
        ) {
            throw new Error(
                "Aim-guide dot radius must be a finite value greater than zero.",
            );
        }

        if (
            !Number.isInteger(
                aimGuide.minimumDots,
            ) ||
            aimGuide.minimumDots <
            1
        ) {
            throw new Error(
                "Aim guide must contain at least one minimum dot.",
            );
        }

        if (
            !Number.isInteger(
                aimGuide.maximumDots,
            ) ||
            aimGuide.maximumDots <
            aimGuide.minimumDots
        ) {
            throw new Error(
                "Aim-guide maximum dots cannot be lower than its minimum dots.",
            );
        }

        this.validateNormalizedValue(
            aimGuide.dotAlpha,
            "Aim-guide dot alpha",
        );
    }

    private validateNormalizedValue(
        value: number,
        label: string,
    ): void {

        if (
            !Number.isFinite(
                value,
            ) ||
            value <
            0 ||
            value >
            1
        ) {
            throw new Error(
                `${label} must remain between zero and one.`,
            );
        }
    }

    // -------------------------------------------------------
    // Visibility
    // -------------------------------------------------------

    public show(): void {

        this.setVisible(
            true,
        );
    }

    public hide(): void {

        this.setVisible(
            false,
        );
    }

    // -------------------------------------------------------
    // Cursor Mode
    // -------------------------------------------------------

    public setCursorPosition(
        mouseX: number,
        mouseY: number,
    ): void {

        if (this.swingActive || this.recoveryActive) {
            return;
        }

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

        if (this.swingActive || this.recoveryActive) {
            return;
        }

        this.shotVisualActive =
            true;

        this.currentAngle =
            angleRadians;

        const maximumDistance =
            this.definition
                .maximumDragDistance;

        this.currentDistance =
            Math.max(
                this.minDistance,
                Math.min(
                    requestedDistance,
                    maximumDistance,
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
    }

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
    }

    // -------------------------------------------------------
    // Contact-Timed Swing
    // -------------------------------------------------------

    public beginSwing(
        ballX: number,
        ballY: number,
        directionRadians: number,
        normalizedPower: number,
    ): void {

        const clampedPower =
            Math.max(0, Math.min(normalizedPower, 1));

        this.swingStartX = this.getX();
        this.swingStartY = this.getY();

        this.contactX = ballX;
        this.contactY = ballY;

        this.followThroughX =
            ballX +
            Math.cos(directionRadians) *
            this.swingDefinition.followThroughDistance;

        this.followThroughY =
            ballY +
            Math.sin(directionRadians) *
            this.swingDefinition.followThroughDistance;

        this.swingDuration =
            this.swingDefinition.maximumSwingDuration -
            (
                this.swingDefinition.maximumSwingDuration -
                this.swingDefinition.minimumSwingDuration
            ) *
            clampedPower;

        this.swingElapsedTime = 0;
        this.recoveryElapsedTime = 0;

        this.recoveryFollowThroughComplete = false;

        this.recoveryCursorX = this.getX();
        this.recoveryCursorY = this.getY();

        this.swingActive = true;
        this.recoveryActive = false;

        /*
         * Shot-preparation visuals end as soon as the committed swing begins.
         * The Club remains visible and animates independently, but Connector
         * must no longer treat the Club/Ball separation as an active drag.
         */
        this.shotVisualActive = false;
    }

    public beginRecovery(): void {

        this.swingActive = false;
        this.recoveryActive = true;
        this.recoveryElapsedTime = 0;

        this.recoveryFollowThroughComplete = false;

        this.recoveryCursorX = this.getX();
        this.recoveryCursorY = this.getY();

        this.setPosition(
            this.contactX,
            this.contactY,
        );
    }

    public cancelSwing(): void {

        this.swingActive = false;
        this.recoveryActive = false;
        this.swingElapsedTime = 0;
        this.recoveryElapsedTime = 0;

        this.recoveryFollowThroughComplete = false;
    }

    public setRecoveryCursorTarget(
        mouseX: number,
        mouseY: number,
    ): void {

        if (!this.recoveryActive) {
            return;
        }

        if (
            !Number.isFinite(mouseX) ||
            !Number.isFinite(mouseY)
        ) {
            return;
        }

        this.recoveryCursorX = mouseX;
        this.recoveryCursorY = mouseY;
    }

    public hasReachedContact(): boolean {

        return (
            this.swingActive &&
            this.swingElapsedTime >=
            this.swingDuration
        );
    }

    public hasCompletedRecovery(): boolean {

        if (
            !this.recoveryActive ||
            !this.recoveryFollowThroughComplete
        ) {
            return false;
        }

        return (
            Math.hypot(
                this.recoveryCursorX - this.getX(),
                this.recoveryCursorY - this.getY(),
            ) <=
            this.swingDefinition.cursorReturnSnapDistance
        );
    }

    private updateSwing(
        deltaTime: number,
    ): void {

        this.swingElapsedTime =
            Math.min(
                this.swingElapsedTime + deltaTime,
                this.swingDuration,
            );

        const progress =
            this.swingDuration > 0
                ? this.swingElapsedTime / this.swingDuration
                : 1;

        const easedProgress =
            progress * progress;

        this.setPosition(
            this.lerp(
                this.swingStartX,
                this.contactX,
                easedProgress,
            ),
            this.lerp(
                this.swingStartY,
                this.contactY,
                easedProgress,
            ),
        );
    }

    private updateRecovery(
        deltaTime: number,
    ): void {

        if (!this.recoveryFollowThroughComplete) {

            this.recoveryElapsedTime =
                Math.min(
                    this.recoveryElapsedTime + deltaTime,
                    this.swingDefinition.recoveryDuration,
                );

            const progress =
                this.swingDefinition.recoveryDuration > 0
                    ? (
                        this.recoveryElapsedTime /
                        this.swingDefinition.recoveryDuration
                    )
                    : 1;

            const easedProgress =
                1 -
                Math.pow(
                    1 - progress,
                    2,
                );

            this.setPosition(
                this.lerp(
                    this.contactX,
                    this.followThroughX,
                    easedProgress,
                ),
                this.lerp(
                    this.contactY,
                    this.followThroughY,
                    easedProgress,
                ),
            );

            if (progress < 1) {
                return;
            }

            this.recoveryFollowThroughComplete = true;
        }

        /*
         * The target is refreshed by PlayerController every frame, so the
         * Club smoothly catches up even if the pointer moves during recovery.
         */
        const interpolationFactor =
            1 -
            Math.exp(
                -this.swingDefinition.cursorReturnResponseSpeed *
                deltaTime,
            );

        this.setPosition(
            this.lerp(
                this.getX(),
                this.recoveryCursorX,
                interpolationFactor,
            ),
            this.lerp(
                this.getY(),
                this.recoveryCursorY,
                interpolationFactor,
            ),
        );

        const distanceToCursor =
            Math.hypot(
                this.recoveryCursorX - this.getX(),
                this.recoveryCursorY - this.getY(),
            );

        if (
            distanceToCursor <=
            this.swingDefinition.cursorReturnSnapDistance
        ) {
            this.setPosition(
                this.recoveryCursorX,
                this.recoveryCursorY,
            );
        }
    }

    private lerp(
        start: number,
        end: number,
        amount: number,
    ): number {

        return start + (end - start) * amount;
    }

    // -------------------------------------------------------
    // Shot Visual Reset
    // -------------------------------------------------------

    public resetShotVisuals(): void {

        this.cancelSwing();

        this.normalizedPower = 0;

        this.currentDistance =
            this.minDistance;

        this.currentAngle = 0;

        this.shotVisualActive =
            false;
    }

    // -------------------------------------------------------
    // Club Definition
    // -------------------------------------------------------

    public getDefinition(): ClubDefinition {
        return this.definition;
    }

    // -------------------------------------------------------
    // Club Identity
    // -------------------------------------------------------

    public getClubId(): string {
        return this.definition.id;
    }

    public getClubName(): string {
        return this.definition.name;
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

    public isShotVisualActive(): boolean {
        return this.shotVisualActive;
    }

    // -------------------------------------------------------
    // Visual Configuration
    // -------------------------------------------------------

    public getMinimumDistance(): number {
        return this.minDistance;
    }

    public getMaximumDistance(): number {

        return this.definition
            .maximumDragDistance;
    }

    // -------------------------------------------------------
    // Gameplay Configuration
    // -------------------------------------------------------

    public getMaximumDragDistance(): number {

        return this.definition
            .maximumDragDistance;
    }

    public getOscillationAngle(): number {

        return this.definition
            .oscillationAngle;
    }

    public getOptimalAccuracyRatio(): number {

        return this.definition
            .optimalAccuracyRatio;
    }

    public getOptimalAccuracyTolerance(): number {

        return (
            this.definition
                .oscillationAngle *
            this.definition
                .optimalAccuracyRatio
        );
    }

    public getMinimumOscillationSpeed(): number {

        return this.definition
            .minimumOscillationSpeed;
    }

    public getMaximumOscillationSpeed(): number {

        return this.definition
            .maximumOscillationSpeed;
    }

    public getOscillationCurveStrength(): number {

        return this.definition
            .oscillationCurveStrength;
    }
}
