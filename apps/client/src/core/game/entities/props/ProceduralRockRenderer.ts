import { Container, Graphics } from "pixi.js";
import {
    DEFAULT_ROCK_PRESENTATION_DEFINITION,
    type RockPresentationDefinition,
    type RockVisualProfile,
} from "../../config/RockPresentationDefinition";
import { RockPresentationType } from "./RockPresentationType";

interface Point {
    readonly x: number;
    readonly y: number;
}

/** Deterministic, presentation-only top-down rock renderer. */
export class ProceduralRockRenderer {
    private readonly container = new Container();
    private readonly graphics = new Graphics();

    public constructor(
        type: RockPresentationType,
        radius: number,
        seed: number,
        definition: RockPresentationDefinition = DEFAULT_ROCK_PRESENTATION_DEFINITION,
    ) {
        this.container.addChild(this.graphics);
        this.draw(type, radius, seed, definition);
    }

    public getContainer(): Container {
        return this.container;
    }

    public destroy(): void {
        this.container.removeFromParent();
        this.container.destroy({ children: true });
    }

    private draw(
        type: RockPresentationType,
        radius: number,
        seed: number,
        definition: RockPresentationDefinition,
    ): void {
        const profile = type === RockPresentationType.Boulder
            ? definition.boulder
            : definition.smallRock;
        const random = this.createRandom(seed);
        const palette = definition.palettes[
            Math.floor(random() * definition.palettes.length)
        ];
        const vertexCount = this.randomInteger(
            random,
            profile.minimumVertices,
            profile.maximumVertices,
        );
        const points = type === RockPresentationType.Boulder
            ? this.createBoulderSilhouette(random, radius, vertexCount, profile)
            : this.createSilhouette(random, radius, vertexCount, profile);

        this.graphics.poly(this.flatten(points), true)
            .fill(palette.body)
            .stroke({ color: palette.outline, width: profile.outlineWidth, join: "round" });

        this.drawFacet(
            random,
            points,
            radius,
            palette.facet,
            palette.detail,
            0,
        );

        if (random() < profile.crackProbability) {
            this.drawCrack(random, radius, palette.detail, profile.outlineWidth);
        }
    }

    private createSilhouette(
        random: () => number,
        radius: number,
        vertexCount: number,
        profile: RockVisualProfile,
    ): Point[] {
        const points: Point[] = [];
        const phase = random() * Math.PI * 2;
        let previousScale = 0.92 + random() * 0.12;

        for (let index = 0; index < vertexCount; index += 1) {
            const angleBase = phase + (index / vertexCount) * Math.PI * 2;
            const angleJitter = (random() - 0.5) * (Math.PI * 2 / vertexCount) * 0.24;
            const targetScale = 1 + (random() * 2 - 1) * profile.radialVariation;
            const scale = previousScale * 0.42 + targetScale * 0.58;
            previousScale = scale;
            points.push({
                x: Math.cos(angleBase + angleJitter) * radius * scale,
                y: Math.sin(angleBase + angleJitter) * radius * scale,
            });
        }
        return points;
    }

    /**
     * Large boulders use broad correlated contour changes rather than many
     * independently noisy vertices. This produces a chunky illustrated mass
     * instead of a low-poly asteroid silhouette.
     */
    private createBoulderSilhouette(
        random: () => number,
        radius: number,
        vertexCount: number,
        profile: RockVisualProfile,
    ): Point[] {
        const phase = random() * Math.PI * 2;
        const raw: number[] = [];

        for (let index = 0; index < vertexCount; index += 1) {
            raw.push(
                1 + (random() * 2 - 1) * profile.radialVariation,
            );
        }

        return raw.map((value, index) => {
            const previous = raw[
                (index - 1 + vertexCount) % vertexCount
            ];
            const next = raw[(index + 1) % vertexCount];
            const scale =
                previous * 0.22 +
                value * 0.56 +
                next * 0.22;
            const angle =
                phase +
                (index / vertexCount) * Math.PI * 2 +
                (random() - 0.5) *
                    (Math.PI * 2 / vertexCount) *
                    0.08;

            return {
                x: Math.cos(angle) * radius * scale,
                y: Math.sin(angle) * radius * scale,
            };
        });
    }

    private drawFacet(
        random: () => number,
        _silhouette: readonly Point[],
        radius: number,
        facetColor: number,
        _detailColor: number,
        _index: number,
    ): void {
        const count = 5;
        const phase = random() * Math.PI * 2;
        const size = radius * (0.34 + random() * 0.07);
        const offsetX = -radius * (0.08 + random() * 0.05);
        const offsetY = -radius * (0.07 + random() * 0.05);
        const facet: Point[] = [];

        for (let index = 0; index < count; index += 1) {
            const angle = phase + (index / count) * Math.PI * 2;
            const scale = 0.78 + random() * 0.22;
            facet.push({
                x: offsetX + Math.cos(angle) * size * scale,
                y: offsetY + Math.sin(angle) * size * scale,
            });
        }

        this.graphics.poly(this.flatten(facet), true).fill(facetColor);
    }

    private drawCrack(
        random: () => number,
        radius: number,
        color: number,
        outlineWidth: number,
    ): void {
        const angle = random() * Math.PI * 2;
        const startRadius = radius * (0.10 + random() * 0.12);
        const midRadius = radius * (0.30 + random() * 0.10);
        const endRadius = radius * (0.48 + random() * 0.10);
        const startX = Math.cos(angle) * startRadius;
        const startY = Math.sin(angle) * startRadius;
        const midX = Math.cos(angle + 0.22) * midRadius;
        const midY = Math.sin(angle + 0.22) * midRadius;
        const endX = Math.cos(angle - 0.10) * endRadius;
        const endY = Math.sin(angle - 0.10) * endRadius;
        this.graphics.moveTo(startX, startY)
            .lineTo(midX, midY)
            .lineTo(endX, endY)
            .stroke({ color, width: Math.max(1.2, outlineWidth * 0.48), cap: "round", join: "round" });
    }

    private flatten(points: readonly Point[]): number[] {
        const values: number[] = [];
        for (const point of points) values.push(point.x, point.y);
        return values;
    }

    private randomInteger(random: () => number, minimum: number, maximum: number): number {
        return minimum + Math.floor(random() * (maximum - minimum + 1));
    }

    private createRandom(seed: number): () => number {
        let state = (seed >>> 0) || 0x6d2b79f5;
        return (): number => {
            state += 0x6d2b79f5;
            let value = state;
            value = Math.imul(value ^ (value >>> 15), value | 1);
            value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
            return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
        };
    }
}
