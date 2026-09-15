import type { Ball } from "../Ball";
import { Entity } from "../Entity";

import type {
    HydrantHoseDefinition,
} from "../../config/HydrantHoseDefinition";

import {
    DEFAULT_HYDRANT_HOSE_DEFINITION,
} from "../../config/HydrantHoseDefinition";

import {
    createHoseWaterSourceDefinition,
} from "../../config/HoseWaterDefinition";

import type {
    HydrantPressureDefinition,
} from "../../config/HydrantPressureDefinition";

import {
    DEFAULT_HYDRANT_PRESSURE_DEFINITION,
    HydrantPressureState,
} from "../../config/HydrantPressureDefinition";

import type {
    WaterSource,
} from "../../environment/WaterSource";

import type {
    WaterSourceSystem,
} from "../../environment/WaterSourceSystem";

import {
    HoseRope,
} from "../../physics/rope/HoseRope";

import {
    HoseBallCollision,
} from "../../physics/rope/HoseBallCollision";

import {
    HydrantBallCollision,
} from "../../physics/HydrantBallCollision";

import {
    HoseGraphicsRenderer,
} from "./HoseGraphicsRenderer";

import {
    HydrantSpriteRenderer,
} from "./HydrantSpriteRenderer";

import {
    HosePressurePulseRenderer,
} from "./HosePressurePulseRenderer";

import {
    HoseNozzlePreSprayRenderer,
} from "./HoseNozzlePreSprayRenderer";

import {
    HydrantPressureController,
} from "./HydrantPressureController";

import {
    DEFAULT_HYDRANT_DAMAGE_DEFINITION,
} from "../../config/HydrantDamageDefinition";

import type {
    HydrantDamageDefinition,
} from "../../config/HydrantDamageDefinition";

import {
    HydrantDamageState,
} from "../../config/HydrantDamageState";

import {
    HydrantDamageController,
} from "./HydrantDamageController";

import type {
    HydrantImpactResult,
} from "./HydrantDamageController";

import {
    HydrantBurstWaterEmitter,
} from "../../environment/HydrantBurstWaterEmitter";

/**
 * Fixed Hydrant + physical segmented Hose mechanism.
 *
 * Phase 8B-10B.2 adds ownership of one registered DirectionalJet WaterSource.
 *
 * Phase 8B-10B.3 adds one-way dynamic nozzle coupling:
 *
 * - the source is registered from the current nozzle transform
 * - after rope physics and Ball collision, its runtime transform follows the
 *   final physical Hose segment every frame
 * - reset synchronizes the source immediately
 * - Phase 8B-10C replaces the temporary always-on stream with an authoritative
 *   Hydrant pressure cycle. Only Active enables Water emission.
 *
 * WaterSource never drives Hose physics.
 */
export class HydrantHose extends Entity {

    private readonly rope:
        HoseRope;

    private readonly collision:
        HoseBallCollision;

    private readonly hydrantBallCollision:
        HydrantBallCollision;

    private readonly renderer:
        HoseGraphicsRenderer;

    private readonly hydrantSpriteRenderer:
        HydrantSpriteRenderer;

    private readonly pressurePulseRenderer:
        HosePressurePulseRenderer;

    private readonly nozzlePreSprayRenderer:
        HoseNozzlePreSprayRenderer;

    private waterSource:
        WaterSource | null =
        null;

    private readonly pressureController:
        HydrantPressureController;

    private readonly damageController:
        HydrantDamageController;

    private readonly burstWaterEmitter:
        HydrantBurstWaterEmitter;

