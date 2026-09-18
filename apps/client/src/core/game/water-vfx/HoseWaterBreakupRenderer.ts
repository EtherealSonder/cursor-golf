import {
    Container,
    Graphics,
} from "pixi.js";

export interface HoseWaterBreakupDefinition {
    readonly bodyColor: number;
    readonly midColor: number;
    readonly highlightColor: number;
    readonly bodyAlpha: number;
    readonly maximumFragments: number;
    readonly minimumLifetimeSeconds: number;
    readonly maximumLifetimeSeconds: number;
    readonly minimumSizeFraction: number;
    readonly maximumSizeFraction: number;
    readonly minimumSeparation: number;
    readonly maximumSeparation: number;
    readonly travelSpeed: number;
}

export interface HoseWaterBreakupSpawn {
    readonly x: number;
    readonly y: number;
    readonly directionX: number;
    readonly directionY: number;
    readonly terminalWidth: number;
    readonly intensity: number;
    readonly phase: number;
}

interface Fragment {
    readonly graphics: Graphics;
    velocityX: number;
    velocityY: number;
    age: number;
    lifetime: number;
    size: number;
    phase: number;
}

/**
 * 8I-6C.4 presentation-only extreme-motion breakup.
 *
 * This renderer never creates Water, changes packet transport, deposits Water,
 * or feeds state back into gameplay. It renders at most a few short-lived
 * downstream lobes when HoseWaterVfx explicitly requests an extreme breakup.
 */
export class HoseWaterBreakupRenderer {
    private readonly container = new Container();
    private readonly fragments: Fragment[] = [];

    public constructor(
        private readonly definition: HoseWaterBreakupDefinition,
    ) { }

    public getContainer(): Container {
        return this.container;
    }

    public spawn(
        request: HoseWaterBreakupSpawn,
    ): void {
        const maximumFragments =
            Math.max(
                1,
                Math.min(
                    3,
                    Math.floor(this.definition.maximumFragments),
                ),
            );

        const normalized =
            Math.max(
                0,
                Math.min(1, request.intensity),
            );

        const desiredCount =
            Math.max(
                1,
                Math.min(
                    maximumFragments,
                    1 +
                    Math.floor(normalized * maximumFragments),
                ),
            );

        for (
            let index = 0;
            index < desiredCount;
            index += 1
        ) {
            if (
                this.fragments.length >=
                maximumFragments
            ) {
                break;
            }

            const fraction =
                desiredCount <= 1
                    ? 0.5
                    : index / (desiredCount - 1);

            const separation =
                this.lerp(
                    this.definition.minimumSeparation,
                    this.definition.maximumSeparation,
                    fraction,
                );

            const lateralX =
                -request.directionY;
            const lateralY =
                request.directionX;

            const lateral =
                Math.sin(
                    request.phase +
                    index * 2.17,
                ) *
                request.terminalWidth *
                0.16 *
                normalized;

            const x =
                request.x +
                request.directionX * separation +
                lateralX * lateral;
            const y =
                request.y +
                request.directionY * separation +
                lateralY * lateral;

            const sizeFraction =
                this.lerp(
                    this.definition.minimumSizeFraction,
                    this.definition.maximumSizeFraction,
                    0.35 +
                    0.65 *
                    Math.abs(
                        Math.sin(
                            request.phase +
                            index * 1.31,
                        ),
                    ),
                );

            const size =
                Math.max(
                    2,
                    request.terminalWidth *
                    sizeFraction,
                );

            const lifetime =
                this.lerp(
                    this.definition.minimumLifetimeSeconds,
                    this.definition.maximumLifetimeSeconds,
                    0.5 +
                    0.5 *
                    Math.sin(
                        request.phase * 0.73 +
                        index * 1.91,
                    ),
                );

            const speed =
                this.definition.travelSpeed *
                (0.82 + fraction * 0.26);

            const graphics = new Graphics();
            this.container.addChild(graphics);

            this.fragments.push({
                graphics,
                velocityX:
                    request.directionX * speed +
                    lateralX * lateral * 1.8,
                velocityY:
                    request.directionY * speed +
                    lateralY * lateral * 1.8,
                age: 0,
                lifetime:
                    Math.max(0.01, lifetime),
                size,
                phase:
                    request.phase +
                    index * 1.37,
            });

            graphics.position.set(x, y);
            this.redraw(
                this.fragments[
                    this.fragments.length - 1
                ],
            );
        }
    }

    public update(
        deltaTime: number,
    ): void {
        if (
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            return;
        }

        for (
            let index =
                this.fragments.length - 1;
            index >= 0;
            index -= 1
        ) {
            const fragment =
                this.fragments[index];

            fragment.age += deltaTime;

            if (
                fragment.age >=
                fragment.lifetime
            ) {
                fragment.graphics.destroy();
                this.fragments.splice(index, 1);
                continue;
            }

            fragment.graphics.x +=
                fragment.velocityX *
                deltaTime;
            fragment.graphics.y +=
                fragment.velocityY *
                deltaTime;

            this.redraw(fragment);
        }
    }

    public reset(): void {
        for (
            let index = 0;
            index < this.fragments.length;
            index += 1
        ) {
            this.fragments[index].graphics.destroy();
        }

        this.fragments.length = 0;
    }

    public destroy(): void {
        this.reset();
        this.container.removeFromParent();
        this.container.destroy({ children: false });
    }

    private redraw(
        fragment: Fragment,
    ): void {
        const progress =
            Math.max(
                0,
                Math.min(
                    1,
                    fragment.age /
                    fragment.lifetime,
                ),
            );
        const alpha =
            this.definition.bodyAlpha *
            (1 - progress);
        const wobble =
            Math.sin(
                fragment.phase +
                progress * Math.PI * 1.4,
            ) *
            fragment.size *
            0.10;

        fragment.graphics
            .clear()
            .ellipse(
                wobble,
                0,
                fragment.size,
                fragment.size * 0.62,
            )
            .fill({
                color:
                    this.definition.bodyColor,
                alpha,
            })
            .ellipse(
                wobble - fragment.size * 0.10,
                -fragment.size * 0.08,
                fragment.size * 0.48,
                fragment.size * 0.24,
            )
            .fill({
                color:
                    this.definition.midColor,
                alpha:
                    alpha * 0.82,
            });
    }

    private lerp(
        a: number,
        b: number,
        t: number,
    ): number {
        return a + (b - a) * t;
    }
}
