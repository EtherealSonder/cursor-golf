import {
    Container,
    Graphics,
} from "pixi.js";

import {
    DEFAULT_BALL_PHYSICS_DEFINITION,
} from "../config/BallPhysicsDefinition";

import {
    DEFAULT_COURSE_BOUNDARY_DEFINITION,
} from "../config/CourseBoundaryDefinition";

import {
    DEFAULT_GAME_VIEWPORT_DEFINITION,
} from "../config/GameViewportDefinition";

import type {
    BallPhysicsDefinition,
} from "../config/BallPhysicsDefinition";

import type {
    CourseBoundaryDefinition,
} from "../config/CourseBoundaryDefinition";

import type {
    StaticObstacleDefinition,
} from "../config/ObstacleDefinition";

import type {
    DynamicCollisionManifold,
} from "../physics/DynamicCollisionManifold";

import {
    detectBallDynamicObstacleCollision,
    detectBallObstacleCollision,
} from "../physics/StaticObstacleCollision";

import {
    resolveDynamicCollision,
} from "../physics/DynamicCollisionResponse";

import type {
    DynamicCollisionBody,
} from "../physics/DynamicCollisionResponse";

import {
    combineFriction,
    combineRestitution,
} from "../physics/PhysicsMaterial";

import type {
    CollisionManifold,
} from "../physics/CollisionManifold";

import type {
    WindManager,
} from "../environment/WindManager";

import type {
    LocalWindSystem,
} from "../environment/LocalWindSystem";

import type {
    SurfaceSystem,
} from "../surface/SurfaceSystem";

import { Entity } from "./Entity";

import type {
    DynamicObstacle,
} from "./obstacles/DynamicObstacle";

export enum BallInteractionState {
    Normal,
    Hovered,
    Dragging,
}

export enum BallMotionState {
    Stationary,
    Moving,
}

export enum BallGameplayState {
    Active,
    HoleCapture,
    Holed,
}

export type BallImpactType =
    | "course-boundary"
    | "static-obstacle"
    | "dynamic-obstacle";

export interface BallImpactEvent {

    readonly type:
    BallImpactType;

    readonly impactSpeed:
    number;

    readonly resultingSpeed:
    number;
}

export type BallImpactListener = (
    event:
        BallImpactEvent,
) => void;

interface BoundaryCollisionResult {
    readonly collidedLeft: boolean;
    readonly collidedRight: boolean;
    readonly collidedTop: boolean;
    readonly collidedBottom: boolean;
}

export class Ball extends Entity {

    private visualContainer:
        Container | null = null;

    private ballGraphics:
        Graphics | null = null;

    private readonly radius = 10;

    private readonly ballColor =
        0xffffff;

    private readonly physicsDefinition:
        BallPhysicsDefinition;

    private readonly courseBoundaryDefinition:
        CourseBoundaryDefinition;

    private readonly staticObstacleDefinitions:
        readonly StaticObstacleDefinition[];

    private readonly dynamicObstacles:
        readonly DynamicObstacle[];

    private readonly windManager:
        WindManager;

    /**
     * Shared authoritative local-airflow query owned
     * by World.
     */
    private readonly localWindSystem:
        LocalWindSystem;

    /**
     * Shared authoritative terrain query owned by
     * World.
     *
     * The Ball consumes resolved physical properties
     * and does not branch on Grass/Sand identity.
     */
    private readonly surfaceSystem:
        SurfaceSystem;

    private motionState =
        BallMotionState.Stationary;

    private gameplayState =
        BallGameplayState.Active;

    private velocityX = 0;
    private velocityY = 0;

    private launchPositionX = 0;
    private launchPositionY = 0;

    private mostRecentLaunchSpeed = 0;

    private mostRecentLaunchDirectionRadians = 0;

    private movementElapsedTime = 0;

    private movementDistanceTravelled = 0;

    private boundaryCollisionCount = 0;

    private obstacleCollisionCount = 0;

    private restStabilityElapsedTime = 0;

    private readonly impactListeners:
        Set<BallImpactListener> =
        new Set<BallImpactListener>();

    private interactionState =
        BallInteractionState.Normal;

    private readonly normalScale = 1;

    private readonly interactionScale = 1.12;

    private readonly scaleResponseSpeed = 12;

    private currentVisualScale =
        this.normalScale;

    private targetVisualScale =
        this.normalScale;

    private tensionPower = 0;

    private vibrationTime = 0;

    private readonly minimumVibrationFrequency = 3;

    private readonly maximumVibrationFrequency = 18;

    private readonly maximumVibrationAmplitude = 1.5;

    private readonly secondaryFrequencyRatio = 1.37;

    constructor(
        physicsDefinition:
            BallPhysicsDefinition =
            DEFAULT_BALL_PHYSICS_DEFINITION,

        courseBoundaryDefinition:
            CourseBoundaryDefinition =
            DEFAULT_COURSE_BOUNDARY_DEFINITION,

        staticObstacleDefinitions:
            readonly StaticObstacleDefinition[] = [],

        dynamicObstacles:
            readonly DynamicObstacle[] = [],

        windManager:
            WindManager,

        surfaceSystem:
            SurfaceSystem,

        localWindSystem:
            LocalWindSystem,
    ) {
        super();

        this.validatePhysicsDefinition(
            physicsDefinition,
        );

        this.physicsDefinition =
            physicsDefinition;

        this.validateCourseBoundaryDefinition(
            courseBoundaryDefinition,
        );

        this.courseBoundaryDefinition =
            courseBoundaryDefinition;

        this.validateStaticObstacleDefinitions(
            staticObstacleDefinitions,
        );

        this.staticObstacleDefinitions =
            staticObstacleDefinitions;

        this.validateDynamicObstacles(
            dynamicObstacles,
        );

        this.dynamicObstacles =
            dynamicObstacles;

        this.windManager =
            windManager;

        this.surfaceSystem =
            surfaceSystem;

        this.localWindSystem =
            localWindSystem;
    }

    // -------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------

    protected onInitialize(): void {

        this.visualContainer =
            new Container();

        this.ballGraphics =
            new Graphics();

        this.container.position.set(
            this.getInitialPositionX(),
            this.getInitialPositionY(),
        );

        this.visualContainer.addChild(
            this.ballGraphics,
        );

        this.container.addChild(
            this.visualContainer,
        );

        this.correctPositionInsideCourse();

        this.resolveStaticObstacleCollisions();

        for (
            let passIndex = 0;
            passIndex <
            this.physicsDefinition
                .maximumObstacleResolutionPasses;
            passIndex += 1
        ) {
            if (
                !this.resolveDynamicObstacleCollisions()
            ) {
                break;
            }
        }

        this.applyVisualScale();
        this.resetVisualOffset();
        this.drawBall();
    }

    protected onUpdate(
        deltaTime:
            number,
    ): void {

        const safeDeltaTime =
            Math.min(
                Math.max(
                    0,
                    deltaTime,
                ),
                this.physicsDefinition
                    .maximumDeltaTime,
            );

        if (
            this.gameplayState ===
            BallGameplayState.Active
        ) {
            this.updateMotion(
                safeDeltaTime,
            );

            this.updateTargetScale();

            this.updateVisualScale(
                safeDeltaTime,
            );

            this.updateVibration(
                safeDeltaTime,
            );

            return;
        }

        this.resetVisualOffset();
        this.resetVibration();
    }

    protected onDestroy(): void {

        this.stop(
            false,
        );

        this.ballGraphics
            ?.destroy();

        this.ballGraphics =
            null;

        this.visualContainer =
            null;

        this.impactListeners
            .clear();

        this.container.destroy({
            children:
                true,
        });
    }

    // -------------------------------------------------------
    // Reset
    // -------------------------------------------------------

