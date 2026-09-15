import {
    DEFAULT_RUNTIME_PERFORMANCE_PROFILER_DEFINITION,
    validateRuntimePerformanceProfilerDefinition,
} from "./RuntimePerformanceProfilerDefinition";

import type {
    RuntimePerformanceProfilerDefinition,
} from "./RuntimePerformanceProfilerDefinition";

export interface RuntimePerformanceSectionSnapshot {
    readonly name: string;
    readonly averageMilliseconds: number;
    readonly maximumMilliseconds: number;
}

export interface RuntimePerformanceSnapshot {
    readonly frameCount: number;
    readonly averageMeasuredFrameMilliseconds: number;
    readonly maximumMeasuredFrameMilliseconds: number;
    readonly sections: readonly RuntimePerformanceSectionSnapshot[];
    readonly counters: Readonly<Record<string, number>>;
}

interface SectionAccumulator {
    totalMilliseconds: number;
    maximumMilliseconds: number;
    sampleCount: number;
}

/**
 * Lightweight development profiler for the production World update pipeline.
 *
 * It deliberately uses performance.now() and fixed named sections instead of
 * browser-console profiling APIs so the same busy gameplay scenario can be
 * compared repeatedly while Water remains active.
 */
export class RuntimePerformanceProfiler {
    private readonly definition:
        RuntimePerformanceProfilerDefinition;

    private readonly sections =
        new Map<string, SectionAccumulator>();

    private readonly sectionStarts =
        new Map<string, number>();

    private readonly counters:
        Record<string, number> = {};

    private frameStartMilliseconds =
        0;

    private frameCount =
        0;

    private totalFrameMilliseconds =
        0;

    private maximumFrameMilliseconds =
        0;

    private latestSnapshot:
        RuntimePerformanceSnapshot = {
            frameCount: 0,
            averageMeasuredFrameMilliseconds: 0,
            maximumMeasuredFrameMilliseconds: 0,
            sections: [],
            counters: {},
        };

    public constructor(
        definition:
            RuntimePerformanceProfilerDefinition =
            DEFAULT_RUNTIME_PERFORMANCE_PROFILER_DEFINITION,
    ) {
        validateRuntimePerformanceProfilerDefinition(
            definition,
        );

        this.definition =
            definition;
    }

    public isEnabled():
        boolean {
        return this.definition.enabled;
    }

    public getDefinition():
        RuntimePerformanceProfilerDefinition {
        return this.definition;
    }

    public beginFrame():
        void {
        if (!this.definition.enabled) {
            return;
        }

        this.frameStartMilliseconds =
            performance.now();

        this.sectionStarts.clear();
    }

    public beginSection(
        name: string,
    ): void {
        if (!this.definition.enabled) {
            return;
        }

        this.sectionStarts.set(
            name,
            performance.now(),
        );
    }

    public endSection(
        name: string,
    ): void {
        if (!this.definition.enabled) {
            return;
        }

        const start =
            this.sectionStarts.get(
                name,
            );

        if (start === undefined) {
            return;
        }

        this.sectionStarts.delete(
            name,
        );

        const elapsed =
            Math.max(
                0,
                performance.now() -
                start,
            );

        const accumulator =
            this.sections.get(name) ?? {
                totalMilliseconds: 0,
                maximumMilliseconds: 0,
                sampleCount: 0,
            };

        accumulator.totalMilliseconds +=
            elapsed;

        accumulator.maximumMilliseconds =
            Math.max(
                accumulator.maximumMilliseconds,
                elapsed,
            );

        accumulator.sampleCount +=
            1;

        this.sections.set(
            name,
            accumulator,
        );
    }

    public recordExternalSection(
        name: string,
        elapsedMilliseconds: number,
    ): void {
        if (
            !this.definition.enabled ||
            !Number.isFinite(
                elapsedMilliseconds,
            ) ||
            elapsedMilliseconds < 0
        ) {
            return;
        }

        const accumulator =
            this.sections.get(name) ?? {
                totalMilliseconds: 0,
                maximumMilliseconds: 0,
                sampleCount: 0,
            };

        accumulator.totalMilliseconds +=
            elapsedMilliseconds;

        accumulator.maximumMilliseconds =
            Math.max(
                accumulator.maximumMilliseconds,
                elapsedMilliseconds,
            );

        accumulator.sampleCount +=
            1;

        this.sections.set(
            name,
            accumulator,
        );
    }

    public setCounter(
        name: string,
        value: number,
    ): void {
        if (
            !this.definition.enabled ||
            !Number.isFinite(value)
        ) {
            return;
        }

        this.counters[name] =
            value;
    }

    public endFrame():
        void {
        if (!this.definition.enabled) {
            return;
        }

        const elapsed =
            Math.max(
                0,
                performance.now() -
                this.frameStartMilliseconds,
            );

        this.totalFrameMilliseconds +=
            elapsed;

        this.maximumFrameMilliseconds =
            Math.max(
                this.maximumFrameMilliseconds,
                elapsed,
            );

        this.frameCount +=
            1;

        if (
            this.frameCount >=
            this.definition.sampleWindowFrames
        ) {
            this.publishSnapshot();
            this.resetWindow();
        }
    }

    public getSnapshot():
        RuntimePerformanceSnapshot {
        return this.latestSnapshot;
    }

    private publishSnapshot():
        void {
        const sections:
            RuntimePerformanceSectionSnapshot[] =
            [];

        for (
            const [
                name,
                accumulator,
            ]
            of this.sections
        ) {
            sections.push({
                name,
                averageMilliseconds:
                    accumulator.sampleCount > 0
                        ? accumulator.totalMilliseconds /
                        accumulator.sampleCount
                        : 0,
                maximumMilliseconds:
                    accumulator.maximumMilliseconds,
            });
        }

        sections.sort(
            (
                first,
                second,
            ): number =>
                second.averageMilliseconds -
                first.averageMilliseconds,
        );

        this.latestSnapshot = {
            frameCount:
                this.frameCount,

            averageMeasuredFrameMilliseconds:
                this.frameCount > 0
                    ? this.totalFrameMilliseconds /
                    this.frameCount
                    : 0,

            maximumMeasuredFrameMilliseconds:
                this.maximumFrameMilliseconds,

            sections,

            counters: {
                ...this.counters,
            },
        };
    }

    private resetWindow():
        void {
        this.sections.clear();
        this.sectionStarts.clear();

        this.frameCount =
            0;

        this.totalFrameMilliseconds =
            0;

        this.maximumFrameMilliseconds =
            0;
    }
}
