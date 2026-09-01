import {
    Graphics,
} from "pixi.js";

import {
    DEFAULT_CONNECTOR_DEFINITION,
} from "../config/ConnectorDefinition";

import type {
    ConnectorDefinition,
} from "../config/ConnectorDefinition";

import type {
    Ball,
} from "./Ball";

import type {
    Club,
} from "./Club";

/**
 * Renders the visual connection between
 * the golf ball and the club.
 *
 * Connector is owned by World and acts as a
 * passive visual renderer.
 *
 * It reads current Ball and Club state without
 * duplicating their gameplay data.
 *
 * Connector owns only its visual animation state,
 * currently represented by the travelling pulse
 * timer.
 */
export class Connector {

    private static sharedPulseProgress = 0;

    private graphics:
        Graphics | null = null;

    /**
     * Complete immutable visual configuration for
     * this Connector instance.
     */
    private readonly definition:
        ConnectorDefinition;

    /**
     * Runtime time accumulator used only by the
     * travelling highlight animation.
     */
    private pulseTime = 0;

    constructor(
        definition:
            ConnectorDefinition =
            DEFAULT_CONNECTOR_DEFINITION,
    ) {

        this.definition =
            definition;

        this.validateDefinition();
    }

    // -------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------

    public initialize(): void {

        if (this.graphics) {
            throw new Error(
                "Connector cannot be initialized more than once.",
            );
        }

        this.graphics =
            new Graphics();

        this.graphics.visible = true;

        this.resetPulse();
    }

    public destroy(): void {

        this.graphics?.destroy();

        this.graphics = null;

        this.resetPulse();
    }

    // -------------------------------------------------------
    // Configuration Validation
    // -------------------------------------------------------

