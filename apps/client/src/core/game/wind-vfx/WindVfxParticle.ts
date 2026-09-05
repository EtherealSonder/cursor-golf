import {
    Sprite,
    Texture,
} from "pixi.js";

/**
 * Presentation-only runtime record for one pooled Wind Sprite.
 *
 * No value in this class is authoritative gameplay state.
 */
export class WindVfxParticle {

    public readonly sprite:
        Sprite;

    public active =
        false;

    public positionX =
        0;

    public positionY =
        0;

    public speed =
        0;

    /**
     * Logical visible Wind length in world pixels before mask-padding
     * compensation is applied.
     */
    public length =
        0;

    /**
     * Logical visible Wind thickness in world pixels before mask-padding
     * compensation is applied.
     */
    public width =
        0;

    public opacity =
        0;

    /**
     * Presentation-only multiplier used to create softer background wisps
     * without requiring additional textures or filters.
     */
    public softnessMultiplier =
        1;

    public age =
        0;

    public lifetime =
        0;

    /**
     * Forward centre distance from a Local Wind source outlet.
     */
    public distance =
        0;

    /**
     * Normalized lateral placement across a Local Wind tube.
     */
    public lateralRatio =
        0;

    /** Presentation-only lateral sine-wave parameters. */
    public sinePhase =
        0;

    public sineAmplitude =
        0;

    /** Cycles per second. */
    public sineFrequency =
        0;

    public sourceId:
        string | null =
        null;

    public constructor(
        texture:
            Texture,
    ) {
        this.sprite =
            new Sprite(
                texture,
            );

        this.sprite.anchor.set(
            0.5,
        );

        this.sprite.visible =
            false;
    }

    public setRenderedSize(
        lengthMultiplier:
            number,

        widthMultiplier:
            number,
    ): void {

        this.sprite.width =
            this.length *
            lengthMultiplier;

        this.sprite.height =
            this.width *
            widthMultiplier;
    }

    public reset(): void {
        this.active =
            false;

        this.positionX =
            0;

        this.positionY =
            0;

        this.speed =
            0;

        this.length =
            0;

        this.width =
            0;

        this.opacity =
            0;

        this.softnessMultiplier =
            1;

        this.age =
            0;

        this.lifetime =
            0;

        this.distance =
            0;

        this.lateralRatio =
            0;

        this.sinePhase =
            0;

        this.sineAmplitude =
            0;

        this.sineFrequency =
            0;

        this.sourceId =
            null;

        this.sprite.visible =
            false;

        this.sprite.alpha =
            0;

        this.sprite.rotation =
            0;

        this.sprite.position.set(
            0,
            0,
        );

        this.sprite.scale.set(
            1,
            1,
        );
    }

    public applyTexture(
        texture:
            Texture,
    ): void {

        this.sprite.texture =
            texture;
    }

    public destroy(): void {
        this.sprite
            .removeFromParent();

        this.sprite
            .destroy();
    }
}