    public resetToInitialPosition():
        void {

        this.gameplayState =
            BallGameplayState.Active;

        this.stop(
            false,
        );

        this.setPosition(
            this.getInitialPositionX(),
            this.getInitialPositionY(),
        );

        this.launchPositionX =
            this.getX();

        this.launchPositionY =
            this.getY();

        this.mostRecentLaunchSpeed = 0;

        this.mostRecentLaunchDirectionRadians = 0;

        this.movementElapsedTime = 0;

        this.movementDistanceTravelled = 0;

        this.boundaryCollisionCount = 0;

        this.obstacleCollisionCount = 0;

        this.restStabilityElapsedTime = 0;

        this.interactionState =
            BallInteractionState.Normal;

        this.currentVisualScale =
            this.normalScale;

        this.targetVisualScale =
            this.normalScale;

        this.tensionPower = 0;

        this.applyVisualScale();

        this.resetVibration();

        this.clearAimVector();

        this.correctPositionInsideCourse();

        this.resolveStaticObstacleCollisions();

        for (
            let passIndex = 0;
            passIndex <
            this.physicsDefinition
                .maximumObstacleResolutionPasses;
            passIndex += 1
        ) {
            if (
                !this.resolveDynamicObstacleCollisions()
            ) {
                break;
            }
        }
    }

    private getInitialPositionX():
        number {

        return (
            DEFAULT_GAME_VIEWPORT_DEFINITION
                .width /
            2
        );
    }

    private getInitialPositionY():
        number {

        return (
            DEFAULT_GAME_VIEWPORT_DEFINITION
                .height /
            2
        );
    }

    // -------------------------------------------------------
    // Ball Data
    // -------------------------------------------------------

    public getRadius():
        number {

        return this.radius;
    }

    public getMass():
        number {

        return this.physicsDefinition
            .mass;
    }

    public getInverseMass():
        number {

        return (
            1 /
            this.physicsDefinition
                .mass
        );
    }

    public getInverseMomentOfInertia():
        number {

        return 0;
    }

    // -------------------------------------------------------
    // Launch Validation
    // -------------------------------------------------------

    public canLaunchWithPower(
        normalizedPower:
            number,
    ): boolean {

        return (
            normalizedPower >=
            this.physicsDefinition
                .minimumLaunchPower
        );
    }

    public hasMetMinimumPreparationTime(
        preparationTime:
            number,
    ): boolean {

        return (
            preparationTime >=
            this.physicsDefinition
                .minimumShotPreparationTime
        );
    }

    public canLaunchShot(
        normalizedPower:
            number,

        preparationTime:
            number,
    ): boolean {

        return (
            this.isAvailableForInteraction() &&
            this.isStationary() &&
            this.canLaunchWithPower(
                normalizedPower,
            ) &&
            this.hasMetMinimumPreparationTime(
                preparationTime,
            )
        );
    }

    // -------------------------------------------------------
    // Launch
    // -------------------------------------------------------

    public launch(
        normalizedPower:
            number,

        directionRadians:
            number,
    ): boolean {

        if (
            !this.isAvailableForInteraction() ||
            this.isMoving()
        ) {
            return false;
        }

        const clampedPower =
            Math.max(
                0,
                Math.min(
                    normalizedPower,
                    1,
                ),
            );

        if (
            !this.canLaunchWithPower(
                clampedPower,
            )
        ) {
            this.stop(
                false,
            );

            return false;
        }

        this.correctPositionInsideCourse();

        this.resolveStaticObstacleCollisions();

        for (
            let passIndex = 0;
            passIndex <
            this.physicsDefinition
                .maximumObstacleResolutionPasses;
            passIndex += 1
        ) {
            if (
                !this.resolveDynamicObstacleCollisions()
            ) {
                break;
            }
        }

        const launchSpeed =
            this.calculateLaunchSpeed(
                clampedPower,
            );

        this.velocityX =
            Math.cos(
                directionRadians,
            ) *
            launchSpeed;

        this.velocityY =
            Math.sin(
                directionRadians,
            ) *
            launchSpeed;

        this.motionState =
            BallMotionState.Moving;

        this.launchPositionX =
            this.getX();

        this.launchPositionY =
            this.getY();

        this.mostRecentLaunchSpeed =
            launchSpeed;

        this.mostRecentLaunchDirectionRadians =
            directionRadians;

        this.movementElapsedTime = 0;

        this.movementDistanceTravelled = 0;

        this.boundaryCollisionCount = 0;

        this.obstacleCollisionCount = 0;

        this.restStabilityElapsedTime = 0;

        this.setInteractionState(
            BallInteractionState.Normal,
        );

        this.setTensionPower(
            0,
        );

        this.resetVibration();

        return true;
    }

    public stop(
        logDiagnostics =
            true,
    ): void {

        const wasMoving =
            this.isMoving();

        this.velocityX = 0;
        this.velocityY = 0;

        this.motionState =
            BallMotionState.Stationary;

        this.restStabilityElapsedTime = 0;

        if (
            wasMoving &&
            logDiagnostics
        ) {
            this.logRestState();
        }
    }

    public getMotionState():
        BallMotionState {

        return this.motionState;
    }

    public isMoving():
        boolean {

        return (
            this.motionState ===
            BallMotionState.Moving
        );
    }

    public isStationary():
        boolean {

        return (
            this.motionState ===
            BallMotionState.Stationary
        );
    }

    // -------------------------------------------------------
    // Velocity
    // -------------------------------------------------------

    public getVelocityX():
        number {

        return this.velocityX;
    }

    public getVelocityY():
        number {

        return this.velocityY;
    }

    public getAngularVelocity():
        number {

        return 0;
    }

    public getSpeed():
        number {

        return Math.hypot(
            this.velocityX,
            this.velocityY,
        );
    }

    // -------------------------------------------------------
    // Physics Configuration Queries
    // -------------------------------------------------------

    public getMinimumLaunchPower():
        number {

        return this.physicsDefinition
            .minimumLaunchPower;
    }

    public getMinimumShotPreparationTime():
        number {

        return this.physicsDefinition
            .minimumShotPreparationTime;
    }

    public getMinimumLaunchSpeed():
        number {

        return this.physicsDefinition
            .minimumLaunchSpeed;
    }

    public getMaximumBallSpeed():
        number {

        return this.physicsDefinition
            .maximumBallSpeed;
    }

    public getShotPowerExponent():
        number {

        return this.physicsDefinition
            .shotPowerExponent;
    }

    public getRollingDeceleration():
        number {

        return this.physicsDefinition
            .rollingDeceleration;
    }

    public getStopSpeedThreshold():
        number {

        return this.physicsDefinition
            .stopSpeedThreshold;
    }

    public getBoundaryRestitution():
        number {

        return this.physicsDefinition
            .boundaryRestitution;
    }

    public getBoundaryCollisionCount():
        number {

        return this.boundaryCollisionCount;
    }

    public getObstacleCollisionCount():
        number {

        return this.obstacleCollisionCount;
    }

    // -------------------------------------------------------
    // Validation Metric Queries
    // -------------------------------------------------------

    public getLaunchPositionX():
        number {

        return this.launchPositionX;
    }

    public getLaunchPositionY():
        number {

        return this.launchPositionY;
    }

    public getMostRecentLaunchSpeed():
        number {

        return this.mostRecentLaunchSpeed;
    }

    public getMostRecentLaunchDirectionRadians():
        number {

        return this.mostRecentLaunchDirectionRadians;
    }

    public getMovementElapsedTime():
        number {

        return this.movementElapsedTime;
    }

    public getMovementDistanceTravelled():
        number {

        return this.movementDistanceTravelled;
    }

    public getLaunchSpeedForPower(
        normalizedPower:
            number,
    ): number {

        const clampedPower =
            Math.max(
                0,
                Math.min(
                    normalizedPower,
                    1,
                ),
            );

        if (
            !this.canLaunchWithPower(
                clampedPower,
            )
        ) {
            return 0;
        }

        return this.calculateLaunchSpeed(
            clampedPower,
        );
    }

    // -------------------------------------------------------
    // Dynamic Collision Body Interface
    // -------------------------------------------------------

