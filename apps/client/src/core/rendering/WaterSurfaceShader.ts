import {
    Filter,
    GlProgram,
    Texture,
} from "pixi.js";

export interface WaterSurfaceShaderDefinition {
    readonly minimumVisibleDepthNormalized:
    number;

    readonly edgeTransitionDepthNormalized:
    number;

    readonly waterColor:
    number;

    readonly waterAlpha:
    number;
}

/**
 * Creates Water Shader V1.
 *
 * The filter's normal uTexture is only the presentation quad. Water depth is
 * bound separately as uWaterDepthTexture and sampled explicitly.
 */
export function createWaterSurfaceShader(
    depthTexture:
        Texture,

    definition:
        WaterSurfaceShaderDefinition,
): Filter {

    const red =
        (
            (
                definition.waterColor >>
                16
            ) &
            0xff
        ) /
        255;

    const green =
        (
            (
                definition.waterColor >>
                8
            ) &
            0xff
        ) /
        255;

    const blue =
        (
            definition.waterColor &
            0xff
        ) /
        255;

    const waterAlpha =
        Math.max(
            0,
            Math.min(
                1,
                definition.waterAlpha,
            ),
        );

    const minimumVisibleDepth =
        Math.max(
            0,
            Math.min(
                1,
                definition
                    .minimumVisibleDepthNormalized,
            ),
        );

    const edgeTransitionDepth =
        Math.max(
            minimumVisibleDepth +
            1 / 255,
            Math.min(
                1,
                definition
                    .edgeTransitionDepthNormalized,
            ),
        );

    const vertex = `
        in vec2 aPosition;

        out vec2 vTextureCoord;

        uniform vec4 uInputSize;
        uniform vec4 uOutputFrame;
        uniform vec4 uOutputTexture;

        vec4 filterVertexPosition(void)
        {
            vec2 position =
                aPosition *
                uOutputFrame.zw +
                uOutputFrame.xy;

            position.x =
                position.x *
                (2.0 / uOutputTexture.x) -
                1.0;

            position.y =
                position.y *
                (2.0 * uOutputTexture.z /
                uOutputTexture.y) -
                uOutputTexture.z;

            return vec4(
                position,
                0.0,
                1.0
            );
        }

        vec2 filterTextureCoord(void)
        {
            return aPosition *
                (
                    uOutputFrame.zw *
                    uInputSize.zw
                );
        }

        void main(void)
        {
            gl_Position =
                filterVertexPosition();

            vTextureCoord =
                filterTextureCoord();
        }
    `;

    const fragment = `
        in vec2 vTextureCoord;

        out vec4 finalColor;

        uniform sampler2D uWaterDepthTexture;

        uniform vec4 uWaterColor;
        uniform float uMinimumVisibleDepth;
        uniform float uEdgeTransitionDepth;

        void main(void)
        {
            float depth =
                texture(
                    uWaterDepthTexture,
                    vTextureCoord
                ).r;

            float coverage =
                smoothstep(
                    uMinimumVisibleDepth,
                    uEdgeTransitionDepth,
                    depth
                );

            finalColor =
                vec4(
                    uWaterColor.rgb,
                    uWaterColor.a *
                    coverage
                );
        }
    `;

    const glProgram =
        new GlProgram({
            vertex,
            fragment,
            name:
                "cursor-golf-water-surface-v1",
        });

    return new Filter({
        glProgram,

        resources: {
            /*
             * Explicit scalar-data sampler. It is independent of the filter's
             * intermediate input texture.
             */
            uWaterDepthTexture:
                depthTexture.source,

            waterSurfaceUniforms: {
                uWaterColor: {
                    value: [
                        red,
                        green,
                        blue,
                        waterAlpha,
                    ],
                    type:
                        "vec4<f32>",
                },

                uMinimumVisibleDepth: {
                    value:
                        minimumVisibleDepth,
                    type:
                        "f32",
                },

                uEdgeTransitionDepth: {
                    value:
                        edgeTransitionDepth,
                    type:
                        "f32",
                },
            },
        },
    });
}
