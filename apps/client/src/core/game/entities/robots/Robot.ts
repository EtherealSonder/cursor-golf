import { Container, Sprite } from "pixi.js";

import type { RobotDefinition } from "../../config/RobotDefinition";
import { AssetLoader } from "../../../rendering/AssetLoader";
import { Entity } from "../Entity";
import { RobotLocomotionController, type RobotLocomotionPhase } from "./RobotLocomotionController";
import { RobotObstacleAvoidance } from "./RobotObstacleAvoidance";
import type { RobotNavigationPoint, RobotNavigationQuery } from "./RobotNavigationQuery";
import type { RobotInteractionRegistry } from "./RobotInteractionRegistry";
import { RobotTargetQuery } from "./RobotTargetQuery";
import { RobotVisionSystem, type RobotVisionCandidate } from "./RobotVisionSystem";
import { RobotTargetingController, type RobotTargetingPhase } from "./RobotTargetingController";
import { RobotAttackController, type RobotAttackPhase } from "./RobotAttackController";

export type RobotMovementState = "WAITING" | "TURNING" | "WANDERING" | "DETECTING" | "TARGET_LOCKED" | "ATTACKING";

export interface RobotDebugSnapshot {
    readonly id: string; readonly state: RobotMovementState;
    readonly x: number; readonly y: number; readonly rotationRadians: number;
    readonly roamCenterX: number; readonly roamCenterY: number; readonly roamRadius: number;
    readonly clearanceRadius: number; readonly destination: RobotNavigationPoint | null;
    readonly distanceToDestination: number | null; readonly waitRemainingSeconds: number;
    readonly lastDestinationAttempts: number; readonly avoidanceProbePoint: RobotNavigationPoint | null;
    readonly avoidingObstacle: boolean; readonly avoidanceTurnDegrees: number;
    readonly stuckSeconds: number; readonly abandonedDestinations: number;
    readonly locomotionPhase: RobotLocomotionPhase; readonly activeLeg: 0 | 1 | 2;
    readonly headingErrorDegrees: number;
    readonly visionRange: number; readonly visionHalfAngleDegrees: number;
    readonly visionCandidates: readonly RobotVisionCandidate[];
    readonly detectedTargetId: string | null; readonly detectedTargetLabel: string | null;
    readonly targetingPhase: RobotTargetingPhase; readonly targetLossSeconds: number;
    readonly attackPhase: RobotAttackPhase; readonly attackElapsedSeconds: number;
    readonly attackRemainingSeconds: number; readonly attackDurationSeconds: number;
}

export class Robot extends Entity {
    private readonly spawnX: number;
    private readonly spawnY: number;
    private readonly visualRoot = new Container();
    private readonly obstacleAvoidance: RobotObstacleAvoidance;
    private bodySprite: Sprite | null = null;
    private leg1Sprite: Sprite | null = null;
    private leg2Sprite: Sprite | null = null;
    private locomotion: RobotLocomotionController | null = null;
    private state: RobotMovementState = "WAITING";
    private destination: RobotNavigationPoint | null = null;
    private waitRemainingSeconds = 0;
    private lastDestinationAttempts = 0;
    private roamCenterX: number;
    private roamCenterY: number;
    private avoidanceProbePoint: RobotNavigationPoint | null = null;
    private avoidingObstacle = false;
    private avoidanceTurnDegrees = 0;
    private stuckSeconds = 0;
    private progressAnchorDistance: number | null = null;
    private abandonedDestinations = 0;
    private headingErrorDegrees = 0;
    private readonly visionSystem: RobotVisionSystem;
    private readonly targetingController: RobotTargetingController;
    private readonly attackController: RobotAttackController;
    private visionCandidates: readonly RobotVisionCandidate[] = [];
    private detectedTargetId: string | null = null;
    private detectedTargetLabel: string | null = null;

    public constructor(
        private readonly definition: RobotDefinition,
        private readonly navigationQuery: RobotNavigationQuery,
        interactionRegistry: RobotInteractionRegistry,
    ) {
        super();
        this.spawnX = definition.positionX;
        this.spawnY = definition.positionY;
        this.roamCenterX = definition.positionX;
        this.roamCenterY = definition.positionY;
        this.obstacleAvoidance = new RobotObstacleAvoidance(navigationQuery);
        this.visionSystem = new RobotVisionSystem(new RobotTargetQuery(interactionRegistry), interactionRegistry);
        this.targetingController = new RobotTargetingController(
            definition.targetAlignmentToleranceDegrees, definition.targetLossGraceSeconds,
        );
        this.attackController = new RobotAttackController(definition.attackDurationSeconds);
    }

    public getForwardX(): number { return Math.cos(this.visualRoot.rotation); }
    public getForwardY(): number { return Math.sin(this.visualRoot.rotation); }

