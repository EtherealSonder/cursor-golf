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

    // -------------------------------------------------------
    // Club Visual Configuration
    // -------------------------------------------------------

    private readonly ballRadius = 10;

    private readonly headOffset = 10;

    private readonly minDistance =
        this.ballRadius +
        this.headOffset;

    private currentAngle = 0;

    private currentDistance =
        this.minDistance;

    // -------------------------------------------------------
    // Current Shot Visual Data
    // -------------------------------------------------------

    private normalizedPower = 0;

    private shotVisualActive = false;

    constructor(
        definition:
            ClubDefinition =
            BASIC_CLUB_DEFINITION,
    ) {

        super();

        this.definition =
            definition;

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

        const aimGuide =
            this.definition.aimGuide;

        if (
            aimGuide.startDistance <
            0
        ) {
            throw new Error(
                "Aim-guide start distance cannot be negative.",
            );
        }

        if (
            aimGuide.dotSpacing <=
            0
        ) {
            throw new Error(
                "Aim-guide dot spacing must be greater than zero.",
            );
        }

        if (
            aimGuide.maximumDotRadius <=
            0
        ) {
            throw new Error(
                "Aim-guide maximum dot radius must be greater than zero.",
            );
        }

        if (
            aimGuide.minimumDotRadius <=
            0
        ) {
            throw new Error(
                "Aim-guide minimum dot radius must be greater than zero.",
            );
        }

        if (
            aimGuide.minimumDotRadius >
            aimGuide.maximumDotRadius
        ) {
            throw new Error(
                "Aim-guide minimum dot radius cannot exceed its maximum dot radius.",
            );
        }

        if (
            aimGuide.minimumDots <
            1
        ) {
            throw new Error(
                "Aim guide must contain at least one minimum dot.",
            );
        }

        if (
            aimGuide.maximumDots <
            aimGuide.minimumDots
        ) {
            throw new Error(
                "Aim-guide maximum dots cannot be lower than its minimum dots.",
            );
        }

        this.validateNormalizedValue(
            aimGuide.optimalAlpha,
            "Aim-guide optimal alpha",
        );

        this.validateNormalizedValue(
            aimGuide.edgeAlpha,
            "Aim-guide edge alpha",
        );

        if (
            aimGuide.edgeAlpha >
            aimGuide.optimalAlpha
        ) {
            throw new Error(
                "Aim-guide edge alpha cannot exceed its optimal alpha.",
            );
        }
    }

    private validateNormalizedValue(
        value: number,
        label: string,
    ): void {

        if (
            value < 0 ||
            value > 1
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
    // Shot Visual Reset
    // -------------------------------------------------------

    public resetShotVisuals(): void {

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