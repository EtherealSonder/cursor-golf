import {
    Container,
    Graphics,
    Text,
    TextStyle,
} from "pixi.js";

import type {
    RuntimePerformanceSnapshot,
} from "./RuntimePerformanceProfiler";

import type {
    RuntimePerformanceProfilerDefinition,
} from "./RuntimePerformanceProfilerDefinition";

const MARGIN = 12;
const PADDING_X = 10;
const PADDING_Y = 8;
const LINE_HEIGHT = 14;

/**
 * Small development-only overlay for RuntimePerformanceProfiler.
 * It refreshes text at a controlled rate so the profiler UI does not itself
 * become a meaningful per-frame workload.
 */
export class RuntimePerformanceProfilerOverlay {
    private readonly container =
        new Container();

    private readonly background =
        new Graphics();

    private readonly text =
        new Text({
            text:
                "RUNTIME PROFILER\ncollecting samples...",

            style:
                new TextStyle({
                    fontFamily:
                        "monospace",

                    fontSize:
                        10,

                    fill:
                        0xffffff,

                    lineHeight:
                        LINE_HEIGHT,
                }),
        });

    private refreshAccumulator =
        0;

    private viewportWidth =
        0;

    public constructor(
        private readonly definition:
            RuntimePerformanceProfilerDefinition,
    ) {
        this.container.addChild(
            this.background,
        );

        this.container.addChild(
            this.text,
        );

        this.text.position.set(
            PADDING_X,
            PADDING_Y,
        );

        this.redrawBackground();
    }

    public getContainer():
        Container {
        return this.container;
    }

    public setViewportSize(
        width: number,
        _height: number,
    ): void {
        this.viewportWidth =
            Math.max(
                0,
                width,
            );

        this.reposition();
    }

    public update(
        deltaTime: number,
        snapshot: RuntimePerformanceSnapshot,
    ): void {
        this.refreshAccumulator +=
            Math.max(
                0,
                deltaTime,
            );

        if (
            this.refreshAccumulator <
            this.definition.overlayRefreshSeconds
        ) {
            return;
        }

        this.refreshAccumulator =
            0;

        const lines:
            string[] = [
                "RUNTIME PROFILER",
                `FPS ${snapshot.approximateFps.toFixed(1)}  |  frame avg ${snapshot.averageMeasuredFrameMilliseconds.toFixed(2)} ms  max ${snapshot.maximumMeasuredFrameMilliseconds.toFixed(2)} ms`,
                `Over budget ${snapshot.overBudgetFrameCount}/${snapshot.frameCount}  (> ${this.definition.frameBudgetMilliseconds.toFixed(2)} ms)`,
                "",
            ];

        if (
            snapshot.sections.length === 0
        ) {
            lines.push(
                "collecting samples...",
            );
        } else {
            for (
                const section
                of snapshot.sections.slice(0, this.definition.maximumDisplayedSections)
            ) {
                const marker =
                    section.averageMilliseconds >=
                    this.definition
                        .slowSectionWarningMilliseconds
                        ? "!"
                        : " ";

                lines.push(
                    `${marker} ${section.name.padEnd(22)} ${section.averageMilliseconds.toFixed(2).padStart(6)} ms  max ${section.maximumMilliseconds.toFixed(2).padStart(6)}`,
                );
            }
        }

        lines.push(
            "",
            "WORKLOAD",
        );

        for (
            const [
                name,
                value,
            ]
            of Object.entries(
                snapshot.counters,
            )
        ) {
            lines.push(
                `${name.padEnd(24)} ${Math.round(value)}`,
            );
        }

        this.text.text =
            lines.join("\n");

        this.redrawBackground();
        this.reposition();
    }

    public destroy():
        void {
        this.container.destroy({
            children: true,
        });
    }

    private redrawBackground():
        void {
        const width =
            Math.max(
                330,
                this.text.width +
                PADDING_X * 2,
            );

        const height =
            this.text.height +
            PADDING_Y * 2;

        this.background.clear();

        this.background
            .roundRect(
                0,
                0,
                width,
                height,
                5,
            )
            .fill({
                color:
                    0x111418,

                alpha:
                    0.88,
            })
            .stroke({
                color:
                    0xffffff,

                alpha:
                    0.12,

                width:
                    1,
            });
    }

    private reposition():
        void {
        const width =
            Math.max(
                330,
                this.text.width +
                PADDING_X * 2,
            );

        this.container.position.set(
            Math.max(
                MARGIN,
                this.viewportWidth -
                width -
                MARGIN,
            ),
            MARGIN,
        );
    }
}