    public applyImpulseAtWorldPoint(
        impulseX:
            number,

        impulseY:
            number,

        contactPointX:
            number,

        contactPointY:
            number,
    ): void {

        if (
            this.gameplayState !==
            BallGameplayState.Active
        ) {
            return;
        }

        void contactPointX;
        void contactPointY;

        if (
            !Number.isFinite(
                impulseX,
            ) ||
            !Number.isFinite(
                impulseY,
            )
        ) {
            console.error(
                "Ball received an invalid collision impulse.",
                {
                    impulseX,
                    impulseY,
                },
            );

            return;
        }

        if (
            impulseX !== 0 ||
            impulseY !== 0
        ) {
            this.restStabilityElapsedTime = 0;
        }

        this.velocityX +=
            impulseX *
            this.getInverseMass();

        this.velocityY +=
            impulseY *
            this.getInverseMass();

        const resultingSpeed =
            this.getSpeed();

        if (
            resultingSpeed >
            this.physicsDefinition
                .maximumBallSpeed
        ) {
            const speedRatio =
                this.physicsDefinition
                    .maximumBallSpeed /
                resultingSpeed;

            this.velocityX *=
                speedRatio;

            this.velocityY *=
                speedRatio;
        }

        if (
            this.getSpeed() >
            this.physicsDefinition
                .stopSpeedThreshold
        ) {
            this.motionState =
                BallMotionState.Moving;

            this.setInteractionState(
                BallInteractionState.Normal,
            );
        }
    }

    // -------------------------------------------------------
    // Impact Events
    // -------------------------------------------------------

    public subscribeToImpacts(
        listener:
            BallImpactListener,
    ): () => void {

        this.impactListeners.add(
            listener,
        );

        let unsubscribed =
            false;

        return (): void => {

            if (
                unsubscribed
            ) {
                return;
            }

            unsubscribed =
                true;

            this.impactListeners
                .delete(
                    listener,
                );
        };
    }

    private notifyImpact(
        type:
            BallImpactType,

        impactSpeed:
            number,

        resultingSpeed:
            number,
    ): void {

        if (
            this.impactListeners
                .size ===
            0 ||
            !Number.isFinite(
                impactSpeed,
            ) ||
            !Number.isFinite(
                resultingSpeed,
            )
        ) {
            return;
        }

        const event:
            BallImpactEvent = {

            type,

            impactSpeed:
                Math.max(
                    0,
                    impactSpeed,
                ),

            resultingSpeed:
                Math.max(
                    0,
                    resultingSpeed,
                ),
        };

        this.impactListeners.forEach(
            (
                listener:
                    BallImpactListener,
            ): void => {

                listener(
                    event,
                );
            },
        );
    }

    // -------------------------------------------------------
    // Physics Update
    // -------------------------------------------------------

    private updateMotion(
        deltaTime:
            number,
    ): void {

        if (
            !this.isMoving()
        ) {
            for (
                let passIndex = 0;
                passIndex <
                this.physicsDefinition
                    .maximumObstacleResolutionPasses;
                passIndex += 1
            ) {
                if (
                    !this.resolveDynamicObstacleCollisions()
                ) {
                    break;
                }
            }

            return;
        }

        if (
            deltaTime <=
            0
        ) {
            return;
        }

        const frameStartSpeed =
            this.getSpeed();

        if (
            !Number.isFinite(
                frameStartSpeed,
            )
        ) {
            console.error(
                "Ball entered an invalid velocity state.",
                {
                    velocityX:
                        this.velocityX,

                    velocityY:
                        this.velocityY,

                    positionX:
                        this.getX(),

                    positionY:
                        this.getY(),
                },
            );

            this.stop();

            return;
        }

        const estimatedFrameDistance =
            frameStartSpeed *
            deltaTime;

        const physicsStepCount =
            Math.max(
                1,
                Math.ceil(
                    estimatedFrameDistance /
                    this.physicsDefinition
                        .maximumMovementPerPhysicsStep,
                ),
            );

        const physicsStepDeltaTime =
            deltaTime /
            physicsStepCount;

        for (
            let stepIndex = 0;
            stepIndex <
            physicsStepCount;
            stepIndex += 1
        ) {
            if (
                !this.isMoving()
            ) {
                break;
            }

            this.updateMotionStep(
                physicsStepDeltaTime,
            );
        }
    }

    private updateMotionStep(
        deltaTime:
            number,
    ): void {

        const currentSpeed =
            this.getSpeed();

        const startingVelocityX =
            this.velocityX;

        const startingVelocityY =
            this.velocityY;

        // ---------------------------------------------------
        // 1. Surface-Aware Rolling Resistance
        // ---------------------------------------------------

        /*
         * Surface is sampled inside every internal
         * physics sub-step. Fast movement therefore
         * responds as soon as the Ball centre crosses
         * a surface boundary.
         */
        const currentSurface =
            this.surfaceSystem
                .getSurfaceAt(
                    this.getX(),
                    this.getY(),
                );

        const effectiveRollingDeceleration =
            this.physicsDefinition
                .rollingDeceleration *
            currentSurface
                .rollingResistanceMultiplier;

        const speedReduction =
            effectiveRollingDeceleration *
            deltaTime;

        const speedAfterRollingResistance =
            Math.max(
                0,
                currentSpeed -
                speedReduction,
            );

        if (
            currentSpeed >
            0
        ) {
            const directionX =
                this.velocityX /
                currentSpeed;

            const directionY =
                this.velocityY /
                currentSpeed;

            this.velocityX =
                directionX *
                speedAfterRollingResistance;

            this.velocityY =
                directionY *
                speedAfterRollingResistance;
        } else {
            this.velocityX = 0;
            this.velocityY = 0;
        }

        // ---------------------------------------------------
        // 2. Speed-Scaled Wind Acceleration
        // ---------------------------------------------------

        const activeSpeedRange =
            this.physicsDefinition
                .maximumBallSpeed -
            this.physicsDefinition
                .stopSpeedThreshold;

        const normalizedBallSpeed =
            activeSpeedRange >
                0
                ? Math.min(
                    Math.max(
                        (
                            speedAfterRollingResistance -
                            this.physicsDefinition
                                .stopSpeedThreshold
                        ) /
                        activeSpeedRange,
                        0,
                    ),
                    1,
                )
                : 0;

        const globalWindAcceleration =
            this.windManager
                .getSafeScaledAcceleration(
                    normalizedBallSpeed,
                    this.velocityX,
                    this.velocityY,
                );

        /*
         * Local airflow is sampled inside every
         * internal physics sub-step so fast movement
         * cannot skip a narrow Fan stream.
         */
        const localWindAcceleration =
            this.localWindSystem
                .getAccelerationAt(
                    this.getX(),
                    this.getY(),
                );

        const combinedWindAccelerationX =
            globalWindAcceleration.x +
            localWindAcceleration.x;

        const combinedWindAccelerationY =
            globalWindAcceleration.y +
            localWindAcceleration.y;

        this.velocityX +=
            combinedWindAccelerationX *
            deltaTime;

        this.velocityY +=
            combinedWindAccelerationY *
            deltaTime;

        const speedAfterWind =
            this.getSpeed();

        if (
            !Number.isFinite(
                speedAfterWind,
            )
        ) {
            console.error(
                "Ball entered an invalid velocity state after wind acceleration.",
                {
                    velocityX:
                        this.velocityX,

                    velocityY:
                        this.velocityY,

                    globalWindAccelerationX:
                        globalWindAcceleration.x,

                    globalWindAccelerationY:
                        globalWindAcceleration.y,

                    localWindAccelerationX:
                        localWindAcceleration.x,

                    localWindAccelerationY:
                        localWindAcceleration.y,
                },
            );

            this.stop();

            return;
        }

        if (
            speedAfterWind >
            this.physicsDefinition
                .maximumBallSpeed
        ) {
            const speedRatio =
                this.physicsDefinition
                    .maximumBallSpeed /
                speedAfterWind;

            this.velocityX *=
                speedRatio;

            this.velocityY *=
                speedRatio;
        }

        // ---------------------------------------------------
        // 3. Movement Integration
        // ---------------------------------------------------

        const movementX =
            (
                startingVelocityX +
                this.velocityX
            ) *
            0.5 *
            deltaTime;

        const movementY =
            (
                startingVelocityY +
                this.velocityY
            ) *
            0.5 *
            deltaTime;

        const movementDistance =
            Math.hypot(
                movementX,
                movementY,
            );

        this.translate(
            movementX,
            movementY,
        );

        this.movementElapsedTime +=
            deltaTime;

        this.movementDistanceTravelled +=
            movementDistance;

        // ---------------------------------------------------
        // 4. Collision Handling
        // ---------------------------------------------------

        this.resolveWorldBoundaryCollision();

        this.resolveStaticObstacleCollisions();

        for (
            let passIndex = 0;
            passIndex <
            this.physicsDefinition
                .maximumObstacleResolutionPasses;
            passIndex += 1
        ) {
            if (
                !this.resolveDynamicObstacleCollisions()
            ) {
                break;
            }
        }

        this.correctPositionInsideCourse();

        // ---------------------------------------------------
        // 5. Rest Evaluation
        // ---------------------------------------------------

        this.evaluateRestStability(
            deltaTime,
        );
    }

