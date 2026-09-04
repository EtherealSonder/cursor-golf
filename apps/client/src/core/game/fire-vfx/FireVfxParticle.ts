import {
    Sprite,
    Texture,
} from "pixi.js";

export interface FireVfxParticleActivation {
    readonly x: number;
    readonly y: number;

    readonly velocityX: number;
    readonly velocityY: number;

    /**
     * FIRE-VFX-4 presentation-only Wind acceleration sampled when this
     * particle is spawned.
     *
     * Optional so the isolated diagnostic emitter and any future non-Wind
     * emitters naturally retain zero Wind response.
     */
    readonly windAccelerationX?: number;
    readonly windAccelerationY?: number;

    /**
     * Optional FIRE-VFX-5B age-dependent Wind influence.
     *
     * Omitted = full Wind influence for the entire particle lifetime.
     *
     * Jet particles use this so the near-nozzle stream stays relatively
     * straight while older/downstream flame bends progressively more.
     */
    readonly windInfluenceStartMultiplier?: number;
    readonly windInfluenceFullFraction?: number;
    readonly windInfluenceResponseExponent?: number;

    /**
     * FIRE-VFX-4B orientation response.
     *
     * Textures are authored vertically, so velocity-following rotation uses
     * a +PI/2 orientation offset internally.
     */
    readonly orientToVelocity?: boolean;
    readonly orientationFollowSpeed?: number;
    readonly angularVelocityRetention?: number;

    readonly lifetime: number;

    /**
     * Full active-life scale targets.
     *
     * FIRE-VFX-1 uses these values as a one-way stretch from the starting
     * dimensions toward the ending dimensions.
     *
     * End-of-life disappearance is handled primarily through alpha rather
     * than shrinking the particle back toward zero.
     */
    readonly startScaleX: number;
    readonly startScaleY: number;

    readonly endScaleX: number;
    readonly endScaleY: number;

    readonly maximumAlpha: number;

    readonly rotation: number;
    readonly angularVelocity: number;

    readonly flickerPhase: number;
    readonly flickerSpeed: number;
    readonly flickerAmount: number;

    /**
     * Compatibility names retained from the previous particle system.
     *
     * growEndFraction:
     * point at which the particle has fully emerged.
     *
     * shrinkStartFraction:
     * point at which alpha fading begins.
     *
     * FIRE-VFX-1 does not actually shrink the particle during the second
     * stage.
     */
    readonly growEndFraction: number;
    readonly shrinkStartFraction: number;

    readonly turbulenceAmplitude: number;
    readonly turbulenceFrequency: number;

    /**
     * Presentation-only thermal tint.
     */
    readonly tint?: number;
}

/**
 * One reusable presentation-only Fire particle.
 *
 * FIRE-VFX-1 lifecycle:
 *
 * spawn
 *   ↓
 * rapid emergence
 *   ↓
 * move + elongate
 *   ↓
 * continue travelling
 *   ↓
 * fade
 *   ↓
 * die
 *
 * The particle owns no:
 *
 * heat
 * fuel
 * ignition
 * burn
 * moisture
 * collision
 * spread
 *
 * Those remain simulation responsibilities.
 */
export class FireVfxParticle {

    private readonly sprite:
        Sprite;

    private active =
        false;

    private age =
        0;

    private lifetime =
        1;

    private velocityX =
        0;

    private velocityY =
        0;

    private windAccelerationX =
        0;

    private windAccelerationY =
        0;

    private windInfluenceStartMultiplier =
        1;

    private windInfluenceFullFraction =
        0;

    private windInfluenceResponseExponent =
        1;

    private orientToVelocity =
        false;

    private orientationFollowSpeed =
        0;

    private angularVelocityRetention =
        1;

    private startScaleX =
        1;

    private startScaleY =
        1;

    private endScaleX =
        1;

    private endScaleY =
        1;

    private maximumAlpha =
        1;

    private angularVelocity =
        0;

    private flickerPhase =
        0;

    private flickerSpeed =
        0;

    private flickerAmount =
        0;

    private growEndFraction =
        0.14;

    private shrinkStartFraction =
        0.58;

    private turbulenceAmplitude =
        0;

    private turbulenceFrequency =
        0;

    private previousTurbulenceOffsetX =
        0;

    private previousTurbulenceOffsetY =
        0;

    public constructor(
        texture: Texture,
    ) {

        this.sprite =
            new Sprite(
                texture,
            );

        this.sprite.anchor.set(
            0.5,
        );

        /*
         * FIRE-VFX-1 final mask pipeline:
         *
         * The Fire particle textures now contain genuine RGBA transparency.
         *
         * Because the black backgrounds have been removed from the source
         * textures, we no longer need additive blending to hide them.
         *
         * Normal alpha blending preserves the HOT / BODY / COOL palette
         * instead of allowing dense additive overlap to wash the Fire toward
         * white.
         */
        this.sprite.blendMode =
            "normal";

        this.sprite.visible =
            false;
    }