    /**
     * Validates the supplied definition once when
     * the Connector is constructed.
     *
     * This prevents invalid visual configuration
     * from producing infinite loops, invisible
     * strokes, invalid interpolation, or unstable
     * animation behaviour.
     */
    private validateDefinition(): void {

        const definition =
            this.definition;

        if (
            definition.segmentLength <=
            0
        ) {
            throw new Error(
                "Connector segment length must be greater than zero.",
            );
        }

        if (
            definition.segmentGap <
            0
        ) {
            throw new Error(
                "Connector segment gap cannot be negative.",
            );
        }

        if (
            definition.minimumSegmentLength <=
            0
        ) {
            throw new Error(
                "Connector minimum segment length must be greater than zero.",
            );
        }

        if (
            definition.minimumSegmentLength >
            definition.segmentLength
        ) {
            throw new Error(
                "Connector minimum segment length cannot exceed its normal segment length.",
            );
        }

        if (
            definition.minimumPowerLength <=
            0
        ) {
            throw new Error(
                "Connector minimum power length must be greater than zero.",
            );
        }

        if (
            definition.trackThickness <=
            0
        ) {
            throw new Error(
                "Connector track thickness must be greater than zero.",
            );
        }

        if (
            definition.basePowerThickness <=
            0
        ) {
            throw new Error(
                "Connector base power thickness must be greater than zero.",
            );
        }

        if (
            definition.maximumPowerThickness <
            definition.basePowerThickness
        ) {
            throw new Error(
                "Connector maximum power thickness cannot be lower than its base power thickness.",
            );
        }

        if (
            definition.maximumHighlightThickness <
            definition.maximumPowerThickness
        ) {
            throw new Error(
                "Connector highlight thickness cannot be lower than its maximum power thickness.",
            );
        }

        this.validateNormalizedValue(
            definition.trackAlpha,
            "Connector track alpha",
        );

        this.validateNormalizedValue(
            definition.powerAlpha,
            "Connector power alpha",
        );

        this.validateNormalizedValue(
            definition.emphasisStartPower,
            "Connector emphasis start power",
        );

        this.validateNormalizedValue(
            definition.maximumHighlightBlend,
            "Connector maximum highlight blend",
        );

        this.validateNormalizedValue(
            definition.maximumHighlightAlpha,
            "Connector maximum highlight alpha",
        );

        this.validateNormalizedValue(
            definition.maximumPulseAlpha,
            "Connector maximum pulse alpha",
        );

        this.validateNormalizedValue(
            definition.lowToMediumTransitionEnd,
            "Connector low-to-medium transition endpoint",
        );

        this.validateNormalizedValue(
            definition.lowPowerNameEnd,
            "Connector low-power name endpoint",
        );

        this.validateNormalizedValue(
            definition.mediumPowerNameEnd,
            "Connector medium-power name endpoint",
        );

        if (
            definition.lowPowerNameEnd >=
            definition.mediumPowerNameEnd
        ) {
            throw new Error(
                "Connector low-power colour-name endpoint must be lower than its medium-power endpoint.",
            );
        }

        if (
            definition.pulseDuration <=
            0
        ) {
            throw new Error(
                "Connector pulse duration must be greater than zero.",
            );
        }

        if (
            definition.pulseHalfWidth <=
            0
        ) {
            throw new Error(
                "Connector pulse half-width must be greater than zero.",
            );
        }

        if (
            definition.pulseThicknessIncrease <
            0
        ) {
            throw new Error(
                "Connector pulse thickness increase cannot be negative.",
            );
        }

        if (
            definition.maximumAnimationDeltaTime <=
            0
        ) {
            throw new Error(
                "Connector maximum animation delta time must be greater than zero.",
            );
        }

        if (
            definition.milestoneRatios
                .length === 0
        ) {
            throw new Error(
                "Connector must define at least one power milestone.",
            );
        }

        let previousMilestone = 0;

        for (
            const milestoneRatio
            of definition.milestoneRatios
        ) {
            this.validateNormalizedValue(
                milestoneRatio,
                "Connector milestone ratio",
            );

            if (
                milestoneRatio <=
                previousMilestone
            ) {
                throw new Error(
                    "Connector milestone ratios must be strictly increasing.",
                );
            }

            previousMilestone =
                milestoneRatio;
        }

        if (
            definition.milestoneLength <=
            0 ||
            definition.milestoneThickness <=
            0
        ) {
            throw new Error(
                "Connector milestone geometry must be greater than zero.",
            );
        }

        this.validateNormalizedValue(
            definition.milestoneInactiveAlpha,
            "Connector inactive milestone alpha",
        );

        this.validateNormalizedValue(
            definition.milestoneActiveAlpha,
            "Connector active milestone alpha",
        );

        if (
            definition.milestoneActiveAlpha <
            definition.milestoneInactiveAlpha
        ) {
            throw new Error(
                "Connector active milestone alpha cannot be lower than inactive milestone alpha.",
            );
        }

        if (
            definition.endpointMarkerBaseRadius <=
            0 ||
            definition.endpointMarkerMaximumRadius <
            definition.endpointMarkerBaseRadius ||
            definition.endpointMarkerOutlineThickness <=
            0
        ) {
            throw new Error(
                "Connector endpoint marker geometry is invalid.",
            );
        }

        this.validateNormalizedValue(
            definition.endpointMarkerAlpha,
            "Connector endpoint marker alpha",
        );

        if (
            definition.clubNodeBaseRadius <=
            0 ||
            definition.clubNodeMaximumRadius <
            definition.clubNodeBaseRadius ||
            definition.clubNodeGlowMaximumRadius <
            definition.clubNodeMaximumRadius
        ) {
            throw new Error(
                "Connector club-node geometry is invalid.",
            );
        }

        this.validateNormalizedValue(
            definition.clubNodeAlpha,
            "Connector club-node alpha",
        );

        this.validateNormalizedValue(
            definition.clubNodeGlowStartPower,
            "Connector club-node glow start power",
        );

        this.validateNormalizedValue(
            definition.clubNodeGlowAlpha,
            "Connector club-node glow alpha",
        );
    }

    /**
     * Validates a value expected to remain within
     * the normalized zero-to-one range.
     */
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
    // Graphics Access
    // -------------------------------------------------------

    /**
     * Returns the Pixi Graphics object so World
     * can insert it into the correct stage layer.
     */
    public getGraphics():
        Graphics | null {

        return this.graphics;
    }

    // -------------------------------------------------------
    // Visibility
    // -------------------------------------------------------

    public show(): void {

        if (this.graphics) {
            this.graphics.visible = true;
        }
    }

    public hide(): void {

        if (this.graphics) {
            this.graphics.visible = false;
        }

        this.resetPulse();
    }