    private evaluateRestStability(
        deltaTime:
            number,
    ): void {

        const currentSpeed =
            this.getSpeed();

        if (
            !Number.isFinite(
                currentSpeed,
            )
        ) {
            console.error(
                "Ball entered an invalid speed during rest evaluation.",
                {
                    velocityX:
                        this.velocityX,

                    velocityY:
                        this.velocityY,
                },
            );

            this.stop();

            return;
        }

        const windDefinition =
            this.windManager
                .getDefinition();

        const restConfirmationSpeed =
            this.physicsDefinition
                .stopSpeedThreshold *
            windDefinition
                .restStabilitySpeedMultiplier;

        if (
            currentSpeed >
            restConfirmationSpeed
        ) {
            this.restStabilityElapsedTime = 0;

            return;
        }

        this.restStabilityElapsedTime +=
            deltaTime;

        if (
            this.restStabilityElapsedTime >=
            windDefinition
                .restStabilityDuration
        ) {
            this.stop();
        }
    }

    // -------------------------------------------------------
    // World Boundary Collision
    // -------------------------------------------------------

    private resolveWorldBoundaryCollision():
        void {

        const collision =
            this.detectAndCorrectBoundaryCollision();

        const horizontalCollision =
            collision.collidedLeft ||
            collision.collidedRight;

        const verticalCollision =
            collision.collidedTop ||
            collision.collidedBottom;

        if (
            !horizontalCollision &&
            !verticalCollision
        ) {
            return;
        }

        const speedBeforeCollision =
            this.getSpeed();

        if (
            collision.collidedLeft &&
            this.velocityX <
            0
        ) {
            this.velocityX =
                -this.velocityX *
                this.physicsDefinition
                    .boundaryRestitution;
        }

        if (
            collision.collidedRight &&
            this.velocityX >
            0
        ) {
            this.velocityX =
                -this.velocityX *
                this.physicsDefinition
                    .boundaryRestitution;
        }

        if (
            collision.collidedTop &&
            this.velocityY <
            0
        ) {
            this.velocityY =
                -this.velocityY *
                this.physicsDefinition
                    .boundaryRestitution;
        }

        if (
            collision.collidedBottom &&
            this.velocityY >
            0
        ) {
            this.velocityY =
                -this.velocityY *
                this.physicsDefinition
                    .boundaryRestitution;
        }

        this.boundaryCollisionCount +=
            1;

        const speedAfterCollision =
            this.getSpeed();

        this.notifyImpact(
            "course-boundary",
            speedBeforeCollision,
            speedAfterCollision,
        );

        this.logBoundaryCollision(
            collision,
            speedBeforeCollision,
            speedAfterCollision,
        );
    }

    private detectAndCorrectBoundaryCollision():
        BoundaryCollisionResult {

        const legalMinimumX =
            this.getLegalMinimumX();

        const legalMaximumX =
            this.getLegalMaximumX();

        const legalMinimumY =
            this.getLegalMinimumY();

        const legalMaximumY =
            this.getLegalMaximumY();

        let correctedX =
            this.getX();

        let correctedY =
            this.getY();

        let collidedLeft =
            false;

        let collidedRight =
            false;

        let collidedTop =
            false;

        let collidedBottom =
            false;

        if (
            correctedX <
            legalMinimumX
        ) {
            correctedX =
                legalMinimumX;

            collidedLeft =
                true;
        } else if (
            correctedX >
            legalMaximumX
        ) {
            correctedX =
                legalMaximumX;

            collidedRight =
                true;
        }

        if (
            correctedY <
            legalMinimumY
        ) {
            correctedY =
                legalMinimumY;

            collidedTop =
                true;
        } else if (
            correctedY >
            legalMaximumY
        ) {
            correctedY =
                legalMaximumY;

            collidedBottom =
                true;
        }

        if (
            collidedLeft ||
            collidedRight ||
            collidedTop ||
            collidedBottom
        ) {
            this.setPosition(
                correctedX,
                correctedY,
            );
        }

        return {
            collidedLeft,
            collidedRight,
            collidedTop,
            collidedBottom,
        };
    }

    private correctPositionInsideCourse():
        void {

        const correctedX =
            Math.max(
                this.getLegalMinimumX(),
                Math.min(
                    this.getX(),
                    this.getLegalMaximumX(),
                ),
            );

        const correctedY =
            Math.max(
                this.getLegalMinimumY(),
                Math.min(
                    this.getY(),
                    this.getLegalMaximumY(),
                ),
            );

        this.setPosition(
            correctedX,
            correctedY,
        );
    }

    private getLegalMinimumX():
        number {

        return (
            this.courseBoundaryDefinition
                .minimumX +
            this.radius +
            this.physicsDefinition
                .boundarySafetyMargin
        );
    }

    private getLegalMaximumX():
        number {

        return (
            this.courseBoundaryDefinition
                .maximumX -
            this.radius -
            this.physicsDefinition
                .boundarySafetyMargin
        );
    }

    private getLegalMinimumY():
        number {

        return (
            this.courseBoundaryDefinition
                .minimumY +
            this.radius +
            this.physicsDefinition
                .boundarySafetyMargin
        );
    }

    private getLegalMaximumY():
        number {

        return (
            this.courseBoundaryDefinition
                .maximumY -
            this.radius -
            this.physicsDefinition
                .boundarySafetyMargin
        );
    }

    // -------------------------------------------------------
    // Static Obstacle Collision
    // -------------------------------------------------------

    private resolveStaticObstacleCollisions():
        void {

        if (
            this.staticObstacleDefinitions
                .length ===
            0
        ) {
            return;
        }

        for (
            let passIndex = 0;
            passIndex <
            this.physicsDefinition
                .maximumObstacleResolutionPasses;
            passIndex += 1
        ) {
            let resolvedCollision =
                false;

            for (
                const obstacle
                of this.staticObstacleDefinitions
            ) {
                const manifold =
                    detectBallObstacleCollision(
                        this.getX(),
                        this.getY(),
                        this.radius,
                        obstacle,
                    );

                if (
                    !manifold
                ) {
                    continue;
                }

                this.resolveStaticObstacleCollision(
                    manifold,
                );

                resolvedCollision =
                    true;
            }

            if (
                !resolvedCollision
            ) {
                break;
            }
        }
    }

