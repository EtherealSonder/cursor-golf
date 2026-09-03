import type {
    FireSourceDefinition,
} from "../config/FireSourceDefinition";

import {
    FireSourceType,
    validateFireSourceDefinition,
} from "../config/FireSourceDefinition";

import type {
    EnvironmentField,
} from "./EnvironmentField";

import {
    FireSource,
} from "./FireSource";

import {
    DEFAULT_DIRECTIONAL_FIRE_SOURCE_DEFINITION,
} from "../config/DirectionalFireSourceDefinition";

/**
 * Authoritative collection and lifecycle owner for gameplay Fire sources.
 *
 * 4B-6A establishes identity, mutation, lifecycle and World integration.
 * Source-specific heat deposition is added in 4B-6B and 4B-6C.
 */
export class FireSourceSystem {
    private readonly sources: FireSource[] = [];

    private readonly sourceById =
        new Map<string, FireSource>();

    constructor(
        private readonly environmentField: EnvironmentField,
    ) { }

    public update(deltaTime: number): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
            return;
        }

        for (const source of this.sources) {
            source.update(deltaTime);

            if (!source.isEnabled()) {
                continue;
            }

            const definition =
                source.getDefinition();

            switch (definition.type) {
                case FireSourceType.Point:
                    this.updatePointSource(
                        source,
                        definition.radius,
                        definition.heatAmount,
                    );
                    break;

                case FireSourceType.Persistent:
                    this.environmentField.depositHeat(
                        source.getPositionX(),
                        source.getPositionY(),
                        definition.radius,
                        definition.heatPerSecond *
                        deltaTime,
                    );
                    break;

                case FireSourceType.Directional:
                    this.updateDirectionalSource(
                        source,
                        definition.length,
                        definition.heatPerSecond,
                        definition.endHeatMultiplier,
                        deltaTime,
                    );
                    break;
            }
        }
    }

    private updateDirectionalSource(
        source: FireSource,
        length: number,
        heatPerSecond: number,
        endHeatMultiplier: number,
        deltaTime: number,
    ): void {
        const tuning =
            DEFAULT_DIRECTIONAL_FIRE_SOURCE_DEFINITION;

        const spacing =
            Math.max(
                1,
                tuning.sampleSpacing,
            );

        const sampleCount =
            Math.max(
                1,
                Math.ceil(
                    length /
                    spacing,
                ),
            );

        const direction =
            source.getDirectionRadians();

        const directionX =
            Math.cos(direction);

        const directionY =
            Math.sin(direction);

        /*
         * Model the jet as heat density along a stream rather than one
         * fixed heat budget divided across the whole length.
         *
         * Spacing normalization keeps heat per unit length approximately
         * stable if sample density is tuned later.
         */
        const spacingDensityScale =
            spacing /
            Math.max(
                1,
                tuning.heatDensityReferenceSpacing,
            );

        const baseHeatPerSample =
            heatPerSecond *
            deltaTime *
            spacingDensityScale;

        for (
            let sampleIndex = 0;
            sampleIndex <= sampleCount;
            sampleIndex += 1
        ) {
            const normalizedDistance =
                sampleIndex /
                sampleCount;

            const distance =
                normalizedDistance *
                length;

            const heatMultiplier =
                1 +
                (
                    endHeatMultiplier -
                    1
                ) *
                normalizedDistance;

            const sampleX =
                source.getPositionX() +
                directionX *
                distance;

            const sampleY =
                source.getPositionY() +
                directionY *
                distance;

            this.environmentField.depositHeat(
                sampleX,
                sampleY,
                tuning.sampleRadius,
                baseHeatPerSample *
                heatMultiplier,
            );
        }
    }

    private updatePointSource(
        source: FireSource,
        radius: number,
        heatAmount: number,
    ): void {
        if (
            source.hasConsumedPointEmission()
        ) {
            return;
        }

        this.environmentField.depositHeat(
            source.getPositionX(),
            source.getPositionY(),
            radius,
            heatAmount,
        );

        source.markPointEmissionConsumed();
    }

    public addSource(
        definition: FireSourceDefinition,
    ): FireSource {
        validateFireSourceDefinition(definition);

        if (this.sourceById.has(definition.id)) {
            throw new Error(
                `Fire source "${definition.id}" already exists.`,
            );
        }

        const source =
            new FireSource(definition);

        this.sources.push(source);
        this.sourceById.set(
            definition.id,
            source,
        );

        return source;
    }

    public removeSource(
        sourceId: string,
    ): boolean {
        const source =
            this.sourceById.get(sourceId);

        if (!source) {
            return false;
        }

        this.sourceById.delete(sourceId);

        const index =
            this.sources.indexOf(source);

        if (index >= 0) {
            this.sources.splice(index, 1);
        }

        return true;
    }

    public clearSources(): void {
        this.sources.length = 0;
        this.sourceById.clear();
    }

    public setSourceDirection(
        sourceId: string,
        directionRadians: number,
    ): boolean {
        const source = this.sourceById.get(sourceId);
        if (!source) return false;
        source.setDirectionRadians(directionRadians);
        return true;
    }

    public setSourcePosition(
        sourceId: string,
        x: number,
        y: number,
    ): boolean {
        const source = this.sourceById.get(sourceId);
        if (!source) return false;
        source.setPosition(x, y);
        return true;
    }

    public setSourceEnabled(
        sourceId: string,
        enabled: boolean,
    ): boolean {
        const source =
            this.sourceById.get(sourceId);

        if (!source) {
            return false;
        }

        source.setEnabled(enabled);
        return true;
    }

    public getSourceById(
        sourceId: string,
    ): FireSource | null {
        return this.sourceById.get(sourceId) ?? null;
    }

    public getSources():
        readonly FireSource[] {
        return this.sources;
    }

    public getActiveSourceCount():
        number {
        let count = 0;

        for (const source of this.sources) {
            if (source.isEnabled()) {
                count += 1;
            }
        }

        return count;
    }

    public reset(): void {
        for (const source of this.sources) {
            source.resetRuntimeState();
        }
    }
}
