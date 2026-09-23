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
import { RobotFireAttackController } from "./RobotFireAttackController";
import { RobotWaterAttackController } from "./RobotWaterAttackController";
import { RobotWindAttackController } from "./RobotWindAttackController";
import { RobotLedDisplay, type RobotLedState } from "./RobotLedDisplay";
import type { FireSourceSystem } from "../../environment/FireSourceSystem";
import type { WaterSourceSystem } from "../../environment/WaterSourceSystem";
import type { LocalWindSystem } from "../../environment/LocalWindSystem";
import type { DynamicObstacleDefinition } from "../../config/ObstacleDefinition";
import type { DynamicCollidableImpact } from "../../physics/DynamicCollidable";
import { RobotImpactReactionController } from "./RobotImpactReactionController";
import { RigidBody2D } from "../../physics/RigidBody2D";

export type RobotMovementState = "WAITING" | "TURNING" | "WANDERING" | "DETECTING" | "TARGET_LOCKED" | "WARNING" | "ATTACKING";

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
    readonly cooldownElapsedSeconds: number; readonly cooldownRemainingSeconds: number;
    readonly cooldownDurationSeconds: number; readonly attackReady: boolean;
    readonly warningActive: boolean; readonly warningElapsedSeconds: number;
    readonly warningRemainingSeconds: number; readonly warningDurationSeconds: number;
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
    private readonly elementAttackController: RobotFireAttackController | RobotWaterAttackController | RobotWindAttackController;
    private readonly externalRigidBody: RigidBody2D;
    private lastCommittedTargetX: number | null = null;
    private lastCommittedTargetY: number | null = null;
    private readonly ledDisplay: RobotLedDisplay;
    private readonly impactReactionController: RobotImpactReactionController;
    private visionCandidates: readonly RobotVisionCandidate[] = [];
    private detectedTargetId: string | null = null;
    private detectedTargetLabel: string | null = null;

    public constructor(
        private readonly definition: RobotDefinition,
        private readonly navigationQuery: RobotNavigationQuery,
        interactionRegistry: RobotInteractionRegistry,
        fireSourceSystem: FireSourceSystem,
        waterSourceSystem: WaterSourceSystem,
        localWindSystem: LocalWindSystem,
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
        this.attackController = new RobotAttackController(
            definition.attackDurationSeconds, definition.attackCooldownSeconds,
        );
        this.elementAttackController = definition.element === "water"
            ? new RobotWaterAttackController(
                definition.id, waterSourceSystem, definition.waterOutletOffset, definition.attackWarningDurationSeconds,
            )
            : definition.element === "wind"
                ? new RobotWindAttackController(
                    definition.id, localWindSystem, definition.windOutletOffset, definition.attackWarningDurationSeconds,
                )
                : new RobotFireAttackController(
                    definition.id, fireSourceSystem, definition.fireOutletOffset, definition.attackWarningDurationSeconds,
                );
        this.ledDisplay = new RobotLedDisplay(
            definition.ledScreenDiameter,
            definition.ledColor,
        );
        this.impactReactionController = new RobotImpactReactionController(
            definition.impactReactionDurationSeconds,
            definition.impactScanAngleDegrees * Math.PI / 180,
        );
        const externalMass = definition.externalForceMass;
        this.externalRigidBody = new RigidBody2D({
            bodyType: "dynamic",
            mass: externalMass,
            linearDamping: 4.5,
            angularDamping: 8,
            sleepLinearSpeedThreshold: 2,
            sleepAngularSpeedThreshold: 0.05,
            sleepDelay: 0.2,
            maximumLinearSpeed: 180,
            maximumAngularSpeed: Math.PI * 1.5,
        }, 0.5 * externalMass * definition.navigationRadius * definition.navigationRadius);
    }


    public getWaterAttackSource(): RobotWaterAttackController | null {
        return this.elementAttackController instanceof RobotWaterAttackController
            ? this.elementAttackController
            : null;
    }

    public getForwardX(): number { return Math.cos(this.visualRoot.rotation); }
    public getForwardY(): number { return Math.sin(this.visualRoot.rotation); }

    // R-9 kinematic Robot collider. It can deflect dynamic bodies but never
    // receives physical displacement or damage from the collision response.
    public getDefinition(): DynamicObstacleDefinition {
        return {
            id: `${this.definition.id}-collider`,
            shape: "circle",
            positionX: this.getX(),
            positionY: this.getY(),
            rotationRadians: this.getRotationRadians(),
            radius: this.definition.navigationRadius,
            fillColor: 0xffffff,
            outlineColor: 0x000000,
            outlineWidth: 0,
            material: { restitution: 0.62, friction: 0.18 },
            rigidBody: {
                bodyType: "dynamic",
                mass: this.definition.externalForceMass,
                linearDamping: 4.5,
                angularDamping: 8,
                sleepLinearSpeedThreshold: 2,
                sleepAngularSpeedThreshold: 0.05,
                sleepDelay: 0.2,
                maximumLinearSpeed: 180,
                maximumAngularSpeed: Math.PI * 1.5,
            },
        };
    }
    public getRotationRadians(): number { return this.visualRoot.rotation; }
    public getVelocityX(): number { return this.externalRigidBody.getVelocityX(); }
    public getVelocityY(): number { return this.externalRigidBody.getVelocityY(); }
    public getAngularVelocity(): number { return this.externalRigidBody.getAngularVelocity(); }
    public getInverseMass(): number { return this.externalRigidBody.getInverseMass(); }
    public getInverseMomentOfInertia(): number { return this.externalRigidBody.getInverseMomentOfInertia(); }
    public applyImpulseAtWorldPoint(
        impulseX: number, impulseY: number, contactPointX: number, contactPointY: number,
    ): void {
        this.externalRigidBody.applyImpulseAtWorldPoint(
            impulseX, impulseY, contactPointX - this.getX(), contactPointY - this.getY(),
        );
    }
    public translate(deltaX: number, deltaY: number): void {
        // Locomotion uses this same transform operation. Collision response will
        // supply zero displacement because inverse mass is zero.
        this.setPosition(this.getX() + deltaX, this.getY() + deltaY);
    }

    /** Shared impact-awareness entry point used identically by every Robot element.
     * Physical collision routing is external; once reported here, Fire/Water use
     * the exact same attention, turn and scan state machine. */
    public notifyExternalImpact(impact: DynamicCollidableImpact): void {
        // Always observe the source first. Continuous Water/Wind contacts keep
        // the same episode alive even while the Robot is busy, so they cannot
        // immediately retrigger another scan when the current one finishes.
        const isNewContactEpisode = this.impactReactionController.observeContact(
            impact.sourceKind,
            impact.sourceId,
        );

        if (
            !isNewContactEpisode ||
            !this.attackController.isReady() ||
            this.impactReactionController.isActive() ||
            this.state === "ATTACKING" ||
            this.state === "WARNING"
        ) return;
        this.targetingController.clear();
        this.destination = null;
        this.locomotion?.plantForTargeting();
        this.resetAvoidanceState();
        this.impactReactionController.begin(
            this.getX(), this.getY(), impact.positionX, impact.positionY,
        );
    }

    public getDebugSnapshot(): RobotDebugSnapshot {
        const distanceToDestination = this.destination
            ? Math.hypot(this.destination.x - this.getX(), this.destination.y - this.getY()) : null;
        const attack = this.attackController.getSnapshot();
        const fireWarning = this.elementAttackController.getSnapshot();
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
            cooldownElapsedSeconds: attack.cooldownElapsedSeconds, cooldownRemainingSeconds: attack.cooldownRemainingSeconds,
            cooldownDurationSeconds: attack.cooldownDurationSeconds, attackReady: attack.ready,
            warningActive: fireWarning.warningActive, warningElapsedSeconds: fireWarning.warningElapsedSeconds,
            warningRemainingSeconds: fireWarning.warningRemainingSeconds, warningDurationSeconds: fireWarning.warningDurationSeconds,
        };
    }

    protected onInitialize(): void {
        this.setPosition(this.spawnX, this.spawnY);
        this.leg1Sprite = new Sprite(AssetLoader.getTexture(this.definition.leg1TextureKey));
        this.leg2Sprite = new Sprite(AssetLoader.getTexture(this.definition.leg2TextureKey));
        this.bodySprite = new Sprite(AssetLoader.getTexture(this.definition.bodyTextureKey));
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
        // The source body already contains the circular black LED surface.
        // Draw the UI over that surface, without creating a second screen.
        this.visualRoot.addChild(this.ledDisplay.getContainer());
        this.container.addChild(this.visualRoot);
        this.locomotion = new RobotLocomotionController(
            this.leg1Sprite, this.leg2Sprite,
            this.definition.legOffsetX, -this.definition.legOffsetY,
            this.definition.legOffsetX, this.definition.legOffsetY,
            this.definition.stepDistance, this.definition.legReachSeconds,
            this.definition.bodyCatchupSeconds,
        );
        this.beginWaiting(0);
        this.elementAttackController.initialize(this.getX(), this.getY(), this.visualRoot.rotation);
    }

    protected onUpdate(deltaTime: number): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;
        const externalMotion = this.externalRigidBody.integrate(deltaTime);
        if (externalMotion.positionDeltaX !== 0 || externalMotion.positionDeltaY !== 0) {
            this.setPosition(
                this.getX() + externalMotion.positionDeltaX,
                this.getY() + externalMotion.positionDeltaY,
            );
        }
        this.obstacleAvoidance.update(deltaTime);
        this.attackController.updateCooldown(deltaTime);
        this.impactReactionController.updateContactEpisodes(deltaTime);
        this.synchronizeElementAttack();

        if (this.impactReactionController.isActive()) {
            if (this.updateImpactReaction(deltaTime)) {
                this.updateLedDisplay(deltaTime);
                return;
            }
        }

        const vision = this.visionSystem.scan(this.getX(), this.getY(), this.getForwardX(), this.getForwardY(), this.definition.visionRange, this.definition.visionHalfAngleDegrees, this.definition.id);
        this.visionCandidates = vision.candidates;

        // During cooldown perception still runs for debug/awareness, but it cannot
        // interrupt locomotion. An active attack keeps tracking its committed target.
        const perceivedTarget = this.state === "ATTACKING" || this.attackController.isReady()
            ? vision.selectedTarget
            : null;
        const targeting = this.targetingController.update(
            deltaTime, perceivedTarget, this.getX(), this.getY(), this.visualRoot.rotation,
        );
        this.detectedTargetId = targeting.target?.id ?? null;
        this.detectedTargetLabel = targeting.target?.label ?? null;
        if (this.state === "ATTACKING" && perceivedTarget) {
            this.lastCommittedTargetX = perceivedTarget.getX();
            this.lastCommittedTargetY = perceivedTarget.getY();
        }

        if (this.state === "WARNING") {
            if (targeting.target && targeting.desiredAngle !== null) {
                this.updateWarning(deltaTime, targeting.desiredAngle, targeting.headingErrorDegrees);
                this.updateLedDisplay(deltaTime);
                return;
            }
            this.elementAttackController.cancelWarning();
            this.destination = null;
            this.headingErrorDegrees = 0;
            this.resetAvoidanceState();
            this.beginWaiting(0);
        }

        if (this.state === "ATTACKING") {
            const committedDirectionalAttack =
                (this.elementAttackController instanceof RobotWaterAttackController ||
                    this.elementAttackController instanceof RobotWindAttackController) &&
                this.elementAttackController.continuesAttackAfterTargetLoss();

            // Committed Water/Wind attacks track only while the target is actually visible. The generic
            // targeting controller may retain a lost target for its grace window,
            // but committed attacks freeze at the last in-cone world point.
            if (
                targeting.target && targeting.desiredAngle !== null &&
                (!committedDirectionalAttack || perceivedTarget !== null)
            ) {
                this.updateAttackTracking(deltaTime, targeting.desiredAngle, targeting.headingErrorDegrees);
                this.updateLedDisplay(deltaTime);
                return;
            }

            // Water and Wind are committed directional attacks. Once firing begins they
            // completes the full authored duration. If perception is lost, keep
            // aiming at the last point at which the target was actually visible.
            if (
                committedDirectionalAttack &&
                this.lastCommittedTargetX !== null &&
                this.lastCommittedTargetY !== null
            ) {
                const desiredAngle = Math.atan2(
                    this.lastCommittedTargetY - this.getY(),
                    this.lastCommittedTargetX - this.getX(),
                );
                const error = Math.atan2(
                    Math.sin(desiredAngle - this.visualRoot.rotation),
                    Math.cos(desiredAngle - this.visualRoot.rotation),
                );
                this.updateAttackTracking(deltaTime, desiredAngle, Math.abs(error) * 180 / Math.PI);
                this.updateLedDisplay(deltaTime);
                return;
            }

            // Fire retains the existing target-loss cancellation behaviour.
            this.attackController.cancelAttack();
            this.destination = null;
            this.headingErrorDegrees = 0;
            this.resetAvoidanceState();
            this.beginWaiting(0);
        }

        if (targeting.target && targeting.desiredAngle !== null) {
            this.updateTargeting(deltaTime, targeting.desiredAngle, targeting.headingErrorDegrees);
            this.updateLedDisplay(deltaTime);
            return;
        }

        // Target was released after the loss grace period. Start a fresh wander
        // decision instead of resuming a half-completed pre-detection step.
        if (this.state === "DETECTING" || this.state === "TARGET_LOCKED" || this.state === "WARNING") {
            this.destination = null;
            this.headingErrorDegrees = 0;
            this.resetAvoidanceState();
            this.beginWaiting(0);
        }

        if (this.state === "WAITING") this.updateWaiting(deltaTime);
        else if (this.state === "TURNING") this.updateTurning(deltaTime);
        else this.updateWandering(deltaTime);

        this.updateLedDisplay(deltaTime);
    }

    protected onDestroy(): void {
        this.elementAttackController.destroy();
        this.ledDisplay.destroy();
        this.locomotion = null; this.bodySprite = null; this.leg1Sprite = null; this.leg2Sprite = null;
        this.container.destroy({ children: true });
    }


    private updateImpactReaction(deltaTime: number): boolean {
        // Cooldown always wins. An impact received immediately before cooldown
        // begins is discarded rather than delaying normal locomotion.
        if (!this.attackController.isReady()) {
            this.impactReactionController.clear();
            return false;
        }

        this.locomotion?.plantForTargeting();
        this.destination = null;
        this.resetAvoidanceState();

        if (this.impactReactionController.getPhase() === "TURN_TO_IMPACT") {
            const desired = this.impactReactionController.getImpactHeadingRadians();
            const error = Math.abs(this.shortestAngle(desired - this.visualRoot.rotation));
            this.headingErrorDegrees = error * 180 / Math.PI;
            this.rotateTowardsAtSpeed(desired, deltaTime, this.definition.impactTurnSpeedRadiansPerSecond);
            if (this.headingErrorDegrees <= this.definition.targetAlignmentToleranceDegrees) {
                this.visualRoot.rotation = desired;
                this.headingErrorDegrees = 0;
                this.impactReactionController.markFacingImpact();
            }
            return true;
        }

        const heading = this.impactReactionController.getScanHeadingRadians();
        this.visualRoot.rotation = heading;
        const vision = this.visionSystem.scanHeading(
            this.getX(), this.getY(), heading, this.definition.visionRange,
            this.definition.visionHalfAngleDegrees, this.definition.id,
        );
        this.visionCandidates = vision.candidates;

        if (vision.selectedTarget) {
            this.impactReactionController.clear();
            const targeting = this.targetingController.update(
                deltaTime, vision.selectedTarget, this.getX(), this.getY(), this.visualRoot.rotation,
            );
            this.detectedTargetId = targeting.target?.id ?? null;
            this.detectedTargetLabel = targeting.target?.label ?? null;
            if (targeting.target && targeting.desiredAngle !== null) {
                this.updateTargeting(deltaTime, targeting.desiredAngle, targeting.headingErrorDegrees);
            }
            return true;
        }

        if (this.impactReactionController.updateScan(deltaTime)) {
            this.headingErrorDegrees = 0;
            this.beginWaiting(0);
            return false;
        }
        return true;
    }



    private synchronizeElementAttack(): void {
        this.elementAttackController.update(
            this.getX(),
            this.getY(),
            this.visualRoot.rotation,
            this.attackController.getSnapshot().phase === "ATTACKING",
        );
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
            if (target && this.attackController.isReady()) {
                if (this.elementAttackController.startWarning(target.id)) {
                    this.state = "WARNING";
                    this.synchronizeElementAttack();
                }
            }
            return;
        }
        this.state = "DETECTING";
        this.rotateTowardsAtSpeed(desiredAngle, deltaTime, this.definition.targetTurnSpeedRadiansPerSecond);
    }

    private updateWarning(deltaTime: number, desiredAngle: number, headingErrorDegrees: number): void {
        this.locomotion?.plantForTargeting();
        this.resetAvoidanceState();
        this.headingErrorDegrees = headingErrorDegrees;
        this.rotateTowardsAtSpeed(desiredAngle, deltaTime, this.definition.targetTurnSpeedRadiansPerSecond);
        if (headingErrorDegrees > this.definition.targetAlignmentToleranceDegrees) return;

        this.visualRoot.rotation = desiredAngle;
        this.headingErrorDegrees = 0;
        if (!this.elementAttackController.updateWarning(deltaTime)) return;

        const target = this.targetingController.getTarget();
        if (!target || !this.attackController.start(target.id)) {
            this.elementAttackController.cancelWarning();
            this.targetingController.clear();
            this.destination = null;
            this.beginWaiting(0);
            return;
        }

        this.lastCommittedTargetX = target.getX();
        this.lastCommittedTargetY = target.getY();
        this.state = "ATTACKING";
        this.synchronizeElementAttack();
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
        this.synchronizeElementAttack();
        if (!this.attackController.updateAttack(deltaTime)) return;
        this.synchronizeElementAttack();

        // R-7 begins cooldown inside the attack controller, but locomotion resumes
        // immediately. Perception continues while target acquisition is gated.
        this.targetingController.clear();
        this.lastCommittedTargetX = null;
        this.lastCommittedTargetY = null;
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

    private updateLedDisplay(deltaTime: number): void {
        const attack = this.attackController.getSnapshot();
        const ledState = this.getLedState(attack.phase);

        this.ledDisplay.update(deltaTime, {
            state: ledState,
            cooldownElapsedSeconds: attack.cooldownElapsedSeconds,
            cooldownDurationSeconds: attack.cooldownDurationSeconds,
        });
    }

    private getLedState(attackPhase: RobotAttackPhase): RobotLedState {
        if (attackPhase === "ATTACKING") return "ATTACKING";
        if (attackPhase === "COOLDOWN") return "COOLDOWN";

        // TARGET_LOCKED and WARNING share the same warning presentation.
        if (
            this.impactReactionController.isActive() ||
            this.state === "TARGET_LOCKED" ||
            this.state === "WARNING"
        ) {
            return "WARNING";
        }

        return "WANDERING";
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
