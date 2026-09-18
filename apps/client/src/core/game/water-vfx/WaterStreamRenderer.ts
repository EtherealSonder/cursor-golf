import {
    Container,
    Graphics,
    Mesh,
    MeshGeometry,
} from "pixi.js";
import type { WaterVfxStreamDefinition } from "../config/WaterVfxDefinition";
import { HoseWaterShader } from "./HoseWaterShader";

export interface WaterStreamPoint {
    readonly x: number;
    readonly y: number;
}

export interface WaterStreamPresentation {
    readonly points: readonly WaterStreamPoint[];
    readonly startWidth: number;
    readonly middleWidth?: number;
    readonly endWidth: number;
    readonly minimumBodyWidth?: number;
    readonly downstreamDisturbanceMultiplier?: number;
    readonly bodyColor?: number;
    readonly highlightColor?: number;
    readonly bodyAlpha?: number;
    readonly highlightAlpha?: number;
    readonly highlightWidthFraction?: number;
    readonly highlightLength?: number;
    readonly highlightSpacing?: number;
    readonly highlightSpeed?: number;
    readonly fragmentColor?: number;
    readonly fragmentAlpha?: number;
    readonly fragmentWidthFraction?: number;
    readonly fragmentLength?: number;
    readonly fragmentSpacing?: number;
    readonly fragmentSpeed?: number;
    readonly resampleSpacing?: number;
    readonly centerWaveAmplitude?: number;
    readonly centerWaveFrequency?: number;
    readonly centerWaveSpeed?: number;
    readonly edgeWaveAmplitude?: number;
    readonly edgeWaveFrequency?: number;
    readonly edgeWaveSpeed?: number;

    readonly widthSquishAmplitude?: number;
    readonly widthSquishFrequency?: number;
    readonly widthSquishSpeed?: number;

    readonly edgeIrregularityAmplitude?: number;
    readonly edgeIrregularityFrequency?: number;
    readonly edgeIrregularitySpeed?: number;

    readonly movementSpread?: number;
    readonly maximumMovementSpread?: number;
    readonly movementSpreadRampExponent?: number;

    readonly phaseOffset?: number;

    /** 8I-6B.3 Hose-only textured internal-flow presentation. */
    readonly useFlowTexture?: boolean;
    readonly flowTextureWorldLength?: number;
    readonly flowTextureSpeed?: number;
    readonly centerlineSmoothingPasses?: number;
    readonly flowTextureContrast?: number;
    readonly flowTextureStrength?: number;

    readonly toonMidColor?: number;
    readonly toonMidThreshold?: number;
    readonly toonHighlightThreshold?: number;
    readonly toonMaskBlurPixels?: number;
    readonly toonMassCount?: number;
    readonly toonMassLengthFraction?: number;
    readonly toonMassWidthFraction?: number;
    readonly toonMassAsymmetry?: number;

    readonly sourceCapLength?: number;
    readonly downstreamCapLength?: number;
}

interface Sample extends WaterStreamPoint {
    readonly distance: number;
    readonly nx: number;
    readonly ny: number;
}

interface Slot {
    readonly container: Container;
    readonly body: Graphics;
    readonly highlight: Graphics;
    mesh: Mesh | null;
    material: HoseWaterShader | null;
    materialKey: string;
    presentation: WaterStreamPresentation | null;
}

/**
 * Current-frame Water ribbon reconstruction.
 *
 * 8I-6B.3 adds a Hose-only textured mesh. Authoritative trajectory and Water
 * transport remain entirely outside this renderer.
 */
export class WaterStreamRenderer {
    private readonly container = new Container();
    private readonly slots = new Map<string, Slot>();
    private animationTime = 0;

    public constructor(
        private readonly definition: WaterVfxStreamDefinition,
    ) { }

    public getContainer(): Container {
        return this.container;
    }