    private resolveStaticObstacleCollision(
        manifold:
            CollisionManifold,
    ): void {

        const correctionDistance =
            manifold.penetrationDepth +
            this.physicsDefinition
                .boundarySafetyMargin;

        this.translate(
            manifold.normalX *
            correctionDistance,

            manifold.normalY *
            correctionDistance,
        );

        const normalVelocity =
            this.velocityX *
            manifold.normalX +
            this.velocityY *
            manifold.normalY;

        if (
            normalVelocity >=
            0
        ) {
            return;
        }

        const tangentVelocityX =
            this.velocityX -
            normalVelocity *
            manifold.normalX;

        const tangentVelocityY =
            this.velocityY -
            normalVelocity *
            manifold.normalY;

        const retainedTangentRatio =
            1 -
            manifold.collisionFriction;

        const reflectedNormalSpeed =
            -normalVelocity *
            manifold.restitution;

        const speedBeforeCollision =
            this.getSpeed();

        this.velocityX =
            tangentVelocityX *
            retainedTangentRatio +
            manifold.normalX *
            reflectedNormalSpeed;

        this.velocityY =
            tangentVelocityY *
            retainedTangentRatio +
            manifold.normalY *
            reflectedNormalSpeed;

        this.obstacleCollisionCount +=
            1;

        const speedAfterCollision =
            this.getSpeed();

        this.notifyImpact(
            "static-obstacle",
            speedBeforeCollision,
            speedAfterCollision,
        );

        this.logStaticObstacleCollision(
            manifold,
            speedBeforeCollision,
            speedAfterCollision,
        );
    }

    // -------------------------------------------------------
    // Dynamic Obstacle Collision
    // -------------------------------------------------------

    private resolveDynamicObstacleCollisions():
        boolean {

        if (
            this.dynamicObstacles
                .length ===
            0
        ) {
            return false;
        }

        let collisionResolved =
            false;

        for (
            const obstacle
            of this.dynamicObstacles
        ) {
            const obstacleDefinition =
                obstacle.getDefinition();

            const detectedManifold =
                detectBallDynamicObstacleCollision(
                    this.getX(),
                    this.getY(),
                    this.radius,
                    obstacle.getX(),
                    obstacle.getY(),
                    obstacle.getRotationRadians(),
                    obstacleDefinition,
                );

            if (
                !detectedManifold
            ) {
                continue;
            }

            const dynamicManifold =
                this.createCombinedDynamicManifold(
                    detectedManifold,
                );

            const speedBeforeCollision =
                this.getSpeed();

            const obstacleSpeedBeforeCollision =
                Math.hypot(
                    obstacle.getVelocityX(),
                    obstacle.getVelocityY(),
                );

            const obstacleAngularSpeedBeforeCollision =
                obstacle
                    .getAngularVelocity();

            const result =
                resolveDynamicCollision(
                    this.createBallCollisionBody(),

                    this.createObstacleCollisionBody(
                        obstacle,
                    ),

                    dynamicManifold,

                    this.physicsDefinition
                        .dynamicPositionCorrectionPercent,

                    this.physicsDefinition
                        .dynamicPositionCorrectionSlop,
                );

            if (
                !result.resolved
            ) {
                continue;
            }

            this.correctPositionInsideCourse();

            collisionResolved =
                true;

            if (
                result
                    .normalImpulseMagnitude >
                0
            ) {
                this.obstacleCollisionCount +=
                    1;

                const ballSpeedAfterCollision =
                    this.getSpeed();

                this.notifyImpact(
                    "dynamic-obstacle",
                    speedBeforeCollision,
                    ballSpeedAfterCollision,
                );

                this.logDynamicObstacleCollision(
                    obstacle,
                    dynamicManifold,
                    speedBeforeCollision,
                    ballSpeedAfterCollision,
                    obstacleSpeedBeforeCollision,
                    Math.hypot(
                        obstacle.getVelocityX(),
                        obstacle.getVelocityY(),
                    ),
                    obstacleAngularSpeedBeforeCollision,
                    obstacle.getAngularVelocity(),
                    result.normalImpulseMagnitude,
                    result.frictionImpulseMagnitude,
                );
            }
        }

        return collisionResolved;
    }

    private createCombinedDynamicManifold(
        manifold:
            DynamicCollisionManifold,
    ): DynamicCollisionManifold {

        const ballMaterial = {
            restitution:
                this.physicsDefinition
                    .obstacleRestitution,

            friction:
                this.physicsDefinition
                    .obstacleFriction,
        };

        const obstacleMaterial = {
            restitution:
                manifold.restitution,

            friction:
                manifold.friction,
        };

        return {
            obstacleId:
                manifold.obstacleId,

            normalX:
                manifold.normalX,

            normalY:
                manifold.normalY,

            penetrationDepth:
                manifold.penetrationDepth,

            contactPointX:
                manifold.contactPointX,

            contactPointY:
                manifold.contactPointY,

            restitution:
                combineRestitution(
                    ballMaterial,
                    obstacleMaterial,
                ),

            friction:
                combineFriction(
                    ballMaterial,
                    obstacleMaterial,
                ),
        };
    }

    private createBallCollisionBody():
        DynamicCollisionBody {

        return {
            positionX:
                this.getX(),

            positionY:
                this.getY(),

            velocityX:
                this.velocityX,

            velocityY:
                this.velocityY,

            angularVelocity:
                0,

            inverseMass:
                this.getInverseMass(),

            inverseMomentOfInertia:
                this.getInverseMomentOfInertia(),

            applyImpulseAtWorldPoint:
                (
                    impulseX:
                        number,

                    impulseY:
                        number,

                    contactPointX:
                        number,

                    contactPointY:
                        number,
                ): void => {

                    const impulseMagnitude =
                        Math.hypot(
                            impulseX,
                            impulseY,
                        );

                    if (
                        impulseMagnitude >
                        this.physicsDefinition
                            .maximumCollisionImpulse
                    ) {
                        const scale =
                            this.physicsDefinition
                                .maximumCollisionImpulse /
                            impulseMagnitude;

                        this.applyImpulseAtWorldPoint(
                            impulseX *
                            scale,

                            impulseY *
                            scale,

                            contactPointX,

                            contactPointY,
                        );

                        return;
                    }

                    this.applyImpulseAtWorldPoint(
                        impulseX,
                        impulseY,
                        contactPointX,
                        contactPointY,
                    );
                },

            translate:
                (
                    deltaX:
                        number,

                    deltaY:
                        number,
                ): void => {

                    this.translate(
                        deltaX,
                        deltaY,
                    );
                },
        };
    }

    private createObstacleCollisionBody(
        obstacle:
            DynamicObstacle,
    ): DynamicCollisionBody {

        return {
            positionX:
                obstacle.getX(),

            positionY:
                obstacle.getY(),

            velocityX:
                obstacle.getVelocityX(),

            velocityY:
                obstacle.getVelocityY(),

            angularVelocity:
                obstacle
                    .getAngularVelocity(),

            inverseMass:
                obstacle
                    .getInverseMass(),

            inverseMomentOfInertia:
                obstacle
                    .getInverseMomentOfInertia(),

            applyImpulseAtWorldPoint:
                (
                    impulseX:
                        number,

                    impulseY:
                        number,

                    contactPointX:
                        number,

                    contactPointY:
                        number,
                ): void => {

                    const impulseMagnitude =
                        Math.hypot(
                            impulseX,
                            impulseY,
                        );

                    if (
                        impulseMagnitude >
                        this.physicsDefinition
                            .maximumCollisionImpulse
                    ) {
                        const scale =
                            this.physicsDefinition
                                .maximumCollisionImpulse /
                            impulseMagnitude;

                        obstacle
                            .applyImpulseAtWorldPoint(
                                impulseX *
                                scale,

                                impulseY *
                                scale,

                                contactPointX,

                                contactPointY,
                            );

                        return;
                    }

                    obstacle
                        .applyImpulseAtWorldPoint(
                            impulseX,
                            impulseY,
                            contactPointX,
                            contactPointY,
                        );
                },

            translate:
                (
                    deltaX:
                        number,

                    deltaY:
                        number,
                ): void => {

                    obstacle.translate(
                        deltaX,
                        deltaY,
                    );
                },
        };
    }

    // -------------------------------------------------------
    // Launch-Speed Calculation
    // -------------------------------------------------------