    public getDebugSnapshot(): RobotDebugSnapshot {
        const distanceToDestination = this.destination
            ? Math.hypot(this.destination.x - this.getX(), this.destination.y - this.getY()) : null;
        const attack = this.attackController.getSnapshot();
        return {
            id: this.definition.id, state: this.state, x: this.getX(), y: this.getY(),
            rotationRadians: this.visualRoot.rotation, roamCenterX: this.roamCenterX,
            roamCenterY: this.roamCenterY, roamRadius: this.definition.roamRadius,
            clearanceRadius: this.getClearanceRadius(), destination: this.destination,
            distanceToDestination, waitRemainingSeconds: this.waitRemainingSeconds,
            lastDestinationAttempts: this.lastDestinationAttempts,
            avoidanceProbePoint: this.avoidanceProbePoint, avoidingObstacle: this.avoidingObstacle,
            avoidanceTurnDegrees: this.avoidanceTurnDegrees, stuckSeconds: this.stuckSeconds,
            abandonedDestinations: this.abandonedDestinations,
            locomotionPhase: this.locomotion?.getPhase() ?? "PLANTED",
            activeLeg: this.locomotion?.getActiveLeg() ?? 0,
            headingErrorDegrees: this.headingErrorDegrees,
            visionRange: this.definition.visionRange, visionHalfAngleDegrees: this.definition.visionHalfAngleDegrees,
            visionCandidates: this.visionCandidates, detectedTargetId: this.detectedTargetId, detectedTargetLabel: this.detectedTargetLabel,
            targetingPhase: this.targetingController.getPhase(), targetLossSeconds: this.targetingController.getTargetLossSeconds(),
            attackPhase: attack.phase, attackElapsedSeconds: attack.elapsedSeconds,
            attackRemainingSeconds: attack.remainingSeconds, attackDurationSeconds: attack.durationSeconds,
        };
    }

    protected onInitialize(): void {
        this.setPosition(this.spawnX, this.spawnY);
        this.leg1Sprite = new Sprite(AssetLoader.getTexture("fireRobotLeg1"));
        this.leg2Sprite = new Sprite(AssetLoader.getTexture("fireRobotLeg2"));
        this.bodySprite = new Sprite(AssetLoader.getTexture("fireRobotBody"));
        this.bodySprite.anchor.set(0.5);
        this.bodySprite.width = this.definition.bodyWidth;
        this.bodySprite.scale.y = this.bodySprite.scale.x;
        for (const leg of [this.leg1Sprite, this.leg2Sprite]) {
            leg.anchor.set(0.5);
            leg.scale.set(this.definition.legScale);
        }
        this.leg1Sprite.position.set(this.definition.legOffsetX, -this.definition.legOffsetY);
        this.leg2Sprite.position.set(this.definition.legOffsetX, this.definition.legOffsetY);
        this.visualRoot.addChild(this.leg1Sprite, this.leg2Sprite, this.bodySprite);
        this.container.addChild(this.visualRoot);
        this.locomotion = new RobotLocomotionController(
            this.leg1Sprite, this.leg2Sprite,
            this.definition.legOffsetX, -this.definition.legOffsetY,
            this.definition.legOffsetX, this.definition.legOffsetY,
            this.definition.stepDistance, this.definition.legReachSeconds,
            this.definition.bodyCatchupSeconds,
        );
        this.beginWaiting(0);
    }

    protected onUpdate(deltaTime: number): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;
        this.obstacleAvoidance.update(deltaTime);
        const vision = this.visionSystem.scan(this.getX(), this.getY(), this.getForwardX(), this.getForwardY(), this.definition.visionRange, this.definition.visionHalfAngleDegrees, this.definition.id);
        this.visionCandidates = vision.candidates;

        this.attackController.releaseSuppressionIfAbsent(vision.selectedTarget?.id ?? null);
        const perceivedTarget = vision.selectedTarget && !this.attackController.isSuppressed(vision.selectedTarget.id)
            ? vision.selectedTarget : null;
        const targeting = this.targetingController.update(
            deltaTime, perceivedTarget, this.getX(), this.getY(), this.visualRoot.rotation,
        );
        this.detectedTargetId = targeting.target?.id ?? null;
        this.detectedTargetLabel = targeting.target?.label ?? null;

        if (this.state === "ATTACKING") {
            if (targeting.target && targeting.desiredAngle !== null) {
                this.updateAttackTracking(deltaTime, targeting.desiredAngle, targeting.headingErrorDegrees);
                return;
            }
            // The R-5 loss grace still applies. If it expires, cancel the timer
            // and return to wandering rather than attacking empty space.
            this.attackController.reset();
            this.destination = null;
            this.headingErrorDegrees = 0;
            this.resetAvoidanceState();
            this.beginWaiting(0);
        }