    public setStreamById(
        id: string,
        presentation: WaterStreamPresentation,
    ): void {
        if (
            presentation.points.length < 2 ||
            this.pathLength(presentation.points) < this.definition.minimumLength
        ) {
            this.hideStream(id);
            return;
        }

        const slot = this.getOrCreateSlot(id);
        slot.presentation = presentation;
        slot.container.visible = true;
        this.draw(slot);
    }

    public update(deltaTime: number): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
            return;
        }

        this.animationTime += deltaTime;

        this.slots.forEach((slot): void => {
            if (slot.container.visible && slot.presentation) {
                this.draw(slot);
            }
        });
    }

    public hideStream(id: string): void {
        const slot = this.slots.get(id);
        if (!slot) {
            return;
        }

        slot.container.visible = false;
        slot.presentation = null;
        slot.body.clear();
        slot.highlight.clear();

        if (slot.mesh) {
            slot.mesh.visible = false;
        }
    }

    public hideStreamsWithPrefix(prefix: string): void {
        this.slots.forEach((_slot, id): void => {
            if (id.startsWith(prefix)) {
                this.hideStream(id);
            }
        });
    }

    public reset(): void {
        this.animationTime = 0;
        this.slots.forEach((_slot, id): void => this.hideStream(id));
    }

    public destroy(): void {
        this.slots.forEach((slot): void => {
            if (slot.mesh) {
                slot.mesh.geometry.destroy();
                slot.mesh.destroy();
            }

            if (slot.material) {
                slot.material.destroy();
            }

            slot.body.destroy();
            slot.highlight.destroy();
            slot.container.destroy({ children: false });
        });

        this.slots.clear();
        this.container.removeFromParent();
        this.container.destroy({ children: false });
    }

    private draw(slot: Slot): void {
        const s = slot.presentation;
        if (!s) {
            return;
        }

        const total = this.pathLength(s.points);
        if (total <= 0) {
            return;
        }

        const rawSamples = this.resample(
            s.points,
            total,
            Math.max(3, s.resampleSpacing ?? 8),
        );

        if (rawSamples.length < 2) {
            return;
        }

        /*
         * 8I-6B.3A: smooth only the CURRENT reconstructed centerline.
         * No previous-frame positions are retained, so Hose rotation cannot
         * create trailing geometry or the old "spider-leg" behaviour.
         */
        const samples =
            this.smoothCurrentCenterline(
                rawSamples,
                Math.max(
                    0,
                    Math.floor(
                        s.centerlineSmoothingPasses ??
                        0,
                    ),
                ),
            );

        const smoothedTotal =
            samples[
                samples.length - 1
            ].distance;

        const phase = s.phaseOffset ?? 0;
        const left: WaterStreamPoint[] = [];
        const right: WaterStreamPoint[] = [];

        for (let index = 0; index < samples.length; index += 1) {
            const p = samples[index];
            const t = Math.min(1, p.distance / Math.max(0.0001, smoothedTotal));
            /*
             * 8I-6B.5B pressure-jet baseline.
             * Keep the taper mild and deliberately non-triangular:
             * source -> coherent middle -> substantial downstream core.
             */
            const middleWidth =
                s.middleWidth ??
                (s.startWidth + s.endWidth) * 0.5;

            /*
             * 8I-6B.5D diagnostic profile.
             * This is intentionally extreme: 10 px -> 25 px -> 50 px.
             * No organic width modulation is required to prove whether
             * normalized stream progress controls the final mesh.
             */
            let nominalBase: number;
            if (t <= 0.5) {
                const localT = t / 0.5;
                nominalBase =
                    s.startWidth +
                    (middleWidth - s.startWidth) * localT;
            } else {
                const localT = (t - 0.5) / 0.5;
                nominalBase =
                    middleWidth +
                    (s.endWidth - middleWidth) * localT;
            }

            const minimumBodyWidth =
                Math.max(
                    this.definition.minimumWidth,
                    s.minimumBodyWidth ?? s.startWidth,
                );
            nominalBase = Math.max(minimumBodyWidth, nominalBase)

            /*
             * Broad "squish" changes the Water body's thickness slowly along
             * its length. It is intentionally lower-frequency than the edge
             * breakup so the jet stops reading as a rigid constant-width band.
             */
            const squish =
                1 +
                Math.sin(
                    p.distance *
                    (s.widthSquishFrequency ?? 0) -
                    this.animationTime *
                    (s.widthSquishSpeed ?? 0) +
                    phase * 0.71,
                ) *
                Math.max(
                    0,
                    s.widthSquishAmplitude ?? 0,
                ) *
                (0.35 + t * 0.65);

            /*
             * A Hose sweep is already encoded by the current authoritative
             * packet chain. HoseWaterVfx converts that current-frame turning
             * into a bounded spread amount. Ramp it downstream so the nozzle
             * remains coherent while older Water fans out.
             */
            const spreadRamp =
                Math.pow(
                    t,
                    Math.max(
                        0.25,
                        s.movementSpreadRampExponent ??
                        1,
                    ),
                );
            const movementSpread =
                Math.min(
                    Math.max(
                        0,
                        s.maximumMovementSpread ??
                        0,
                    ),
                    Math.max(
                        0,
                        s.movementSpread ?? 0,
                    ),
                ) *
                spreadRamp;

            const base = this.clampWidth(
                nominalBase *
                squish +
                movementSpread,
            );

            const center =
                Math.sin(
                    p.distance * (s.centerWaveFrequency ?? 0) -
                    this.animationTime * (s.centerWaveSpeed ?? 0) +
                    phase,
                ) *
                Math.max(0, s.centerWaveAmplitude ?? 0);

            /*
             * The nozzle stays tight. Edge disturbance grows progressively
             * downstream without reducing the coherent body width.
             */
            const downstreamDisturbance =
                1 +
                t *
                (
                    Math.max(
                        1,
                        s.downstreamDisturbanceMultiplier ?? 1,
                    ) -
                    1
                );

            const edgeA =
                Math.sin(
                    p.distance * (s.edgeWaveFrequency ?? 0) -
                    this.animationTime * (s.edgeWaveSpeed ?? 0) +
                    phase * 1.37,
                ) *
                Math.max(0, s.edgeWaveAmplitude ?? 0) *
                downstreamDisturbance;
            const edgeB =
                Math.sin(
                    p.distance * (s.edgeWaveFrequency ?? 0) * 0.83 -
                    this.animationTime * (s.edgeWaveSpeed ?? 0) * 0.91 +
                    phase * 2.11,
                ) *
                Math.max(0, s.edgeWaveAmplitude ?? 0) *
                downstreamDisturbance;

            /*
             * A second, smaller asymmetric frequency roughens the actual mesh
             * boundary. Left and right deliberately use different phases and
             * frequencies so the silhouette cannot move as one rigid ribbon.
             */
            const irregularA =
                Math.sin(
                    p.distance *
                    (s.edgeIrregularityFrequency ?? 0) -
                    this.animationTime *
                    (s.edgeIrregularitySpeed ?? 0) +
                    phase * 2.73,
                ) *
                Math.max(
                    0,
                    s.edgeIrregularityAmplitude ?? 0,
                ) *
                downstreamDisturbance;
            const irregularB =
                Math.sin(
                    p.distance *
                    (s.edgeIrregularityFrequency ?? 0) *
                    1.19 -
                    this.animationTime *
                    (s.edgeIrregularitySpeed ?? 0) *
                    0.87 +
                    phase * 4.07,
                ) *
                Math.max(
                    0,
                    s.edgeIrregularityAmplitude ?? 0,
                ) *
                downstreamDisturbance;

            const cx = p.x + p.nx * center;
            const cy = p.y + p.ny * center;
            const minHalf = this.definition.minimumWidth * 0.5;
            /*
             * 8I-6B.5A volume bias changes which side carries more of the
             * current cross-section. Total width remains controlled, but the
             * centre of visual mass no longer sits perfectly between two
             * parallel boundaries.
             */
            const volumeBias =
                Math.sin(
                    p.distance *
                    (s.widthSquishFrequency ?? 0) *
                    0.61 -
                    this.animationTime *
                    (s.widthSquishSpeed ?? 0) *
                    0.73 +
                    phase * 3.17,
                ) *
                base *
                Math.max(0, s.widthSquishAmplitude ?? 0) *
                0.22;

            /*
             * Never allow the visible jet to collapse into a laser line.
             * Each side keeps at least half of the configured minimum body.
             */
            const profileMinHalf =
                Math.max(
                    minHalf,
                    minimumBodyWidth * 0.5,
                );

            const leftHalf = Math.max(
                profileMinHalf,
                base * 0.5 +
                edgeA +
                irregularA +
                volumeBias,
            );
            const rightHalf = Math.max(
                profileMinHalf,
                base * 0.5 +
                edgeB +
                irregularB -
                volumeBias,
            );

            left.push({
                x: cx + p.nx * leftHalf,
                y: cy + p.ny * leftHalf,
            });
            right.push({
                x: cx - p.nx * rightHalf,
                y: cy - p.ny * rightHalf,
            });
        }

        if (s.useFlowTexture) {
            const rendered = this.drawTexturedBody(
                slot,
                s,
                samples,
                left,
                right,
            );

            if (rendered) {
                slot.body.clear();
                slot.highlight.clear();
                return;
            }
        }

        if (slot.mesh) {
            slot.mesh.visible = false;
        }

        this.drawGraphicsBody(slot, s, samples, left, right);
        this.drawHighlights(
            slot.highlight,
            s,
            samples,
            smoothedTotal,
            phase,
        );
        this.drawHighlightFragments(
            slot.highlight,
            s,
            samples,
            smoothedTotal,
            phase,
        );
    }

    private drawTexturedBody(
        slot: Slot,
        s: WaterStreamPresentation,
        samples: readonly Sample[],
        left: readonly WaterStreamPoint[],
        right: readonly WaterStreamPoint[],
    ): boolean {
        const bodyColor = s.bodyColor ?? this.definition.bodyColor;
        const highlightColor = s.highlightColor ?? this.definition.highlightColor;
        const contrast = Math.max(0.1, s.flowTextureContrast ?? 1);
        const strength = this.clamp01(s.flowTextureStrength ?? 1);
        const toonMidColor = s.toonMidColor ?? bodyColor;
        const toonMidThreshold = this.clamp01(s.toonMidThreshold ?? 0.58);
        const toonHighlightThreshold = this.clamp01(
            s.toonHighlightThreshold ?? 0.80,
        );
        const toonMaskBlurPixels = Math.max(
            0,
            s.toonMaskBlurPixels ?? 0,
        );
        const toonMassCount = Math.max(2, s.toonMassCount ?? 6);
        const toonMassLengthFraction =
            this.clamp01(s.toonMassLengthFraction ?? 0.18);
        const toonMassWidthFraction =
            this.clamp01(s.toonMassWidthFraction ?? 0.60);
        const toonMassAsymmetry =
            this.clamp01(s.toonMassAsymmetry ?? 0.25);
        const materialKey =
            `${bodyColor}:${highlightColor}:${contrast}:${strength}:` +
            `${toonMidColor}:${toonMidThreshold}:${toonHighlightThreshold}:` +
            `${toonMaskBlurPixels}:${toonMassCount}:` +
            `${toonMassLengthFraction}:${toonMassWidthFraction}:` +
            `${toonMassAsymmetry}`;

        if (!slot.material || slot.materialKey !== materialKey) {
            if (slot.material) {
                slot.material.destroy();
            }

            slot.material = new HoseWaterShader(
                bodyColor,
                highlightColor,
                contrast,
                strength,
                toonMidColor,
                toonMidThreshold,
                toonHighlightThreshold,
                toonMaskBlurPixels,
                toonMassCount,
                toonMassLengthFraction,
                toonMassWidthFraction,
                toonMassAsymmetry,
            );
            slot.materialKey = materialKey;
        }

        const texture = slot.material.getTexture();
        if (!texture) {
            return false;
        }

        const worldLength = Math.max(24, s.flowTextureWorldLength ?? 150);
        const flowSpeed =
            HoseWaterShader.sanitizeFlowSpeed(
                s.flowTextureSpeed ?? 0,
            );
        const flowOffset =
            (
                this.animationTime *
                flowSpeed
            ) /
            worldLength;
        /*
         * 8I-6B.5 adds one centre tip at each terminal. The old mesh ended on
         * a left/right cross-section, which guaranteed a perfectly square
         * cut regardless of edge noise. Triangle tips create a rounded visual
         * termination once combined with the irregular neighbouring edges.
         */
        const bodyVertexCount = samples.length * 2;
        const startTipVertex = bodyVertexCount;
        const endTipVertex = bodyVertexCount + 1;
        const vertexCount = bodyVertexCount + 2;
        const positions = new Float32Array(vertexCount * 2);
        const uvs = new Float32Array(vertexCount * 2);
        const indices = new Uint32Array(
            (samples.length - 1) * 6 + 6,
        );

        for (let index = 0; index < samples.length; index += 1) {
            const vertex = index * 2;
            const positionIndex = vertex * 2;
            const u = samples[index].distance / worldLength - flowOffset;

            positions[positionIndex] = left[index].x;
            positions[positionIndex + 1] = left[index].y;
            positions[positionIndex + 2] = right[index].x;
            positions[positionIndex + 3] = right[index].y;

            uvs[positionIndex] = u;
            uvs[positionIndex + 1] = 0;
            uvs[positionIndex + 2] = u;
            uvs[positionIndex + 3] = 1;
        }

        for (let index = 0; index < samples.length - 1; index += 1) {
            const baseVertex = index * 2;
            const indexOffset = index * 6;

            indices[indexOffset] = baseVertex;
            indices[indexOffset + 1] = baseVertex + 1;
            indices[indexOffset + 2] = baseVertex + 2;
            indices[indexOffset + 3] = baseVertex + 1;
            indices[indexOffset + 4] = baseVertex + 3;
            indices[indexOffset + 5] = baseVertex + 2;
        }

        const first = samples[0];
        const second = samples[1];
        const last = samples[samples.length - 1];
        const beforeLast = samples[samples.length - 2];

        const startDx = second.x - first.x;
        const startDy = second.y - first.y;
        const startLength = Math.max(
            0.0001,
            Math.hypot(startDx, startDy),
        );
        const endDx = last.x - beforeLast.x;
        const endDy = last.y - beforeLast.y;
        const endLength = Math.max(
            0.0001,
            Math.hypot(endDx, endDy),
        );

        const sourceCapLength = Math.max(
            0,
            s.sourceCapLength ?? 0,
        );
        const downstreamCapLength = Math.max(
            0,
            s.downstreamCapLength ?? 0,
        );

        /*
         * Slight deterministic lateral offsets prevent the two tips from
         * looking like mathematically perfect arrowheads.
         */
        const startLateral =
            Math.sin(this.animationTime * 1.7 + (s.phaseOffset ?? 0)) *
            Math.min(1.25, sourceCapLength * 0.18);
        const endLateral =
            Math.sin(this.animationTime * 2.1 + (s.phaseOffset ?? 0) * 1.9) *
            Math.min(1.75, downstreamCapLength * 0.20);

        const startTipPosition = startTipVertex * 2;
        positions[startTipPosition] =
            first.x -
            (startDx / startLength) * sourceCapLength +
            first.nx * startLateral;
        positions[startTipPosition + 1] =
            first.y -
            (startDy / startLength) * sourceCapLength +
            first.ny * startLateral;
        uvs[startTipPosition] =
            -sourceCapLength / worldLength - flowOffset;
        uvs[startTipPosition + 1] = 0.5;

        const endTipPosition = endTipVertex * 2;
        positions[endTipPosition] =
            last.x +
            (endDx / endLength) * downstreamCapLength +
            last.nx * endLateral;
        positions[endTipPosition + 1] =
            last.y +
            (endDy / endLength) * downstreamCapLength +
            last.ny * endLateral;
        uvs[endTipPosition] =
            last.distance / worldLength +
            downstreamCapLength / worldLength -
            flowOffset;
        uvs[endTipPosition + 1] = 0.5;

        const capIndexOffset =
            (samples.length - 1) * 6;

        indices[capIndexOffset] = startTipVertex;
        indices[capIndexOffset + 1] = 1;
        indices[capIndexOffset + 2] = 0;

        const finalLeft = (samples.length - 1) * 2;
        const finalRight = finalLeft + 1;
        indices[capIndexOffset + 3] = finalLeft;
        indices[capIndexOffset + 4] = finalRight;
        indices[capIndexOffset + 5] = endTipVertex;

        const geometry = new MeshGeometry({
            positions,
            uvs,
            indices,
        });

        if (slot.mesh) {
            slot.mesh.geometry.destroy();
            slot.mesh.geometry = geometry;
            slot.mesh.texture = texture;
            slot.mesh.alpha = this.clamp01(
                s.bodyAlpha ?? this.definition.bodyAlpha,
            );
            slot.mesh.visible = true;
        } else {
            slot.mesh = new Mesh({
                geometry,
                texture,
            });
            slot.mesh.alpha = this.clamp01(
                s.bodyAlpha ?? this.definition.bodyAlpha,
            );
            slot.container.addChildAt(slot.mesh, 0);
        }

        return true;
    }

    private drawGraphicsBody(
        slot: Slot,
        s: WaterStreamPresentation,
        samples: readonly Sample[],
        left: readonly WaterStreamPoint[],
        right: readonly WaterStreamPoint[],
    ): void {
        const poly: number[] = [];

        for (let index = 0; index < left.length; index += 1) {
            poly.push(left[index].x, left[index].y);
        }

        for (let index = right.length - 1; index >= 0; index -= 1) {
            poly.push(right[index].x, right[index].y);
        }

        const bodyColor = s.bodyColor ?? this.definition.bodyColor;
        const bodyAlpha = this.clamp01(
            s.bodyAlpha ?? this.definition.bodyAlpha,
        );

        slot.body.clear().poly(poly).fill({
            color: bodyColor,
            alpha: bodyAlpha,
        });

        const first = samples[0];
        const last = samples[samples.length - 1];

        slot.body.circle(
            first.x,
            first.y,
            this.clampWidth(s.startWidth) * 0.5,
        ).fill({
            color: bodyColor,
            alpha: bodyAlpha,
        });

        slot.body.circle(
            last.x,
            last.y,
            this.clampWidth(s.endWidth) * 0.5,
        ).fill({
            color: bodyColor,
            alpha: bodyAlpha,
        });
    }

    private drawHighlights(
        graphics: Graphics,
        s: WaterStreamPresentation,
        points: readonly Sample[],
        total: number,
        phase: number,
    ): void {
        graphics.clear();
        const fraction = this.clamp01(
            s.highlightWidthFraction ?? this.definition.highlightWidthFraction,
        );
        const alpha = this.clamp01(
            s.highlightAlpha ?? this.definition.highlightAlpha,
        );

        if (fraction <= 0 || alpha <= 0) {
            return;
        }

        const spacing = Math.max(24, s.highlightSpacing ?? 52);
        const length = Math.max(
            5,
            Math.min(spacing * 0.55, s.highlightLength ?? 16),
        );
        const speed = Math.max(0, s.highlightSpeed ?? 150);
        const offset = (this.animationTime * speed + phase * 13) % spacing;

        for (let distance = offset; distance < total; distance += spacing) {
            const a = Math.max(1.5, distance);
            const b = Math.min(total - 1.5, distance + length);
            if (b <= a) {
                continue;
            }

            const pa = this.sampleResampled(points, a);
            const pb = this.sampleResampled(points, b);
            const t = Math.min(1, (a + b) * 0.5 / total);
            const width = this.clampWidth(
                s.startWidth + (s.endWidth - s.startWidth) * t,
            );

            graphics.moveTo(pa.x, pa.y).lineTo(pb.x, pb.y).stroke({
                width: Math.max(1, width * fraction),
                color: s.highlightColor ?? this.definition.highlightColor,
                alpha,
                cap: "round",
            });
        }
    }

    private drawHighlightFragments(
        graphics: Graphics,
        s: WaterStreamPresentation,
        points: readonly Sample[],
        total: number,
        phase: number,
    ): void {
        const fraction = this.clamp01(s.fragmentWidthFraction ?? 0);
        const alpha = this.clamp01(s.fragmentAlpha ?? 0);

        if (fraction <= 0 || alpha <= 0) {
            return;
        }

        const spacing = Math.max(36, s.fragmentSpacing ?? 86);
        const length = Math.max(
            4,
            Math.min(spacing * 0.35, s.fragmentLength ?? 12),
        );
        const speed = Math.max(0, s.fragmentSpeed ?? 78);
        const offset =
            (
                this.animationTime * speed +
                phase * 29 +
                spacing * 0.47
            ) %
            spacing;

        for (let distance = offset; distance < total; distance += spacing) {
            const a = Math.max(1.5, distance);
            const b = Math.min(total - 1.5, distance + length);
            if (b <= a) {
                continue;
            }

            const pa = this.sampleResampled(points, a);
            const pb = this.sampleResampled(points, b);
            const t = Math.min(1, (a + b) * 0.5 / total);
            const width = this.clampWidth(
                s.startWidth + (s.endWidth - s.startWidth) * t,
            );
            const sample = points[
                Math.min(
                    points.length - 1,
                    Math.max(0, Math.round(t * (points.length - 1))),
                )
            ];
            const lateral =
                width * 0.12 * Math.sin(distance * 0.071 + phase * 1.9);

            graphics
                .moveTo(
                    pa.x + sample.nx * lateral,
                    pa.y + sample.ny * lateral,
                )
                .lineTo(
                    pb.x + sample.nx * lateral,
                    pb.y + sample.ny * lateral,
                )
                .stroke({
                    width: Math.max(1, width * fraction),
                    color:
                        s.fragmentColor ??
                        s.highlightColor ??
                        this.definition.highlightColor,
                    alpha,
                    cap: "round",
                });
        }
    }

    private smoothCurrentCenterline(
        input: readonly Sample[],
        passes: number,
    ): Sample[] {
        if (
            passes <= 0 ||
            input.length < 3
        ) {
            return input.slice();
        }

        let points:
            WaterStreamPoint[] =
            input.map(
                (sample): WaterStreamPoint => ({
                    x: sample.x,
                    y: sample.y,
                }),
            );

        for (
            let pass = 0;
            pass < passes;
            pass += 1
        ) {
            if (points.length < 3) {
                break;
            }

            const next:
                WaterStreamPoint[] = [];

            // Preserve authoritative start exactly.
            next.push({
                x: points[0].x,
                y: points[0].y,
            });

            for (
                let index = 0;
                index < points.length - 1;
                index += 1
            ) {
                const a = points[index];
                const b = points[index + 1];

                const q = {
                    x: a.x * 0.75 + b.x * 0.25,
                    y: a.y * 0.75 + b.y * 0.25,
                };
                const r = {
                    x: a.x * 0.25 + b.x * 0.75,
                    y: a.y * 0.25 + b.y * 0.75,
                };

                if (index > 0) {
                    next.push(q);
                }

                if (
                    index <
                    points.length - 2
                ) {
                    next.push(r);
                }
            }

            // Preserve authoritative downstream endpoint exactly.
            const last =
                points[
                points.length - 1
                ];

            next.push({
                x: last.x,
                y: last.y,
            });

            points = next;
        }

        let distance = 0;
        const output:
            Sample[] = [];

        for (
            let index = 0;
            index < points.length;
            index += 1
        ) {
            if (index > 0) {
                distance +=
                    Math.hypot(
                        points[index].x -
                        points[index - 1].x,
                        points[index].y -
                        points[index - 1].y,
                    );
            }

            const previous =
                points[
                Math.max(
                    0,
                    index - 1,
                )
                ];
            const next =
                points[
                Math.min(
                    points.length - 1,
                    index + 1,
                )
                ];

            const dx =
                next.x -
                previous.x;
            const dy =
                next.y -
                previous.y;
            const length =
                Math.max(
                    0.0001,
                    Math.hypot(
                        dx,
                        dy,
                    ),
                );

            output.push({
                x: points[index].x,
                y: points[index].y,
                distance,
                nx: -dy / length,
                ny: dx / length,
            });
        }

        return output;
    }

    private resample(
        points: readonly WaterStreamPoint[],
        total: number,
        spacing: number,
    ): Sample[] {
        const count = Math.max(2, Math.ceil(total / spacing) + 1);
        const output: Sample[] = [];

        for (let index = 0; index < count; index += 1) {
            const distance =
                index === count - 1 ? total : Math.min(total, index * spacing);
            const point = this.sample(points, distance, total);
            const before = this.sample(
                points,
                Math.max(0, distance - spacing * 0.6),
                total,
            );
            const after = this.sample(
                points,
                Math.min(total, distance + spacing * 0.6),
                total,
            );
            const dx = after.x - before.x;
            const dy = after.y - before.y;
            const magnitude = Math.hypot(dx, dy) || 1;

            output.push({
                x: point.x,
                y: point.y,
                distance,
                nx: -dy / magnitude,
                ny: dx / magnitude,
            });
        }

        return output;
    }

    private sampleResampled(
        points: readonly Sample[],
        distance: number,
    ): WaterStreamPoint {
        if (distance <= 0) {
            return points[0];
        }

        for (let index = 1; index < points.length; index += 1) {
            const b = points[index];
            if (b.distance >= distance) {
                const a = points[index - 1];
                const span = Math.max(1e-6, b.distance - a.distance);
                const t = (distance - a.distance) / span;
                return {
                    x: a.x + (b.x - a.x) * t,
                    y: a.y + (b.y - a.y) * t,
                };
            }
        }

        return points[points.length - 1];
    }

    private sample(
        points: readonly WaterStreamPoint[],
        distance: number,
        total: number,
    ): WaterStreamPoint {
        let accumulated = 0;
        const target = Math.max(0, Math.min(total, distance));

        for (let index = 1; index < points.length; index += 1) {
            const a = points[index - 1];
            const b = points[index];
            const segment = Math.hypot(b.x - a.x, b.y - a.y);

            if (accumulated + segment >= target) {
                const t = segment > 0 ? (target - accumulated) / segment : 0;
                return {
                    x: a.x + (b.x - a.x) * t,
                    y: a.y + (b.y - a.y) * t,
                };
            }

            accumulated += segment;
        }

        return points[points.length - 1];
    }

    private pathLength(points: readonly WaterStreamPoint[]): number {
        let length = 0;

        for (let index = 1; index < points.length; index += 1) {
            length += Math.hypot(
                points[index].x - points[index - 1].x,
                points[index].y - points[index - 1].y,
            );
        }

        return length;
    }

    private getOrCreateSlot(id: string): Slot {
        const existing = this.slots.get(id);
        if (existing) {
            return existing;
        }

        const container = new Container();
        const body = new Graphics();
        const highlight = new Graphics();
        container.addChild(body, highlight);
        this.container.addChild(container);

        const slot: Slot = {
            container,
            body,
            highlight,
            mesh: null,
            material: null,
            materialKey: "",
            presentation: null,
        };

        this.slots.set(id, slot);
        return slot;
    }

    private clampWidth(value: number): number {
        return Number.isFinite(value)
            ? Math.max(
                this.definition.minimumWidth,
                Math.min(this.definition.maximumWidth, value),
            )
            : this.definition.minimumWidth;
    }

    private clamp01(value: number): number {
        return Math.max(0, Math.min(1, value));
    }
}
