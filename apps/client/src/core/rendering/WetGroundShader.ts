import {
    Filter,
    GlProgram,
} from "pixi.js";

/**
 * Presentation-only filter for retained ground moisture.
 *
 * ScalarFieldTexture already uses linear sampling. This filter reshapes that
 * interpolated alpha into a tighter, antialiased illustrated boundary. It
 * never reads from or writes to EnvironmentField.
 */
export class WetGroundShader extends Filter {
    public constructor(
        edgeThreshold:
            number,

        edgeSoftness:
            number,
    ) {
        const fragment =
            `
            in vec2 vTextureCoord;

            uniform sampler2D uTexture;
            uniform float uEdgeThreshold;
            uniform float uEdgeSoftness;

            void main(void) {
                vec4 sampleColor =
                    texture(uTexture, vTextureCoord);

                float sourceAlpha =
                    sampleColor.a;

                float lower =
                    uEdgeThreshold;

                float upper =
                    min(
                        1.0,
                        uEdgeThreshold +
                        uEdgeSoftness
                    );

                float shaped =
                    smoothstep(
                        lower,
                        upper,
                        sourceAlpha
                    );

                float outputAlpha =
                    sourceAlpha *
                    shaped;

                gl_FragColor =
                    vec4(
                        sampleColor.rgb,
                        outputAlpha
                    );
            }
            `;

        super({
            glProgram:
                GlProgram.from({
                    vertex:
                        `
                        in vec2 aPosition;

                        out vec2 vTextureCoord;

                        uniform vec4 uInputSize;
                        uniform vec4 uOutputFrame;
                        uniform vec4 uOutputTexture;

                        vec4 filterVertexPosition(void) {
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
                                (2.0 * uOutputTexture.z / uOutputTexture.y) -
                                uOutputTexture.z;

                            return vec4(
                                position,
                                0.0,
                                1.0
                            );
                        }

                        vec2 filterTextureCoord(void) {
                            return aPosition *
                                (uOutputFrame.zw * uInputSize.zw);
                        }

                        void main(void) {
                            gl_Position =
                                filterVertexPosition();

                            vTextureCoord =
                                filterTextureCoord();
                        }
                        `,
                    fragment,
                    name:
                        "wet-ground-edge-filter",
                }),

            resources: {
                wetGroundUniforms: {
                    uEdgeThreshold: {
                        value:
                            edgeThreshold,
                        type:
                            "f32",
                    },

                    uEdgeSoftness: {
                        value:
                            edgeSoftness,
                        type:
                            "f32",
                    },
                },
            },
        });
    }
}
