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

                /*
                 * 8I-8A halo removal.
                 *
                 * Linear sampling is retained so the 8 px field grid stays
                 * hidden, but weak interpolated alpha below the wet boundary
                 * is discarded. The transition is intentionally narrow, and
                 * fully covered pixels preserve their original source alpha.
                 */
                float coverage =
                    smoothstep(
                        lower,
                        upper,
                        sourceAlpha
                    );

                float outputAlpha =
                    sourceAlpha *
                    coverage;

                if (
                    sourceAlpha <= lower
                ) {
                    outputAlpha = 0.0;
                }

                /*
                 * 8I-8A.1 premultiplied-alpha edge fix.
                 *
                 * Pixi's filter pipeline composites premultiplied color.
                 * The previous shader reduced alpha with coverage while
                 * leaving RGB untouched. At partially covered edge pixels
                 * that makes RGB too strong for the new alpha and produces
                 * the bright wet-ground rim visible while footprints shrink.
                 *
                 * Scale RGB by the same coverage used for alpha so the edge
                 * remains correctly premultiplied.
                 */
                vec3 outputRgb =
                    sampleColor.rgb *
                    coverage;

                if (
                    sourceAlpha <= lower
                ) {
                    outputRgb =
                        vec3(0.0);
                }

                gl_FragColor =
                    vec4(
                        outputRgb,
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