    constructor(
        private readonly waterSourceId:
            string,

        anchorX:
            number,

        anchorY:
            number,

        private readonly ball:
            Ball,

        private readonly waterSourceSystem:
            WaterSourceSystem,

        private readonly definition:
            HydrantHoseDefinition =
            DEFAULT_HYDRANT_HOSE_DEFINITION,

        pressureDefinition:
            HydrantPressureDefinition =
            DEFAULT_HYDRANT_PRESSURE_DEFINITION,

        damageDefinition:
            HydrantDamageDefinition =
            DEFAULT_HYDRANT_DAMAGE_DEFINITION,
    ) {
        super();

        this.pressureController =
            new HydrantPressureController(
                pressureDefinition,
            );

        this.damageController =
            new HydrantDamageController(
                damageDefinition,
            );

        this.burstWaterEmitter =
            new HydrantBurstWaterEmitter(
                waterSourceSystem,
                damageDefinition,
            );

        if (
            waterSourceId
                .trim()
                .length ===
            0
        ) {
            throw new Error(
                "HydrantHose Water source id must not be empty.",
            );
        }

        this.rope =
            new HoseRope(
                anchorX,
                anchorY,
                definition,
            );

        this.collision =
            new HoseBallCollision(
                this.rope,
                definition,
            );

        this.hydrantBallCollision =
            new HydrantBallCollision(
                definition,
            );

        this.renderer =
            new HoseGraphicsRenderer(
                definition,
            );

        this.hydrantSpriteRenderer =
            new HydrantSpriteRenderer(
                definition,
            );

        this.pressurePulseRenderer =
            new HosePressurePulseRenderer();

        this.nozzlePreSprayRenderer =
            new HoseNozzlePreSprayRenderer();
    }


    /**
     * Airborne presentation is exposed separately so World can reparent it
     * above gameplay actors without moving the physical Hydrant/Hose body.
     */
    public getNozzlePreSprayGraphics() {
        return this.nozzlePreSprayRenderer
            .getGraphics();
    }

    protected onInitialize():
        void {

        this.container.addChild(
            this.renderer
                .getGraphics(),
        );

        this.container.addChild(
            this.pressurePulseRenderer
                .getGraphics(),
        );

        this.container.addChild(
            this.hydrantSpriteRenderer
                .getSprite(),
        );

        this.container.addChild(
            this.nozzlePreSprayRenderer
                .getGraphics(),
        );

        this.renderer.redraw(
            this.rope,
        );

        this.synchronizeHydrantSprite();

        this.pressurePulseRenderer
            .reset();

        this.nozzlePreSprayRenderer
            .reset();

        this.registerWaterSource();
    }

    protected onUpdate(
        deltaTime:
            number,
    ): void {

        this.rope.update(
            deltaTime,
        );

        this.collision.resolve(
            this.ball,
        );

        /*
         * Phase 8B-10B.3:
         * Collision resolution can alter the final Hose points during this
         * frame, so synchronize only after authoritative rope + Ball response.
         */
        this.synchronizeWaterSourceTransform();

        this.damageController
            .update(
                deltaTime,
            );

        const hydrantAnchor =
            this.getAnchorPosition();

        const hydrantCollision =
            this.hydrantBallCollision
                .resolve(
                    this.ball,
                    hydrantAnchor.x,
                    hydrantAnchor.y,
                );

        /*
         * One physical contact can advance at most one damage state.
         * Weak contacts are still resolved physically but do not accumulate
         * hidden damage.
         */
        if (
            hydrantCollision
                .enteredContact &&
            hydrantCollision
                .impactNormalSpeed >
            0
        ) {
            this.applyBallImpact(
                hydrantCollision
                    .impactNormalSpeed,
            );
        }

        /*
         * Phase 8B-10C:
         * Pressure state is authoritative for Water emission. Rope physics and
         * nozzle coupling continue in every state, including Broken.
         */
        this.pressureController
            .update(
                deltaTime,
            );

        this.synchronizeWaterEnabledState();

        this.renderer.redraw(
            this.rope,
        );

        this.synchronizeHydrantSprite();

        this.pressurePulseRenderer
            .redraw(
                this.rope
                    .getPoints(),
                this.pressureController
                    .getState(),
                this.pressureController
                    .getStateProgress(),
            );

        const nozzlePosition =
            this.getNozzlePosition();

        this.nozzlePreSprayRenderer
            .redraw(
                nozzlePosition.x,
                nozzlePosition.y,
                this.getNozzleDirectionRadians(),
                this.pressureController
                    .getState(),
                this.pressureController
                    .getStateProgress(),
            );
    }