    public getSprite():
        Sprite {

        return this.sprite;
    }

    public isActive():
        boolean {

        return this.active;
    }

    public activate(
        texture: Texture,
        activation:
            FireVfxParticleActivation,
    ): void {

        this.active =
            true;

        this.age =
            0;

        this.lifetime =
            Math.max(
                0.001,
                activation.lifetime,
            );

        this.velocityX =
            activation.velocityX;

        this.velocityY =
            activation.velocityY;

        this.windAccelerationX =
            Number.isFinite(
                activation.windAccelerationX,
            )
                ? activation.windAccelerationX ?? 0
                : 0;

        this.windAccelerationY =
            Number.isFinite(
                activation.windAccelerationY,
            )
                ? activation.windAccelerationY ?? 0
                : 0;

        this.windInfluenceStartMultiplier =
            this.clamp01(
                Number.isFinite(
                    activation.windInfluenceStartMultiplier,
                )
                    ? activation.windInfluenceStartMultiplier ?? 1
                    : 1,
            );

        this.windInfluenceFullFraction =
            this.clamp01(
                Number.isFinite(
                    activation.windInfluenceFullFraction,
                )
                    ? activation.windInfluenceFullFraction ?? 0
                    : 0,
            );

        this.windInfluenceResponseExponent =
            Math.max(
                0.01,
                Number.isFinite(
                    activation.windInfluenceResponseExponent,
                )
                    ? activation.windInfluenceResponseExponent ?? 1
                    : 1,
            );

        this.orientToVelocity =
            activation.orientToVelocity ??
            false;

        this.orientationFollowSpeed =
            Math.max(
                0,
                Number.isFinite(
                    activation.orientationFollowSpeed,
                )
                    ? activation.orientationFollowSpeed ?? 0
                    : 0,
            );

        this.angularVelocityRetention =
            this.clamp01(
                Number.isFinite(
                    activation.angularVelocityRetention,
                )
                    ? activation.angularVelocityRetention ?? 1
                    : 1,
            );

        this.startScaleX =
            Math.max(
                0,
                activation.startScaleX,
            );

        this.startScaleY =
            Math.max(
                0,
                activation.startScaleY,
            );

        this.endScaleX =
            Math.max(
                0,
                activation.endScaleX,
            );

        this.endScaleY =
            Math.max(
                0,
                activation.endScaleY,
            );

        this.maximumAlpha =
            this.clamp01(
                activation.maximumAlpha,
            );

        this.angularVelocity =
            activation.angularVelocity;

        this.flickerPhase =
            activation.flickerPhase;

        this.flickerSpeed =
            activation.flickerSpeed;

        this.flickerAmount =
            Math.max(
                0,
                activation.flickerAmount,
            );

        this.growEndFraction =
            Math.max(
                0.01,
                Math.min(
                    0.49,
                    activation.growEndFraction,
                ),
            );

        this.shrinkStartFraction =
            Math.max(
                this.growEndFraction +
                0.01,
                Math.min(
                    0.99,
                    activation.shrinkStartFraction,
                ),
            );

        this.turbulenceAmplitude =
            Math.max(
                0,
                activation.turbulenceAmplitude,
            );

        this.turbulenceFrequency =
            Math.max(
                0,
                activation.turbulenceFrequency,
            );

        this.previousTurbulenceOffsetX =
            0;

        this.previousTurbulenceOffsetY =
            0;

        this.sprite.texture =
            texture;

        this.sprite.tint =
            activation.tint ??
            0xffffff;

        this.sprite.position.set(
            activation.x,
            activation.y,
        );

        this.sprite.rotation =
            activation.rotation;

        /*
         * Begin essentially invisible.
         *
         * This prevents particles visibly popping into existence at their
         * authored dimensions.
         */
        this.sprite.scale.set(
            0.001,
            0.001,
        );

        this.sprite.alpha =
            0;

        this.sprite.visible =
            true;
    }