    // -------------------------------------------------------
    // Rendering
    // -------------------------------------------------------

    /**
     * Reads current Ball and Club state, advances
     * visual animation time, and reconstructs the
     * connector for the current frame.
     */
    public render(
        ball: Ball,
        club: Club,
        deltaTime: number,
    ): void {

        if (!this.graphics) {
            return;
        }

        this.graphics.clear();

        if (
            !club.isShotVisualActive()
        ) {
            this.resetPulse();

            return;
        }

        const startX =
            ball.getX();

        const startY =
            ball.getY();

        const endX =
            club.getX();

        const endY =
            club.getY();

        const deltaX =
            endX -
            startX;

        const deltaY =
            endY -
            startY;

        const totalDistance =
            Math.hypot(
                deltaX,
                deltaY,
            );

        /*
         * A zero-length connector has no usable
         * direction vector.
         */
        if (totalDistance <= 0) {
            this.resetPulse();

            return;
        }

        const directionX =
            deltaX /
            totalDistance;

        const directionY =
            deltaY /
            totalDistance;

        const normalizedPower =
            this.clampPower(
                club.getNormalizedPower(),
            );

        const emphasis =
            this.calculateEmphasis(
                normalizedPower,
            );

        this.updatePulse(
            deltaTime,
        );

        const basePowerColor =
            this.calculatePowerColor(
                normalizedPower,
            );

        const powerColor =
            this.calculateEmphasizedColor(
                basePowerColor,
                emphasis,
            );

        const powerThickness =
            this.calculatePowerThickness(
                normalizedPower,
            );

        const activeDistance =
            totalDistance *
            normalizedPower;

        const pulseCenterDistance =
            this.calculatePulseCenterDistance(
                activeDistance,
                emphasis,
            );

        this.renderSegments(
            startX,
            startY,
            directionX,
            directionY,
            totalDistance,
            activeDistance,
            powerColor,
            powerThickness,
            emphasis,
            pulseCenterDistance,
        );

        this.renderMilestones(
            startX,
            startY,
            directionX,
            directionY,
            totalDistance,
            normalizedPower,
        );

        this.renderActiveEndpointMarker(
            startX,
            startY,
            directionX,
            directionY,
            activeDistance,
            normalizedPower,
            powerColor,
        );

        this.renderClubEnergyNode(
            endX,
            endY,
            normalizedPower,
            powerColor,
        );
    }

    // -------------------------------------------------------
    // Segment Rendering
    // -------------------------------------------------------

    /**
     * Iterates over every visible connector
     * segment from the Ball toward the Club.
     */
    private renderSegments(
        startX: number,
        startY: number,
        directionX: number,
        directionY: number,
        totalDistance: number,
        activeDistance: number,
        powerColor: number,
        powerThickness: number,
        emphasis: number,
        pulseCenterDistance: number,
    ): void {

        const segmentStep =
            this.definition.segmentLength +
            this.definition.segmentGap;

        let segmentStartDistance = 0;

        while (
            segmentStartDistance <
            totalDistance
        ) {

            const remainingDistance =
                totalDistance -
                segmentStartDistance;

            const visibleLength =
                Math.min(
                    this.definition
                        .segmentLength,
                    remainingDistance,
                );

            if (
                visibleLength <
                this.definition
                    .minimumSegmentLength
            ) {
                break;
            }

            const segmentEndDistance =
                segmentStartDistance +
                visibleLength;

            const segmentStartX =
                startX +
                directionX *
                segmentStartDistance;

            const segmentStartY =
                startY +
                directionY *
                segmentStartDistance;

            const segmentEndX =
                startX +
                directionX *
                segmentEndDistance;

            const segmentEndY =
                startY +
                directionY *
                segmentEndDistance;

            const activeLength =
                this.calculateActiveSegmentLength(
                    segmentStartDistance,
                    visibleLength,
                    activeDistance,
                );

            this.drawSegment(
                segmentStartX,
                segmentStartY,
                segmentEndX,
                segmentEndY,
                directionX,
                directionY,
                segmentStartDistance,
                activeLength,
                powerColor,
                powerThickness,
                emphasis,
                pulseCenterDistance,
            );

            segmentStartDistance +=
                segmentStep;
        }
    }