    private calculateLaunchSpeed(
        normalizedPower:
            number,
    ): number {

        const minimumPower =
            this.physicsDefinition
                .minimumLaunchPower;

        const validPowerRange =
            1 -
            minimumPower;

        const remappedPower =
            validPowerRange >
                0
                ? (
                    normalizedPower -
                    minimumPower
                ) /
                validPowerRange
                : 1;

        const clampedRemappedPower =
            Math.max(
                0,
                Math.min(
                    remappedPower,
                    1,
                ),
            );

        const curvedPower =
            Math.pow(
                clampedRemappedPower,
                this.physicsDefinition
                    .shotPowerExponent,
            );

        const speedRange =
            this.physicsDefinition
                .maximumBallSpeed -
            this.physicsDefinition
                .minimumLaunchSpeed;

        return (
            this.physicsDefinition
                .minimumLaunchSpeed +
            curvedPower *
            speedRange
        );
    }

    // -------------------------------------------------------
    // Diagnostics
    // -------------------------------------------------------

    private logStaticObstacleCollision(
        manifold:
            CollisionManifold,

        speedBeforeCollision:
            number,

        speedAfterCollision:
            number,
    ): void {

        console.log(
            "===== STATIC OBSTACLE COLLISION =====",
        );

        console.log(
            "Obstacle:",
            manifold.obstacleId,
        );

        console.log(
            "Collision Normal:",
            {
                x:
                    manifold.normalX
                        .toFixed(
                            3,
                        ),

                y:
                    manifold.normalY
                        .toFixed(
                            3,
                        ),
            },
        );

        console.log(
            "Penetration Depth:",
            manifold
                .penetrationDepth
                .toFixed(
                    3,
                ),
            "px",
        );

        console.log(
            "Speed Before Collision:",
            speedBeforeCollision
                .toFixed(
                    2,
                ),
            "px/s",
        );

        console.log(
            "Speed After Collision:",
            speedAfterCollision
                .toFixed(
                    2,
                ),
            "px/s",
        );

        console.log(
            "Restitution:",
            manifold.restitution
                .toFixed(
                    2,
                ),
        );

        console.log(
            "Collision Friction:",
            manifold
                .collisionFriction
                .toFixed(
                    2,
                ),
        );

        console.log(
            "Obstacle Collision Count:",
            this.obstacleCollisionCount,
        );

        console.log(
            "=====================================",
        );
    }

    private logDynamicObstacleCollision(
        obstacle:
            DynamicObstacle,

        manifold:
            DynamicCollisionManifold,

        ballSpeedBeforeCollision:
            number,

        ballSpeedAfterCollision:
            number,

        obstacleSpeedBeforeCollision:
            number,

        obstacleSpeedAfterCollision:
            number,

        obstacleAngularSpeedBeforeCollision:
            number,

        obstacleAngularSpeedAfterCollision:
            number,

        normalImpulseMagnitude:
            number,

        frictionImpulseMagnitude:
            number,
    ): void {

        console.log(
            "==== DYNAMIC OBSTACLE COLLISION ====",
        );

        console.log(
            "Obstacle:",
            manifold.obstacleId,
        );

        console.log(
            "Obstacle Shape:",
            obstacle
                .getDefinition()
                .shape,
        );

        console.log(
            "Collision Normal:",
            {
                x:
                    manifold.normalX
                        .toFixed(
                            3,
                        ),

                y:
                    manifold.normalY
                        .toFixed(
                            3,
                        ),
            },
        );

        console.log(
            "Contact Point:",
            {
                x:
                    manifold.contactPointX
                        .toFixed(
                            2,
                        ),

                y:
                    manifold.contactPointY
                        .toFixed(
                            2,
                        ),
            },
        );

        console.log(
            "Penetration Depth:",
            manifold.penetrationDepth
                .toFixed(
                    3,
                ),
            "px",
        );

        console.log(
            "Ball Speed Before:",
            ballSpeedBeforeCollision
                .toFixed(
                    2,
                ),
            "px/s",
        );

        console.log(
            "Ball Speed After:",
            ballSpeedAfterCollision
                .toFixed(
                    2,
                ),
            "px/s",
        );

        console.log(
            "Obstacle Speed Before:",
            obstacleSpeedBeforeCollision
                .toFixed(
                    2,
                ),
            "px/s",
        );

        console.log(
            "Obstacle Speed After:",
            obstacleSpeedAfterCollision
                .toFixed(
                    2,
                ),
            "px/s",
        );

        console.log(
            "Obstacle Angular Speed Before:",
            obstacleAngularSpeedBeforeCollision
                .toFixed(
                    3,
                ),
            "rad/s",
        );

        console.log(
            "Obstacle Angular Speed After:",
            obstacleAngularSpeedAfterCollision
                .toFixed(
                    3,
                ),
            "rad/s",
        );

        console.log(
            "Combined Restitution:",
            manifold.restitution
                .toFixed(
                    3,
                ),
        );

        console.log(
            "Combined Friction:",
            manifold.friction
                .toFixed(
                    3,
                ),
        );

        console.log(
            "Normal Impulse:",
            normalImpulseMagnitude
                .toFixed(
                    3,
                ),
        );

        console.log(
            "Friction Impulse:",
            frictionImpulseMagnitude
                .toFixed(
                    3,
                ),
        );

        console.log(
            "Obstacle Collision Count:",
            this.obstacleCollisionCount,
        );

        console.log(
            "====================================",
        );
    }

    private logBoundaryCollision(
        collision:
            BoundaryCollisionResult,

        speedBeforeCollision:
            number,

        speedAfterCollision:
            number,
    ): void {

        const collidedEdges:
            string[] = [];

        if (
            collision.collidedLeft
        ) {
            collidedEdges.push(
                "Left",
            );
        }

        if (
            collision.collidedRight
        ) {
            collidedEdges.push(
                "Right",
            );
        }

        if (
            collision.collidedTop
        ) {
            collidedEdges.push(
                "Top",
            );
        }

        if (
            collision.collidedBottom
        ) {
            collidedEdges.push(
                "Bottom",
            );
        }

        console.log(
            "======= BOUNDARY COLLISION =======",
        );

        console.log(
            "Edge:",
            collidedEdges.join(
                " + ",
            ),
        );

        console.log(
            "Corrected Position:",
            {
                x:
                    this.getX()
                        .toFixed(
                            2,
                        ),

                y:
                    this.getY()
                        .toFixed(
                            2,
                        ),
            },
        );

        console.log(
            "Speed Before Collision:",
            speedBeforeCollision
                .toFixed(
                    2,
                ),
            "px/s",
        );

        console.log(
            "Speed After Collision:",
            speedAfterCollision
                .toFixed(
                    2,
                ),
            "px/s",
        );

        console.log(
            "Velocity After Collision:",
            {
                x:
                    this.velocityX
                        .toFixed(
                            2,
                        ),

                y:
                    this.velocityY
                        .toFixed(
                            2,
                        ),
            },
        );

        console.log(
            "Restitution:",
            this.physicsDefinition
                .boundaryRestitution
                .toFixed(
                    2,
                ),
        );

        console.log(
            "Collision Count:",
            this.boundaryCollisionCount,
        );

        console.log(
            "==================================",
        );
    }