    public update(
        deltaTime: number,
    ): boolean {

        if (!this.active) {
            return false;
        }

        this.age +=
            deltaTime;

        if (
            this.age >=
            this.lifetime
        ) {

            this.deactivate();

            return false;
        }

        // ---------------------------------------------------
        // FIRE-VFX-4 / FIRE-VFX-5B Wind acceleration
        // ---------------------------------------------------

        /*
         * Local Wind is sampled once at spawn by the emitter.
         *
         * Ground Fire omits the FIRE-VFX-5B age-response values, so its
         * Wind influence remains 1.0 for the entire lifetime.
         *
         * Jet Fire supplies an age-dependent response:
         *
         * near nozzle  -> low Wind influence
         * downstream   -> progressively stronger Wind influence
         *
         * This preserves powered Jet momentum near the source while letting
         * crosswind bend and break up the visible plume farther away.
         */
        const normalizedAgeForWind =
            this.clamp01(
                this.age /
                this.lifetime,
            );

        const windInfluence =
            this.getWindInfluence(
                normalizedAgeForWind,
            );

        this.velocityX +=
            this.windAccelerationX *
            windInfluence *
            deltaTime;

        this.velocityY +=
            this.windAccelerationY *
            windInfluence *
            deltaTime;

        // ---------------------------------------------------
        // Translation
        // ---------------------------------------------------

        this.sprite.x +=
            this.velocityX *
            deltaTime;

        this.sprite.y +=
            this.velocityY *
            deltaTime;

        // ---------------------------------------------------
        // Rotation
        // ---------------------------------------------------

        if (
            this.orientToVelocity &&
            this.orientationFollowSpeed >
            0
        ) {
            this.applyVelocityOrientation(
                deltaTime,
            );
        } else {
            this.sprite.rotation +=
                this.angularVelocity *
                deltaTime;
        }

        // ---------------------------------------------------
        // Normalized lifetime
        // ---------------------------------------------------

        const normalizedAge =
            this.clamp01(
                this.age /
                this.lifetime,
            );

        // ---------------------------------------------------
        // One-way shape evolution
        // ---------------------------------------------------

        const baseScaleX =
            this.lerp(
                this.startScaleX,
                this.endScaleX,
                normalizedAge,
            );

        const baseScaleY =
            this.lerp(
                this.startScaleY,
                this.endScaleY,
                normalizedAge,
            );

        const emergence =
            this.getEmergenceEnvelope(
                normalizedAge,
            );

        const fade =
            this.getFadeEnvelope(
                normalizedAge,
            );

        // ---------------------------------------------------
        // Restrained flicker
        // ---------------------------------------------------

        const flickerWave =
            Math.sin(
                this.flickerPhase +
                this.age *
                this.flickerSpeed,
            );

        /*
         * Flicker remains deliberately restrained.
         *
         * Fire motion should primarily come from:
         *
         * translation
         * particle overlap
         * elongation
         * turbulence
         * particle birth
         * particle death
         *
         * We do not want obvious rhythmic grow/shrink animation.
         */
        const scaleFlicker =
            1 +
            flickerWave *
            this.flickerAmount *
            0.30;

        const scaleX =
            Math.max(
                0.001,

                baseScaleX *
                emergence *
                scaleFlicker,
            );

        const scaleY =
            Math.max(
                0.001,

                baseScaleY *
                emergence *
                (
                    1 +
                    flickerWave *
                    this.flickerAmount *
                    0.18
                ),
            );

        this.sprite.scale.set(
            scaleX,
            scaleY,
        );

        // ---------------------------------------------------
        // Alpha
        // ---------------------------------------------------

        const alphaFlicker =
            1 +
            flickerWave *
            this.flickerAmount;

        this.sprite.alpha =
            this.clamp01(
                this.maximumAlpha *
                emergence *
                fade *
                alphaFlicker,
            );

        // ---------------------------------------------------
        // Turbulence
        // ---------------------------------------------------

        this.applyTurbulence(
            normalizedAge,
        );

        return true;
    }

    public deactivate():
        void {

        this.active =
            false;

        this.sprite.visible =
            false;

        this.sprite.alpha =
            0;

        this.sprite.scale.set(
            0.001,
            0.001,
        );

        this.windAccelerationX =
            0;

        this.windAccelerationY =
            0;

        this.windInfluenceStartMultiplier =
            1;

        this.windInfluenceFullFraction =
            0;

        this.windInfluenceResponseExponent =
            1;

        this.orientToVelocity =
            false;

        this.orientationFollowSpeed =
            0;

        this.angularVelocityRetention =
            1;
    }

    public destroy():
        void {

        this.sprite.destroy({
            texture:
                false,
        });
    }

    // -------------------------------------------------------
    // FIRE-VFX-5B Age-dependent Wind response
    // -------------------------------------------------------

    private getWindInfluence(
        normalizedAge:
            number,
    ): number {

        /*
         * fullInfluenceFraction <= 0 is the default shared-particle behavior:
         * apply full Wind immediately. This keeps Ground Fire unchanged.
         */
        if (
            this.windInfluenceFullFraction <=
            0
        ) {
            return 1;
        }

        const progress =
            this.clamp01(
                normalizedAge /
                this.windInfluenceFullFraction,
            );

        const shapedProgress =
            Math.pow(
                progress,
                this.windInfluenceResponseExponent,
            );

        return this.lerp(
            this.windInfluenceStartMultiplier,
            1,
            shapedProgress,
        );
    }