        if (targeting.target && targeting.desiredAngle !== null) {
            this.updateTargeting(deltaTime, targeting.desiredAngle, targeting.headingErrorDegrees);
            return;
        }

        // Target was released after the loss grace period. Start a fresh wander
        // decision instead of resuming a half-completed pre-detection step.
        if (this.state === "DETECTING" || this.state === "TARGET_LOCKED") {
            this.destination = null;
            this.headingErrorDegrees = 0;
            this.resetAvoidanceState();
            this.beginWaiting(0);
        }

        if (this.state === "WAITING") this.updateWaiting(deltaTime);
        else if (this.state === "TURNING") this.updateTurning(deltaTime);
        else this.updateWandering(deltaTime);
    }

    protected onDestroy(): void {
        this.locomotion = null; this.bodySprite = null; this.leg1Sprite = null; this.leg2Sprite = null;
        this.container.destroy({ children: true });
    }


    private updateTargeting(deltaTime: number, desiredAngle: number, headingErrorDegrees: number): void {
        this.locomotion?.plantForTargeting();
        this.resetAvoidanceState();
        this.headingErrorDegrees = headingErrorDegrees;
        if (headingErrorDegrees <= this.definition.targetAlignmentToleranceDegrees) {
            this.visualRoot.rotation = desiredAngle;
            this.headingErrorDegrees = 0;
            this.state = "TARGET_LOCKED";
            const target = this.targetingController.getTarget();
            if (target) {
                this.attackController.start(target.id);
                this.state = "ATTACKING";
            }
            return;
        }
        this.state = "DETECTING";
        this.rotateTowardsAtSpeed(desiredAngle, deltaTime, this.definition.targetTurnSpeedRadiansPerSecond);
    }

    private updateAttackTracking(deltaTime: number, desiredAngle: number, headingErrorDegrees: number): void {
        this.locomotion?.plantForTargeting();
        this.resetAvoidanceState();
        this.headingErrorDegrees = headingErrorDegrees;
        this.rotateTowardsAtSpeed(desiredAngle, deltaTime, this.definition.targetTurnSpeedRadiansPerSecond);
        if (headingErrorDegrees <= this.definition.targetAlignmentToleranceDegrees) {
            this.visualRoot.rotation = desiredAngle;
            this.headingErrorDegrees = 0;
        }
        if (!this.attackController.update(deltaTime)) return;

        // R-6 has no elemental output and no cooldown yet. Finish the timed
        // commitment, release the target, and request a fresh wander cycle.
        this.targetingController.clear();
        this.destination = null;
        this.headingErrorDegrees = 0;
        this.resetAvoidanceState();
        this.beginWaiting(0);
    }

    private updateWaiting(deltaTime: number): void {
        this.locomotion?.reset();
        this.waitRemainingSeconds = Math.max(0, this.waitRemainingSeconds - deltaTime);
        if (this.waitRemainingSeconds > 0) return;
        if (!this.selectDestination()) { this.beginWaiting(0.5); return; }
        this.state = "TURNING";
    }

    private updateTurning(deltaTime: number): void {
        this.locomotion?.reset();
        if (!this.destination) { this.beginWaiting(0.5); return; }
        const dx = this.destination.x - this.getX();
        const dy = this.destination.y - this.getY();
        const distance = Math.hypot(dx, dy);
        if (distance <= this.definition.arrivalTolerance) {
            this.arriveAtDestination(); return;
        }
        const desiredAngle = Math.atan2(dy, dx);
        this.headingErrorDegrees = Math.abs(this.shortestAngle(desiredAngle - this.visualRoot.rotation)) * 180 / Math.PI;
        this.rotateTowards(desiredAngle, deltaTime);
        if (this.headingErrorDegrees <= this.definition.turnAlignmentToleranceDegrees) {
            this.visualRoot.rotation = desiredAngle;
            this.headingErrorDegrees = 0;
            this.state = "WANDERING";
        }
    }

    private updateWandering(deltaTime: number): void {
        if (!this.destination) { this.beginWaiting(0.5); return; }
        const dx = this.destination.x - this.getX();
        const dy = this.destination.y - this.getY();
        const distance = Math.hypot(dx, dy);
        if (distance <= this.definition.arrivalTolerance) { this.arriveAtDestination(); return; }

        this.updateProgressWatch(distance, deltaTime);
        if (this.stuckSeconds >= this.definition.stuckTimeoutSeconds) {
            this.abandonedDestinations += 1; this.destination = null;
            this.resetAvoidanceState(); this.locomotion?.reset(); this.beginWaiting(0.35); return;
        }

        const desiredX = dx / distance;
        const desiredY = dy / distance;
        const steering = this.obstacleAvoidance.chooseDirection(
            this.getX(), this.getY(), desiredX, desiredY, this.getClearanceRadius(),
            this.definition.avoidanceProbeDistance, this.definition.avoidanceProbeStepDegrees,
            this.definition.avoidanceMaximumTurnDegrees, this.definition.avoidanceCommitSeconds,
            this.definition.avoidanceReleaseClearFrames,
        );
        if (!steering) {
            this.stuckSeconds += deltaTime; this.avoidanceProbePoint = null;
            this.avoidingObstacle = true; this.locomotion?.reset(); return;
        }

        this.avoidanceProbePoint = steering.probePoint;
        this.avoidingObstacle = steering.avoiding;
        this.avoidanceTurnDegrees = steering.turnDegrees;

        const steeringAngle = Math.atan2(steering.directionY, steering.directionX);
        this.headingErrorDegrees = Math.abs(this.shortestAngle(steeringAngle - this.visualRoot.rotation)) * 180 / Math.PI;
        this.rotateTowards(steeringAngle, deltaTime);

        // While avoidance bends the route, let the body smoothly steer into it.
        // Movement waits until the chassis is reasonably aligned, preventing sideways sliding.
        if (this.headingErrorDegrees > this.definition.turnAlignmentToleranceDegrees * 2.5) {
            this.locomotion?.reset(); return;
        }

        const locomotion = this.locomotion;
        if (!locomotion) return;
        const allowedDistance = Math.min(distance, this.definition.stepDistance);
        const advance = locomotion.update(deltaTime, allowedDistance);
        if (advance.distance <= 0) return;

        const moveX = Math.cos(this.visualRoot.rotation);
        const moveY = Math.sin(this.visualRoot.rotation);
        const nextX = this.getX() + moveX * advance.distance;
        const nextY = this.getY() + moveY * advance.distance;
        if (this.navigationQuery.isPositionClear(nextX, nextY, this.definition.navigationRadius)) {
            this.translate(moveX * advance.distance, moveY * advance.distance);
        } else {
            this.stuckSeconds += deltaTime;
            this.locomotion.reset();
        }
    }

    private selectDestination(): boolean {
        this.roamCenterX = this.getX(); this.roamCenterY = this.getY();
        const result = this.navigationQuery.findDestination(
            this.roamCenterX, this.roamCenterY, this.definition.roamRadius,
            this.getClearanceRadius(), this.definition.destinationAttempts,
        );
        this.lastDestinationAttempts = result.attempts; this.destination = result.point;
        this.resetAvoidanceState();
        if (this.destination) this.progressAnchorDistance = Math.hypot(
            this.destination.x - this.getX(), this.destination.y - this.getY(),
        );
        return this.destination !== null;
    }

    private arriveAtDestination(): void {
        if (this.destination) this.setPosition(this.destination.x, this.destination.y);
        this.destination = null; this.headingErrorDegrees = 0;
        this.resetAvoidanceState(); this.locomotion?.reset();
        this.beginWaiting(this.randomWaitDuration());
    }

    private rotateTowards(targetAngle: number, deltaTime: number): void {
        this.rotateTowardsAtSpeed(targetAngle, deltaTime, this.definition.turnSpeedRadiansPerSecond);
    }

    private rotateTowardsAtSpeed(targetAngle: number, deltaTime: number, speedRadiansPerSecond: number): void {
        const difference = this.shortestAngle(targetAngle - this.visualRoot.rotation);
        const maximum = speedRadiansPerSecond * deltaTime;
        this.visualRoot.rotation += Math.max(-maximum, Math.min(maximum, difference));
    }

    private shortestAngle(angle: number): number {
        return Math.atan2(Math.sin(angle), Math.cos(angle));
    }

    private updateProgressWatch(distance: number, deltaTime: number): void {
        if (this.progressAnchorDistance === null) { this.progressAnchorDistance = distance; return; }
        if (this.progressAnchorDistance - distance >= this.definition.stuckMinimumProgress) {
            this.progressAnchorDistance = distance; this.stuckSeconds = 0;
        } else this.stuckSeconds += deltaTime;
    }

    private resetAvoidanceState(): void {
        this.avoidanceProbePoint = null; this.avoidingObstacle = false; this.avoidanceTurnDegrees = 0;
        this.stuckSeconds = 0; this.progressAnchorDistance = null; this.obstacleAvoidance.reset();
    }
    private getClearanceRadius(): number { return this.definition.navigationRadius + this.definition.destinationClearancePadding; }
    private beginWaiting(durationSeconds: number): void { this.state = "WAITING"; this.waitRemainingSeconds = Math.max(0, durationSeconds); }
    private randomWaitDuration(): number {
        return this.definition.waitMinimumSeconds + Math.random() * Math.max(0, this.definition.waitMaximumSeconds - this.definition.waitMinimumSeconds);
    }
}
