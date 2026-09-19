import { Texture } from "pixi.js";

/** Reusable, generated texture vocabulary for shared Water impact presentation. */
export interface WaterImpactTextureSet {
    readonly splashLobes: readonly Texture[];
    readonly roundDroplets: readonly Texture[];
    readonly teardropDroplets: readonly Texture[];
    readonly elongatedDroplets: readonly Texture[];
    readonly surfaceDisturbances: readonly Texture[];
    readonly ripples: readonly Texture[];
}

export function destroyWaterImpactTextureSet(set: WaterImpactTextureSet): void {
    const unique = new Set<Texture>();
    for (const group of [
        set.splashLobes,
        set.roundDroplets,
        set.teardropDroplets,
        set.elongatedDroplets,
        set.surfaceDisturbances,
        set.ripples,
    ]) {
        for (const texture of group) unique.add(texture);
    }
    for (const texture of unique) texture.destroy(true);
}


/**
 * Ball-only neutral splash texture vocabulary.
 *
 * These textures are generated from neutral grayscale pixels rather than the
 * cyan Water textures. Pixi tint is multiplicative, so tinting a cyan source
 * white cannot remove its cyan RGB. Starting from neutral source pixels lets
 * the Ball splash render genuinely white/grey.
 */
export interface BallSplashNeutralTextureSet {
    readonly roundDroplets: readonly Texture[];
}

export function createBallSplashNeutralTextureSet():
    BallSplashNeutralTextureSet {

    return {
        roundDroplets: [
            createNeutralRoundDropletTexture(
                "#FFFFFF",
                "#F2F2F0",
            ),
            createNeutralRoundDropletTexture(
                "#F7F7F5",
                "#D8DAD8",
            ),
            createNeutralRoundDropletTexture(
                "#FFFFFF",
                "#E5E7E5",
            ),
        ],
    };
}

export function destroyBallSplashNeutralTextureSet(
    set:
        BallSplashNeutralTextureSet,
): void {

    const unique =
        new Set<Texture>(
            set.roundDroplets,
        );

    for (
        const texture of
        unique
    ) {
        texture.destroy(
            true,
        );
    }
}

function createNeutralRoundDropletTexture(
    centerColor:
        string,

    edgeColor:
        string,
): Texture {

    const size =
        32;

    const canvas =
        document.createElement(
            "canvas",
        );

    canvas.width =
        size;

    canvas.height =
        size;

    const context =
        canvas.getContext(
            "2d",
        );

    if (!context) {
        return Texture.WHITE;
    }

    context.clearRect(
        0,
        0,
        size,
        size,
    );

    const center =
        size *
        0.5;

    const radius =
        size *
        0.42;

    const gradient =
        context.createRadialGradient(
            center -
                radius *
                0.18,
            center -
                radius *
                0.22,
            radius *
                0.08,
            center,
            center,
            radius,
        );

    gradient.addColorStop(
        0,
        centerColor,
    );

    gradient.addColorStop(
        0.70,
        centerColor,
    );

    gradient.addColorStop(
        1,
        edgeColor,
    );

    context.fillStyle =
        gradient;

    context.beginPath();

    context.arc(
        center,
        center,
        radius,
        0,
        Math.PI *
            2,
    );

    context.fill();

    return Texture.from(
        canvas,
    );
}