    protected onDestroy():
        void {

        this.unregisterWaterSource();

        this.nozzlePreSprayRenderer
            .destroy();

        this.pressurePulseRenderer
            .destroy();

        this.hydrantSpriteRenderer
            .destroy();

        this.renderer.destroy();

        this.container.destroy({
            children:
                false,
        });
    }

    public reset(
        randomValue?:
            number,
    ): void {

        this.rope.reset(
            randomValue,
        );

        /*
         * Reset changes the authoritative nozzle transform immediately.
         * Keep the registered source coherent in the same call.
         */
        this.synchronizeWaterSourceTransform();

        this.pressureController
            .reset();

        this.damageController
            .reset();

        this.burstWaterEmitter
            .reset();

        this.hydrantBallCollision
            .reset();

        this.hydrantSpriteRenderer
            .reset();

        this.synchronizeWaterEnabledState();

        this.renderer.redraw(
            this.rope,
        );

        this.synchronizeHydrantSprite();

        this.pressurePulseRenderer
            .reset();

        this.nozzlePreSprayRenderer
            .reset();
    }

    /**
     * Called by World after the general Hose-versus-world collision pass.
     * External rope correction happens after the normal Entity update, so the
     * Water source and presentation must be synchronized again in the same
     * frame.
     */
    public synchronizeAfterExternalCollision(): void {
        this.rope.resolveConstraintsImmediately();
        this.synchronizeWaterSourceTransform();
        this.renderer.redraw(this.rope);

        const nozzlePosition = this.getNozzlePosition();
        this.nozzlePreSprayRenderer.redraw(
            nozzlePosition.x,
            nozzlePosition.y,
            this.getNozzleDirectionRadians(),
            this.pressureController.getState(),
            this.pressureController.getStateProgress(),
        );
    }

    public getRope():
        HoseRope {

        return this.rope;
    }

    public getRopePoints() {
        return this.rope
            .getPoints();
    }

    public getAnchorPosition() {
        const point =
            this.rope
                .getPoints()[0]!;

        return {
            x:
                point.x,

            y:
                point.y,
        };
    }

    public getNozzlePosition() {
        const point =
            this.rope
                .getNozzlePoint();

        return {
            x:
                point.x,

            y:
                point.y,
        };
    }

    public getNozzleDirectionRadians():
        number {

        return this.rope
            .getNozzleDirectionRadians();
    }

    public getDefinition():
        HydrantHoseDefinition {

        return this.definition;
    }

    public getWaterSourceId():
        string {

        return this.waterSourceId;
    }

    /**
     * Exposed as a read-only runtime reference for later coupling and
     * diagnostics. Ownership remains with this HydrantHose + WaterSourceSystem.
     */
    public getWaterSource():
        WaterSource | null {

        return this.waterSource;
    }

    public setWaterEnabled(
        enabled:
            boolean,
    ): void {

        this.waterSource
            ?.setEnabled(
                enabled,
            );
    }

    public isWaterEnabled():
        boolean {

        return this.waterSource
            ?.isEnabled() ??
            false;
    }

    /**
     * Phase 8B-12 gameplay-facing Hose jet state.
     *
     * The pressure controller remains authoritative for the mechanism state,
     * while WaterSource enabled state remains authoritative for actual source
     * emission. Ball-force response requires both to agree.
     */
    public isJetActive():
        boolean {

        return (
            !this.pressureController
                .isBroken() &&
            this.pressureController
                .getState() ===
            HydrantPressureState.Active &&
            this.isWaterEnabled()
        );
    }

