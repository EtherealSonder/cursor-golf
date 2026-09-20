import {
    Filter,
    GlProgram,
} from "pixi.js";

/**
 * Presentation-only bottom-up alpha dissolve for one Fire particle.
 *
 * The source flame texture remains unchanged. The filter raises a visibility
 * boundary from the bottom of the sprite toward the top as cutoffFromBottom
 * increases from 0 to 1.
 *
 * A very small feather prevents a harsh aliasing seam while preserving the
 * project's crisp illustrated Fire language.
 */
export class FireParticleDissolveFilter extends Filter {

    private readonly dissolveUniforms: {
        uCutoffFromBottom: number;
        uEdgeFeather: number;
    };

    public constructor() {

        const dissolveUniforms = {
            uCutoffFromBottom: {
                value: 0,
                type: "f32",
            },
            uEdgeFeather: {
                value: 0.018,
                type: "f32",
            },
        };

        const glProgram =
            GlProgram.from({
                vertex: `
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
                            (2.0 * uOutputTexture.z / uOutputTexture.y) -
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
                            (uOutputFrame.zw * uInputSize.zw);
                    }

                    void main(void)
                    {
                        gl_Position =
                            filterVertexPosition();

                        vTextureCoord =
                            filterTextureCoord();
                    }
                `,
                fragment: `
                    in vec2 vTextureCoord;

                    out vec4 finalColor;

                    uniform sampler2D uTexture;
                    uniform float uCutoffFromBottom;
                    uniform float uEdgeFeather;

                    void main(void)
                    {
                        vec4 color =
                            texture(
                                uTexture,
                                vTextureCoord
                            );

                        /*
                         * vTextureCoord.y grows from top to bottom.
                         *
                         * cutoffFromBottom = 0.0 -> full mask visible.
                         * cutoffFromBottom = 0.5 -> lower half removed.
                         * cutoffFromBottom = 1.0 -> mask fully removed.
                         */
                        float boundary =
                            1.0 -
                            clamp(
                                uCutoffFromBottom,
                                0.0,
                                1.0
                            );

                        float feather =
                            max(
                                uEdgeFeather,
                                0.0001
                            );

                        float visibility =
                            1.0 -
                            smoothstep(
                                boundary -
                                    feather,
                                boundary,
                                vTextureCoord.y
                            );

                        color.a *=
                            visibility;

                        finalColor =
                            color;
                    }
                `,
            });

        super({
            glProgram,
            resources: {
                dissolveUniforms,
            },
        });

        this.dissolveUniforms =
            this.resources
                .dissolveUniforms
                .uniforms as typeof this.dissolveUniforms;
    }

    public setCutoffFromBottom(
        value:
            number,
    ): void {

        this.dissolveUniforms
            .uCutoffFromBottom =
            this.clamp01(
                value,
            );
    }

    public setEdgeFeather(
        value:
            number,
    ): void {

        this.dissolveUniforms
            .uEdgeFeather =
            Math.max(
                0.0001,
                Math.min(
                    0.25,
                    value,
                ),
            );
    }

    public reset():
        void {

        this.setCutoffFromBottom(
            0,
        );
    }

    private clamp01(
        value:
            number,
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