    private logRestState():
        void {

        const displacementX =
            this.getX() -
            this.launchPositionX;

        const displacementY =
            this.getY() -
            this.launchPositionY;

        const straightLineDisplacement =
            Math.hypot(
                displacementX,
                displacementY,
            );

        const surface =
            this.surfaceSystem
                .getSurfaceAt(
                    this.getX(),
                    this.getY(),
                );

        console.log(
            "========== BALL STOPPED ==========",
        );

        console.log(
            "Launch Position:",
            {
                x:
                    this.launchPositionX
                        .toFixed(
                            2,
                        ),

                y:
                    this.launchPositionY
                        .toFixed(
                            2,
                        ),
            },
        );

        console.log(
            "Stop Position:",
            {
                x:
                    this.getX()
                        .toFixed(
                            2,
                        ),

                y:
                    this.getY()
                        .toFixed(
                            2,
                        ),
            },
        );

        console.log(
            "Initial Speed:",
            this.mostRecentLaunchSpeed
                .toFixed(
                    2,
                ),
            "px/s",
        );

        console.log(
            "Base Rolling Deceleration:",
            this.physicsDefinition
                .rollingDeceleration
                .toFixed(
                    2,
                ),
            "px/s²",
        );

        console.log(
            "Stop Surface:",
            surface.surfaceType,
        );

        console.log(
            "Stop Surface State:",
            surface.surfaceState,
        );

        console.log(
            "Stop Surface Rolling Multiplier:",
            surface
                .rollingResistanceMultiplier
                .toFixed(
                    2,
                ),
        );

        console.log(
            "Movement Time:",
            this.movementElapsedTime
                .toFixed(
                    3,
                ),
            "seconds",
        );

        console.log(
            "Integrated Travel Distance:",
            this.movementDistanceTravelled
                .toFixed(
                    2,
                ),
            "px",
        );

        console.log(
            "Straight-Line Displacement:",
            straightLineDisplacement
                .toFixed(
                    2,
                ),
            "px",
        );

        console.log(
            "Boundary Collisions:",
            this.boundaryCollisionCount,
        );

        console.log(
            "Obstacle Collisions:",
            this.obstacleCollisionCount,
        );

        console.log(
            "Final Velocity:",
            {
                x:
                    this.velocityX
                        .toFixed(
                            2,
                        ),

                y:
                    this.velocityY
                        .toFixed(
                            2,
                        ),
            },
        );

        console.log(
            "Motion State:",
            "Stationary",
        );

        console.log(
            "==================================",
        );
    }

    // -------------------------------------------------------
    // Interaction State
    // -------------------------------------------------------

    public getInteractionState():
        BallInteractionState {

        return this.interactionState;
    }

    public setInteractionState(
        state:
            BallInteractionState,
    ): void {

        if (
            this.gameplayState !==
            BallGameplayState.Active
        ) {
            this.interactionState =
                BallInteractionState.Normal;

            return;
        }

        const resolvedState =
            this.isMoving()
                ? BallInteractionState.Normal
                : state;

        if (
            this.interactionState ===
            resolvedState
        ) {
            return;
        }

        this.interactionState =
            resolvedState;

        if (
            resolvedState !==
            BallInteractionState.Dragging
        ) {
            this.setTensionPower(
                0,
            );

            this.resetVibration();
        }
    }

    private updateTargetScale():
        void {

        switch (
        this.interactionState
        ) {
            case BallInteractionState.Normal:
                this.targetVisualScale =
                    this.normalScale;
                break;

            case BallInteractionState.Hovered:
            case BallInteractionState.Dragging:
                this.targetVisualScale =
                    this.interactionScale;
                break;
        }
    }

    private updateVisualScale(
        deltaTime:
            number,
    ): void {

        const interpolationFactor =
            1 -
            Math.exp(
                -this.scaleResponseSpeed *
                deltaTime,
            );

        this.currentVisualScale +=
            (
                this.targetVisualScale -
                this.currentVisualScale
            ) *
            interpolationFactor;

        if (
            Math.abs(
                this.targetVisualScale -
                this.currentVisualScale,
            ) <
            0.0001
        ) {
            this.currentVisualScale =
                this.targetVisualScale;
        }

        this.applyVisualScale();
    }

    private applyVisualScale():
        void {

        this.visualContainer
            ?.scale
            .set(
                this.currentVisualScale,
            );
    }

    // -------------------------------------------------------
    // Drag-Tension Feedback
    // -------------------------------------------------------

    public setTensionPower(
        normalizedPower:
            number,
    ): void {

        this.tensionPower =
            Math.max(
                0,
                Math.min(
                    normalizedPower,
                    1,
                ),
            );
    }

    public getTensionPower():
        number {

        return this.tensionPower;
    }

    private updateVibration(
        deltaTime:
            number,
    ): void {

        if (
            this.interactionState !==
            BallInteractionState.Dragging ||
            this.tensionPower <=
            0
        ) {
            this.resetVisualOffset();

            return;
        }

        const frequencyRange =
            this.maximumVibrationFrequency -
            this.minimumVibrationFrequency;

        const currentFrequency =
            this.minimumVibrationFrequency +
            this.tensionPower *
            frequencyRange;

        this.vibrationTime +=
            deltaTime *
            currentFrequency;

        const amplitude =
            this.maximumVibrationAmplitude *
            this.tensionPower;

        const offsetX =
            Math.sin(
                this.vibrationTime,
            ) *
            amplitude;

        const offsetY =
            Math.cos(
                this.vibrationTime *
                this.secondaryFrequencyRatio,
            ) *
            amplitude;

        this.visualContainer
            ?.position
            .set(
                offsetX,
                offsetY,
            );
    }

    private resetVibration():
        void {

        this.vibrationTime = 0;

        this.resetVisualOffset();
    }

    private resetVisualOffset():
        void {

        this.visualContainer
            ?.position
            .set(
                0,
                0,
            );
    }

    // -------------------------------------------------------
    // Temporary Compatibility
    // -------------------------------------------------------

    public setAimVector(
        dx:
            number,

        dy:
            number,
    ): void {

        void dx;
        void dy;
    }

    public clearAimVector():
        void {
        // Intentionally empty.
    }

    // -------------------------------------------------------
    // Rendering
    // -------------------------------------------------------

    private drawBall():
        void {

        if (
            !this.ballGraphics
        ) {
            return;
        }

        this.ballGraphics
            .clear();

        this.ballGraphics
            .circle(
                0,
                0,
                this.radius,
            );

        this.ballGraphics
            .fill(
                this.ballColor,
            );
    }

    // -------------------------------------------------------
    // Validation
    // -------------------------------------------------------