    public getPressureController():
        HydrantPressureController {

        return this.pressureController;
    }

    public getPressureState():
        HydrantPressureState {

        return this.pressureController
            .getState();
    }

    public getPressureStateProgress():
        number {

        return this.pressureController
            .getStateProgress();
    }

    public isBroken():
        boolean {

        return this.pressureController
            .isBroken();
    }

    public applyBallImpact(
        impactNormalSpeed:
            number,

        _legacyBallMass?:
            number,
    ): HydrantImpactResult {
        const result =
            this.damageController
                .applyImpact(
                    impactNormalSpeed,
                );

        if (
            result.stateChanged
        ) {
            this.hydrantSpriteRenderer
                .setDamageState(
                    result.state,
                );
        }

        if (
            result.destroyed
        ) {
            this.breakHydrant();
        }

        return result;
    }

    public getDamageController():
        HydrantDamageController {
        return this.damageController;
    }

    public getDamageState():
        HydrantDamageState {
        return this.damageController
            .getState();
    }

    public getDurabilityRatio():
        number {
        return this.damageController
            .getDurabilityRatio();
    }

    public breakHydrant():
        void {
        if (
            this.pressureController
                .isBroken()
        ) {
            return;
        }

        this.pressureController
            .break();

        this.hydrantSpriteRenderer
            .setDamageState(
                HydrantDamageState.Broken,
            );

        this.synchronizeWaterEnabledState();

        const anchor =
            this.getAnchorPosition();

        this.burstWaterEmitter
            .emitBurst(
                anchor.x,
                anchor.y,
                `${this.waterSourceId}-burst`,
            );
    }

    private registerWaterSource():
        void {

        if (
            this.waterSource
        ) {
            throw new Error(
                `HydrantHose Water source '${this.waterSourceId}' is already registered.`,
            );
        }

        const nozzlePosition =
            this.getNozzlePosition();

        const sourceDefinition =
            createHoseWaterSourceDefinition(
                this.waterSourceId,
                nozzlePosition.x,
                nozzlePosition.y,
                this.getNozzleDirectionRadians(),

                /*
                 * Phase 8B-10B.2 validates registration/lifecycle only.
                 * Keeping the source disabled prevents Water emission before
                 * dynamic nozzle coupling is introduced.
                 */
                false,
            );

        this.waterSource =
            this.waterSourceSystem
                .addSource(
                    sourceDefinition,
                );

        /*
         * Phase 8B-10C:
         * Source activation is derived exclusively from Hydrant pressure state.
         * The initial Inactive state therefore keeps the stream off.
         */
        this.synchronizeWaterEnabledState();
    }

    /**
     * Phase 8B-10B.3 authoritative physical Hose -> Water source bridge.
     *
     * The Water source reads the current nozzle transform. It never feeds
     * position or direction back into Hose physics.
     */
    public synchronizeWaterSourceTransform():
        void {

        if (
            !this.waterSource
        ) {
            return;
        }

        const nozzlePosition =
            this.getNozzlePosition();

        this.waterSource
            .setPosition(
                nozzlePosition.x,
                nozzlePosition.y,
            );

        this.waterSource
            .setDirectionRadians(
                this.getNozzleDirectionRadians(),
            );
    }

    private synchronizeWaterEnabledState():
        void {

        this.setWaterEnabled(
            this.pressureController
                .isWaterEmissionActive(),
        );
    }

    private synchronizeHydrantSprite():
        void {

        const anchor =
            this.getAnchorPosition();

        this.hydrantSpriteRenderer
            .setPosition(
                anchor.x,
                anchor.y,
            );

        this.hydrantSpriteRenderer
            .setDamageState(
                this.damageController
                    .getState(),
            );
    }

    private unregisterWaterSource():
        void {

        if (
            !this.waterSource
        ) {
            return;
        }

        this.waterSourceSystem
            .removeSource(
                this.waterSourceId,
            );

        this.waterSource =
            null;
    }
}