    // -------------------------------------------------------
    // FIRE-VFX-4B Velocity orientation
    // -------------------------------------------------------

    private applyVelocityOrientation(
        deltaTime:
            number,
    ): void {

        const speedSquared =
            this.velocityX *
            this.velocityX +
            this.velocityY *
            this.velocityY;

        if (
            speedSquared <=
            0.0001
        ) {
            this.sprite.rotation +=
                this.angularVelocity *
                this.angularVelocityRetention *
                deltaTime;

            return;
        }

        /*
         * atan2() returns the angle of the velocity vector assuming the
         * texture's forward axis points along +X.
         *
         * Our Fire masks are authored vertically with their long axis along
         * Y, so +PI/2 aligns the sprite's vertical axis with travel.
         */
        const targetRotation =
            Math.atan2(
                this.velocityY,
                this.velocityX,
            ) +
            Math.PI /
            2;

        const angularOffset =
            this.getShortestAngleDifference(
                this.sprite.rotation,
                targetRotation,
            );

        const followAmount =
            1 -
            Math.exp(
                -this.orientationFollowSpeed *
                deltaTime,
            );

        this.sprite.rotation +=
            angularOffset *
            followAmount;

        /*
         * Keep a restrained fraction of the original angular velocity so the
         * flame remains organic rather than behaving like a rigid arrow.
         */
        this.sprite.rotation +=
            this.angularVelocity *
            this.angularVelocityRetention *
            deltaTime;
    }

    private getShortestAngleDifference(
        from:
            number,

        to:
            number,
    ): number {

        let difference =
            (
                to -
                from +
                Math.PI
            ) %
            (
                Math.PI *
                2
            );

        if (
            difference <
            0
        ) {
            difference +=
                Math.PI *
                2;
        }

        return (
            difference -
            Math.PI
        );
    }

    // -------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------

    private getEmergenceEnvelope(
        normalizedAge: number,
    ): number {

        if (
            normalizedAge >=
            this.growEndFraction
        ) {
            return 1;
        }

        return this.smoothStep(
            normalizedAge /
            this.growEndFraction,
        );
    }

    private getFadeEnvelope(
        normalizedAge: number,
    ): number {

        if (
            normalizedAge <=
            this.shrinkStartFraction
        ) {
            return 1;
        }

        const fadeProgress =
            (
                normalizedAge -
                this.shrinkStartFraction
            ) /
            (
                1 -
                this.shrinkStartFraction
            );

        return (
            1 -
            this.smoothStep(
                fadeProgress,
            )
        );
    }

    // -------------------------------------------------------
    // Turbulence
    // -------------------------------------------------------

    private applyTurbulence(
        normalizedAge: number,
    ): void {

        if (
            this.turbulenceAmplitude <=
            0
        ) {
            return;
        }

        const phase =
            this.flickerPhase +
            this.age *
            this.turbulenceFrequency;

        /*
         * Reduce turbulence near death so fading fragments do not visibly
         * snap sideways immediately before disappearing.
         */
        const deathDamping =
            1 -
            this.smoothStep(
                Math.max(
                    0,
                    (
                        normalizedAge -
                        0.72
                    ) /
                    0.28,
                ),
            );

        const offsetX =
            Math.sin(
                phase,
            ) *
            this.turbulenceAmplitude *
            deathDamping;

        const offsetY =
            Math.cos(
                phase *
                0.73,
            ) *
            this.turbulenceAmplitude *
            0.28 *
            deathDamping;

        /*
         * Apply the change in turbulence offset rather than accumulating the
         * entire sinusoidal offset every frame.
         */
        this.sprite.x +=
            offsetX -
            this.previousTurbulenceOffsetX;

        this.sprite.y +=
            offsetY -
            this.previousTurbulenceOffsetY;

        this.previousTurbulenceOffsetX =
            offsetX;

        this.previousTurbulenceOffsetY =
            offsetY;
    }

    // -------------------------------------------------------
    // Utilities
    // -------------------------------------------------------

    private smoothStep(
        value: number,
    ): number {

        const clamped =
            this.clamp01(
                value,
            );

        return (
            clamped *
            clamped *
            (
                3 -
                2 *
                clamped
            )
        );
    }

    private lerp(
        start: number,
        end: number,
        amount: number,
    ): number {

        return (
            start +
            (
                end -
                start
            ) *
            amount
        );
    }

    private clamp01(
        value: number,
    ): number {

        return Math.max(
            0,
            Math.min(
                1,
                value,
            ),
        );
    }
}