    /**
     * Calculates how much of one visible segment
     * lies within the active power distance.
     */
    private calculateActiveSegmentLength(
        segmentStartDistance: number,
        segmentVisibleLength: number,
        activeDistance: number,
    ): number {

        const distanceIntoSegment =
            activeDistance -
            segmentStartDistance;

        return Math.max(
            0,
            Math.min(
                distanceIntoSegment,
                segmentVisibleLength,
            ),
        );
    }

    /**
     * Draws one complete connector segment.
     *
     * Rendering order:
     *
     * 1. Neutral track.
     * 2. Static maximum-power highlight.
     * 3. Main coloured power layer.
     * 4. Travelling pulse highlight.
     */
    private drawSegment(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        directionX: number,
        directionY: number,
        segmentStartDistance: number,
        activeLength: number,
        powerColor: number,
        powerThickness: number,
        emphasis: number,
        pulseCenterDistance: number,
    ): void {

        this.drawTrackSegment(
            startX,
            startY,
            endX,
            endY,
        );

        if (
            activeLength <
            this.definition
                .minimumPowerLength
        ) {
            return;
        }

        const powerEndX =
            startX +
            directionX *
            activeLength;

        const powerEndY =
            startY +
            directionY *
            activeLength;

        if (emphasis > 0) {
            this.drawPowerHighlight(
                startX,
                startY,
                powerEndX,
                powerEndY,
                powerColor,
                emphasis,
            );
        }

        this.drawPowerSegment(
            startX,
            startY,
            powerEndX,
            powerEndY,
            powerColor,
            powerThickness,
        );

        if (emphasis > 0) {
            this.drawPulseForSegment(
                startX,
                startY,
                directionX,
                directionY,
                segmentStartDistance,
                activeLength,
                pulseCenterDistance,
                powerThickness,
                emphasis,
            );
        }
    }