    private validatePhysicsDefinition(
        definition:
            BallPhysicsDefinition,
    ): void {

        if (
            definition.minimumLaunchPower <
            0 ||
            definition.minimumLaunchPower >=
            1
        ) {
            throw new Error(
                "Ball minimumLaunchPower must be greater than or equal to 0 and lower than 1.",
            );
        }

        if (
            definition.minimumShotPreparationTime <
            0
        ) {
            throw new Error(
                "Ball minimumShotPreparationTime cannot be negative.",
            );
        }

        if (
            definition.minimumLaunchSpeed <=
            0
        ) {
            throw new Error(
                "Ball minimumLaunchSpeed must be greater than 0.",
            );
        }

        if (
            definition.maximumBallSpeed <=
            0
        ) {
            throw new Error(
                "Ball maximumBallSpeed must be greater than 0.",
            );
        }

        if (
            definition.maximumBallSpeed <
            definition.minimumLaunchSpeed
        ) {
            throw new Error(
                "Ball maximumBallSpeed cannot be lower than minimumLaunchSpeed.",
            );
        }

        if (
            definition.shotPowerExponent <=
            0
        ) {
            throw new Error(
                "Ball shotPowerExponent must be greater than 0.",
            );
        }

        if (
            definition.rollingDeceleration <=
            0
        ) {
            throw new Error(
                "Ball rollingDeceleration must be greater than 0.",
            );
        }

        if (
            definition.stopSpeedThreshold <
            0
        ) {
            throw new Error(
                "Ball stopSpeedThreshold cannot be negative.",
            );
        }

        if (
            definition.stopSpeedThreshold >=
            definition.minimumLaunchSpeed
        ) {
            throw new Error(
                "Ball stopSpeedThreshold must be lower than minimumLaunchSpeed.",
            );
        }

        if (
            definition.mass <=
            0 ||
            !Number.isFinite(
                definition.mass,
            )
        ) {
            throw new Error(
                "Ball mass must be a finite number greater than 0.",
            );
        }

        if (
            definition.obstacleRestitution <
            0 ||
            definition.obstacleRestitution >
            1
        ) {
            throw new Error(
                "Ball obstacleRestitution must be between 0 and 1.",
            );
        }

        if (
            definition.obstacleFriction <
            0 ||
            definition.obstacleFriction >
            1
        ) {
            throw new Error(
                "Ball obstacleFriction must be between 0 and 1.",
            );
        }

        if (
            definition.boundaryRestitution <
            0 ||
            definition.boundaryRestitution >
            1
        ) {
            throw new Error(
                "Ball boundaryRestitution must be between 0 and 1.",
            );
        }

        if (
            definition.boundarySafetyMargin <
            0
        ) {
            throw new Error(
                "Ball boundarySafetyMargin cannot be negative.",
            );
        }

        if (
            definition.maximumMovementPerPhysicsStep <=
            0
        ) {
            throw new Error(
                "Ball maximumMovementPerPhysicsStep must be greater than 0.",
            );
        }

        if (
            !Number.isInteger(
                definition
                    .maximumObstacleResolutionPasses,
            ) ||
            definition
                .maximumObstacleResolutionPasses <=
            0
        ) {
            throw new Error(
                "Ball maximumObstacleResolutionPasses must be a positive integer.",
            );
        }

        if (
            definition.dynamicPositionCorrectionPercent <
            0 ||
            definition.dynamicPositionCorrectionPercent >
            1
        ) {
            throw new Error(
                "Ball dynamicPositionCorrectionPercent must be between 0 and 1.",
            );
        }

        if (
            definition.dynamicPositionCorrectionSlop <
            0
        ) {
            throw new Error(
                "Ball dynamicPositionCorrectionSlop cannot be negative.",
            );
        }

        if (
            definition.maximumCollisionImpulse <=
            0 ||
            !Number.isFinite(
                definition.maximumCollisionImpulse,
            )
        ) {
            throw new Error(
                "Ball maximumCollisionImpulse must be a finite number greater than 0.",
            );
        }

        if (
            definition.maximumDeltaTime <=
            0
        ) {
            throw new Error(
                "Ball maximumDeltaTime must be greater than 0.",
            );
        }
    }

    private validateCourseBoundaryDefinition(
        definition:
            CourseBoundaryDefinition,
    ): void {

        if (
            !Number.isFinite(
                definition.minimumX,
            ) ||
            !Number.isFinite(
                definition.maximumX,
            ) ||
            !Number.isFinite(
                definition.minimumY,
            ) ||
            !Number.isFinite(
                definition.maximumY,
            )
        ) {
            throw new Error(
                "Course boundary values must be finite numbers.",
            );
        }

        if (
            definition.maximumX <=
            definition.minimumX
        ) {
            throw new Error(
                "Course maximumX must be greater than minimumX.",
            );
        }

        if (
            definition.maximumY <=
            definition.minimumY
        ) {
            throw new Error(
                "Course maximumY must be greater than minimumY.",
            );
        }

        const requiredDiameter =
            (
                this.radius +
                this.physicsDefinition
                    .boundarySafetyMargin
            ) *
            2;

        const courseWidth =
            definition.maximumX -
            definition.minimumX;

        const courseHeight =
            definition.maximumY -
            definition.minimumY;

        if (
            courseWidth <=
            requiredDiameter
        ) {
            throw new Error(
                "Course width must be larger than the Ball diameter and its safety margins.",
            );
        }

        if (
            courseHeight <=
            requiredDiameter
        ) {
            throw new Error(
                "Course height must be larger than the Ball diameter and its safety margins.",
            );
        }
    }

    private validateStaticObstacleDefinitions(
        definitions:
            readonly StaticObstacleDefinition[],
    ): void {

        const ids =
            new Set<string>();

        for (
            const definition
            of definitions
        ) {
            if (
                definition.id
                    .trim()
                    .length ===
                0
            ) {
                throw new Error(
                    "Static obstacle id cannot be empty.",
                );
            }

            if (
                ids.has(
                    definition.id,
                )
            ) {
                throw new Error(
                    `Static obstacle id '${definition.id}' is duplicated.`,
                );
            }

            ids.add(
                definition.id,
            );

            if (
                definition.material
                    .restitution <
                0 ||
                definition.material
                    .restitution >
                1
            ) {
                throw new Error(
                    `Static obstacle '${definition.id}' restitution must be between 0 and 1.`,
                );
            }

            if (
                definition.material
                    .collisionFriction <
                0 ||
                definition.material
                    .collisionFriction >
                1
            ) {
                throw new Error(
                    `Static obstacle '${definition.id}' collision friction must be between 0 and 1.`,
                );
            }
        }
    }

    private validateDynamicObstacles(
        obstacles:
            readonly DynamicObstacle[],
    ): void {

        const ids =
            new Set<string>();

        for (
            const obstacle
            of obstacles
        ) {
            const definition =
                obstacle
                    .getDefinition();

            if (
                definition.id
                    .trim()
                    .length ===
                0
            ) {
                throw new Error(
                    "Dynamic obstacle id cannot be empty.",
                );
            }

            if (
                ids.has(
                    definition.id,
                )
            ) {
                throw new Error(
                    `Dynamic obstacle id '${definition.id}' is duplicated.`,
                );
            }

            ids.add(
                definition.id,
            );

            if (
                obstacle
                    .getInverseMass() <
                0 ||
                !Number.isFinite(
                    obstacle
                        .getInverseMass(),
                )
            ) {
                throw new Error(
                    `Dynamic obstacle '${definition.id}' inverse mass is invalid.`,
                );
            }

            if (
                obstacle
                    .getInverseMomentOfInertia() <
                0 ||
                !Number.isFinite(
                    obstacle
                        .getInverseMomentOfInertia(),
                )
            ) {
                throw new Error(
                    `Dynamic obstacle '${definition.id}' inverse moment of inertia is invalid.`,
                );
            }
        }
    }

    // -------------------------------------------------------
    // Hole Capture State
    // -------------------------------------------------------

    public beginHoleCapture():
        void {

        if (
            this.gameplayState !==
            BallGameplayState.Active
        ) {
            return;
        }

        this.stop(
            false,
        );

        this.gameplayState =
            BallGameplayState.HoleCapture;

        this.interactionState =
            BallInteractionState.Normal;

        this.tensionPower = 0;

        this.resetVibration();

        this.resetVisualOffset();
    }

    public setHoleCaptureTransform(
        positionX:
            number,

        positionY:
            number,

        visualScale:
            number,
    ): void {

        if (
            this.gameplayState !==
            BallGameplayState.HoleCapture
        ) {
            return;
        }

        this.setPosition(
            positionX,
            positionY,
        );

        this.currentVisualScale =
            Math.max(
                0,
                visualScale,
            );

        this.targetVisualScale =
            this.currentVisualScale;

        this.applyVisualScale();
    }

    public completeHoleCapture(
        positionX:
            number,

        positionY:
            number,

        visualScale =
            0,
    ): void {

        this.stop(
            false,
        );

        this.setPosition(
            positionX,
            positionY,
        );

        this.gameplayState =
            BallGameplayState.Holed;

        this.interactionState =
            BallInteractionState.Normal;

        this.currentVisualScale =
            Math.max(
                0,
                visualScale,
            );

        this.targetVisualScale =
            this.currentVisualScale;

        this.applyVisualScale();

        this.resetVibration();

        this.resetVisualOffset();
    }

    public getGameplayState():
        BallGameplayState {

        return this.gameplayState;
    }

    public isBeingCaptured():
        boolean {

        return (
            this.gameplayState ===
            BallGameplayState.HoleCapture
        );
    }

    public isHoled():
        boolean {

        return (
            this.gameplayState ===
            BallGameplayState.Holed
        );
    }

    public isAvailableForInteraction():
        boolean {

        return (
            this.gameplayState ===
            BallGameplayState.Active
        );
    }

    public getVisualScale():
        number {

        return this.currentVisualScale;
    }
}