    /**
     * Draws the neutral track layer.
     */
    private drawTrackSegment(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
    ): void {

        if (!this.graphics) {
            return;
        }

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
                width:
                    this.definition
                        .trackThickness,

                color:
                    this.definition
                        .trackColor,

                alpha:
                    this.definition
                        .trackAlpha,

                cap:
                    "round",
            });
    }

    /**
     * Draws the static high-power emphasis layer.
     */
    private drawPowerHighlight(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        powerColor: number,
        emphasis: number,
    ): void {

        if (!this.graphics) {
            return;
        }

        const thickness =
            this.interpolateNumber(
                this.definition
                    .basePowerThickness,
                this.definition
                    .maximumHighlightThickness,
                emphasis,
            );

        const alpha =
            this.definition
                .maximumHighlightAlpha *
            emphasis;

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
                width:
                    thickness,

                color:
                    powerColor,

                alpha,

                cap:
                    "round",
            });
    }

    /**
     * Draws the main coloured power layer.
     */
    private drawPowerSegment(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        powerColor: number,
        powerThickness: number,
    ): void {

        if (!this.graphics) {
            return;
        }

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
                width:
                    powerThickness,

                color:
                    powerColor,

                alpha:
                    this.definition
                        .powerAlpha,

                cap:
                    "round",
            });
    }

    // -------------------------------------------------------
    // Pulse Rendering
    // -------------------------------------------------------

    /**
     * Draws the part of the moving pulse that
     * overlaps the active portion of one segment.
     *
     * Calculating overlap per segment preserves
     * the empty visual gaps.
     */
    private drawPulseForSegment(
        segmentStartX: number,
        segmentStartY: number,
        directionX: number,
        directionY: number,
        segmentStartDistance: number,
        activeLength: number,
        pulseCenterDistance: number,
        powerThickness: number,
        emphasis: number,
    ): void {

        if (!this.graphics) {
            return;
        }

        const activeSegmentEndDistance =
            segmentStartDistance +
            activeLength;

        const pulseStartDistance =
            pulseCenterDistance -
            this.definition
                .pulseHalfWidth;

        const pulseEndDistance =
            pulseCenterDistance +
            this.definition
                .pulseHalfWidth;

        const overlapStartDistance =
            Math.max(
                segmentStartDistance,
                pulseStartDistance,
            );

        const overlapEndDistance =
            Math.min(
                activeSegmentEndDistance,
                pulseEndDistance,
            );

        const overlapLength =
            overlapEndDistance -
            overlapStartDistance;

        if (
            overlapLength <
            this.definition
                .minimumPowerLength
        ) {
            return;
        }

        const localStartDistance =
            overlapStartDistance -
            segmentStartDistance;

        const localEndDistance =
            overlapEndDistance -
            segmentStartDistance;

        const pulseStartX =
            segmentStartX +
            directionX *
            localStartDistance;

        const pulseStartY =
            segmentStartY +
            directionY *
            localStartDistance;

        const pulseEndX =
            segmentStartX +
            directionX *
            localEndDistance;

        const pulseEndY =
            segmentStartY +
            directionY *
            localEndDistance;

        const overlapMidpointDistance =
            (
                overlapStartDistance +
                overlapEndDistance
            ) /
            2;

        const distanceFromPulseCenter =
            Math.abs(
                overlapMidpointDistance -
                pulseCenterDistance,
            );

        const localPulseStrength =
            Math.max(
                0,
                1 -
                distanceFromPulseCenter /
                this.definition
                    .pulseHalfWidth,
            );

        const pulseAlpha =
            this.definition
                .maximumPulseAlpha *
            emphasis *
            localPulseStrength;

        const pulseThickness =
            powerThickness +
            this.definition
                .pulseThicknessIncrease;

        this.graphics
            .moveTo(
                pulseStartX,
                pulseStartY,
            )
            .lineTo(
                pulseEndX,
                pulseEndY,
            )
            .stroke({
                width:
                    pulseThickness,

                color:
                    this.definition
                        .pulseColor,

                alpha:
                    pulseAlpha,

                cap:
                    "round",
            });
    }

    // -------------------------------------------------------
    // Pulse Timing
    // -------------------------------------------------------

    /**
     * Advances or resets the travelling pulse.
     */
    private updatePulse(
        deltaTime: number,
    ): void {

        const safeDeltaTime =
            Math.max(
                0,
                Math.min(
                    deltaTime,
                    this.definition
                        .maximumAnimationDeltaTime,
                ),
            );

        this.pulseTime +=
            safeDeltaTime;

        if (
            this.pulseTime >=
            this.definition
                .pulseDuration
        ) {
            this.pulseTime %=
                this.definition
                    .pulseDuration;
        }

        Connector.sharedPulseProgress =
            this.pulseTime /
            this.definition
                .pulseDuration;
    }

    /**
     * Converts animation time into a distance
     * along the active connector fill.
     */
    private calculatePulseCenterDistance(
        activeDistance: number,
        emphasis: number,
    ): number {

        if (
            emphasis <= 0 ||
            activeDistance <= 0
        ) {
            return 0;
        }

        const normalizedProgress =
            this.pulseTime /
            this.definition
                .pulseDuration;

        return (
            activeDistance *
            normalizedProgress
        );
    }

    private resetPulse(): void {

        this.pulseTime = 0;
        Connector.sharedPulseProgress = 0;
    }

    public static getSharedPulseProgress():
        number {

        return Connector.sharedPulseProgress;
    }

    public getPulseProgress():
        number {

        return Connector.sharedPulseProgress;
    }

    // -------------------------------------------------------
    // Emphasis Calculation
    // -------------------------------------------------------

    /**
     * Converts normalized shot power into an
     * emphasis value between zero and one.
     */
    private calculateEmphasis(
        normalizedPower: number,
    ): number {

        const availableRange =
            1 -
            this.definition
                .emphasisStartPower;

        if (availableRange <= 0) {
            return 0;
        }

        return this.clampPower(
            (
                normalizedPower -
                this.definition
                    .emphasisStartPower
            ) /
            availableRange,
        );
    }

    /**
     * Blends the normal power colour toward the
     * configured emphasis colour.
     */
    private calculateEmphasizedColor(
        powerColor: number,
        emphasis: number,
    ): number {

        const interpolation =
            emphasis *
            this.definition
                .maximumHighlightBlend;

        return this.interpolateColor(
            powerColor,
            this.definition
                .emphasisHighlightColor,
            interpolation,
        );
    }

    /**
     * Calculates the current active power-layer
     * thickness.
     */
    private calculatePowerThickness(
        normalizedPower: number,
    ): number {

        return this.interpolateNumber(
            this.definition
                .basePowerThickness,
            this.definition
                .maximumPowerThickness,
            normalizedPower,
        );
    }


    // -------------------------------------------------------
    // Power Milestone Rendering
    // -------------------------------------------------------

    private renderMilestones(
        startX: number,
        startY: number,
        directionX: number,
        directionY: number,
        totalDistance: number,
        normalizedPower: number,
    ): void {

        if (!this.graphics) {
            return;
        }

        const perpendicularX =
            -directionY;

        const perpendicularY =
            directionX;

        const halfLength =
            this.definition
                .milestoneLength /
            2;

        for (
            const milestoneRatio
            of this.definition
                .milestoneRatios
        ) {
            const milestoneDistance =
                totalDistance *
                milestoneRatio;

            const centreX =
                startX +
                directionX *
                milestoneDistance;

            const centreY =
                startY +
                directionY *
                milestoneDistance;

            const active =
                normalizedPower +
                0.000001 >=
                milestoneRatio;

            const alpha =
                active
                    ? this.definition
                        .milestoneActiveAlpha
                    : this.definition
                        .milestoneInactiveAlpha;

            this.graphics
                .moveTo(
                    centreX -
                    perpendicularX *
                    halfLength,
                    centreY -
                    perpendicularY *
                    halfLength,
                )
                .lineTo(
                    centreX +
                    perpendicularX *
                    halfLength,
                    centreY +
                    perpendicularY *
                    halfLength,
                )
                .stroke({
                    width:
                        this.definition
                            .milestoneThickness,

                    color:
                        this.definition
                            .milestoneColor,

                    alpha,

                    cap:
                        "round",
                });
        }
    }

    // -------------------------------------------------------
    // Active Power Endpoint Rendering
    // -------------------------------------------------------

    private renderActiveEndpointMarker(
        startX: number,
        startY: number,
        directionX: number,
        directionY: number,
        activeDistance: number,
        normalizedPower: number,
        powerColor: number,
    ): void {

        if (
            !this.graphics ||
            normalizedPower <=
            0
        ) {
            return;
        }

        const markerX =
            startX +
            directionX *
            activeDistance;

        const markerY =
            startY +
            directionY *
            activeDistance;

        const radius =
            this.interpolateNumber(
                this.definition
                    .endpointMarkerBaseRadius,
                this.definition
                    .endpointMarkerMaximumRadius,
                normalizedPower,
            );

        this.graphics
            .circle(
                markerX,
                markerY,
                radius +
                this.definition
                    .endpointMarkerOutlineThickness,
            )
            .fill({
                color:
                    this.definition
                        .endpointMarkerOutlineColor,

                alpha:
                    this.definition
                        .endpointMarkerAlpha *
                    0.8,
            });

        this.graphics
            .circle(
                markerX,
                markerY,
                radius,
            )
            .fill({
                color:
                    powerColor,

                alpha:
                    this.definition
                        .endpointMarkerAlpha,
            });
    }

    // -------------------------------------------------------
    // Club-End Energy Node Rendering
    // -------------------------------------------------------

    private renderClubEnergyNode(
        endX: number,
        endY: number,
        normalizedPower: number,
        powerColor: number,
    ): void {

        if (
            !this.graphics ||
            normalizedPower <=
            0
        ) {
            return;
        }

        const glowStartPower =
            this.definition
                .clubNodeGlowStartPower;

        const glowRange =
            1 -
            glowStartPower;

        const glowStrength =
            glowRange > 0
                ? this.clampPower(
                    (
                        normalizedPower -
                        glowStartPower
                    ) /
                    glowRange,
                )
                : 0;

        if (glowStrength > 0) {
            const glowRadius =
                this.interpolateNumber(
                    this.definition
                        .clubNodeMaximumRadius,
                    this.definition
                        .clubNodeGlowMaximumRadius,
                    glowStrength,
                );

            this.graphics
                .circle(
                    endX,
                    endY,
                    glowRadius,
                )
                .fill({
                    color:
                        powerColor,

                    alpha:
                        this.definition
                            .clubNodeGlowAlpha *
                        glowStrength,
                });
        }

        const nodeRadius =
            this.interpolateNumber(
                this.definition
                    .clubNodeBaseRadius,
                this.definition
                    .clubNodeMaximumRadius,
                normalizedPower,
            );

        this.graphics
            .circle(
                endX,
                endY,
                nodeRadius,
            )
            .fill({
                color:
                    powerColor,

                alpha:
                    this.definition
                        .clubNodeAlpha,
            });
    }

    // -------------------------------------------------------
    // Public Debug Queries
    // -------------------------------------------------------

    /**
     * Returns the human-readable visual colour
     * band associated with normalized power.
     */
    public getColorName(
        normalizedPower: number,
    ): string {

        const power =
            this.clampPower(
                normalizedPower,
            );

        if (
            power <
            this.definition
                .lowPowerNameEnd
        ) {
            return "Yellow";
        }

        if (
            power <
            this.definition
                .mediumPowerNameEnd
        ) {
            return "Orange";
        }

        return "Red";
    }

    /**
     * Exposes the immutable definition for future
     * debug tools and configuration inspection.
     */
    public getDefinition():
        ConnectorDefinition {

        return this.definition;
    }

    // -------------------------------------------------------
    // Colour Calculation
    // -------------------------------------------------------

    /**
     * Creates the smooth colour transition:
     *
     * Low colour
     * to
     * Medium colour
     * to
     * High colour
     */
    private calculatePowerColor(
        normalizedPower: number,
    ): number {

        const power =
            this.clampPower(
                normalizedPower,
            );

        const transitionPoint =
            this.definition
                .lowToMediumTransitionEnd;

        if (
            power <=
            transitionPoint
        ) {

            const interpolation =
                transitionPoint > 0
                    ? power /
                    transitionPoint
                    : 1;

            return this.interpolateColor(
                this.definition
                    .lowPowerColor,
                this.definition
                    .mediumPowerColor,
                interpolation,
            );
        }

        const remainingRange =
            1 -
            transitionPoint;

        const interpolation =
            remainingRange > 0
                ? (
                    power -
                    transitionPoint
                ) /
                remainingRange
                : 1;

        return this.interpolateColor(
            this.definition
                .mediumPowerColor,
            this.definition
                .highPowerColor,
            interpolation,
        );
    }

    /**
     * Constrains a numeric value to the normalized
     * zero-to-one range.
     */
    private clampPower(
        value: number,
    ): number {

        return Math.max(
            0,
            Math.min(
                value,
                1,
            ),
        );
    }

    /**
     * Performs linear interpolation between two
     * numeric values.
     */
    private interpolateNumber(
        startValue: number,
        endValue: number,
        interpolation: number,
    ): number {

        const amount =
            this.clampPower(
                interpolation,
            );

        return (
            startValue +
            (
                endValue -
                startValue
            ) *
            amount
        );
    }

    /**
     * Performs linear RGB interpolation between
     * two hexadecimal colours.
     */
    private interpolateColor(
        startColor: number,
        endColor: number,
        interpolation: number,
    ): number {

        const amount =
            this.clampPower(
                interpolation,
            );

        const startRed =
            (
                startColor >>
                16
            ) &
            0xff;

        const startGreen =
            (
                startColor >>
                8
            ) &
            0xff;

        const startBlue =
            startColor &
            0xff;

        const endRed =
            (
                endColor >>
                16
            ) &
            0xff;

        const endGreen =
            (
                endColor >>
                8
            ) &
            0xff;

        const endBlue =
            endColor &
            0xff;

        const red =
            Math.round(
                startRed +
                (
                    endRed -
                    startRed
                ) *
                amount,
            );

        const green =
            Math.round(
                startGreen +
                (
                    endGreen -
                    startGreen
                ) *
                amount,
            );

        const blue =
            Math.round(
                startBlue +
                (
                    endBlue -
                    startBlue
                ) *
                amount,
            );

        return (
            (
                red <<
                16
            ) |
            (
                green <<
                8
            ) |
            blue
        );
    }

    // -------------------------------------------------------
    // Manual Reset
    // -------------------------------------------------------

    /**
     * Clears all currently rendered connector
     * graphics and resets visual animation state.
     */
    public clear(): void {

        this.graphics?.clear();

        this.resetPulse();
    }
}