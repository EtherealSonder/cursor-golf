import type {
    Camera,
} from "../camera/Camera";

import {
    DEFAULT_FIRE_DEBUG_DEFINITION,
    validateFireDebugDefinition,
} from "../config/FireDebugDefinition";

import type {
    FireDebugDefinition,
    FireDebugSizeDefinition,
} from "../config/FireDebugDefinition";

import type {
    FireManager,
} from "../environment/FireManager";

export interface RandomFireDebugResult {
    readonly centerX: number;
    readonly centerY: number;
    readonly radius: number;
    readonly requestedIgnitionCount: number;
    readonly ignitedCellCount: number;
}

export class FireDebugController {
    private readonly definition:
        FireDebugDefinition;

    constructor(
        private readonly camera:
            Camera,

        private readonly fireManager:
            FireManager,

        definition:
            FireDebugDefinition =
            DEFAULT_FIRE_DEBUG_DEFINITION,
    ) {
        validateFireDebugDefinition(
            definition,
        );

        this.definition =
            definition;
    }

    public generateRandomVisibleFire():
        RandomFireDebugResult | null {

        const size =
            this.pickRandomSize();

        const radius =
            this.randomRange(
                size.minimumRadius,
                size.maximumRadius,
            );

        const requestedIgnitionCount =
            this.randomIntegerInclusive(
                size.minimumIgnitionCount,
                size.maximumIgnitionCount,
            );

        const visibleBounds =
            this.getSafeVisibleBounds(
                radius,
            );

        if (!visibleBounds) {
            return null;
        }

        for (
            let attempt = 0;
            attempt <
            this.definition
                .placementAttemptCount;
            attempt += 1
        ) {
            const centerX =
                this.randomRange(
                    visibleBounds.minimumX,
                    visibleBounds.maximumX,
                );

            const centerY =
                this.randomRange(
                    visibleBounds.minimumY,
                    visibleBounds.maximumY,
                );

            const ignitedCellCount =
                this.fireManager
                    .igniteArea(
                        centerX,
                        centerY,
                        radius,
                        requestedIgnitionCount,
                    );

            if (ignitedCellCount <= 0) {
                continue;
            }

            return {
                centerX,
                centerY,
                radius,
                requestedIgnitionCount,
                ignitedCellCount,
            };
        }

        return null;
    }

    private getSafeVisibleBounds(
        radius: number,
    ): {
        readonly minimumX: number;
        readonly maximumX: number;
        readonly minimumY: number;
        readonly maximumY: number;
    } | null {
        const inset =
            this.definition.viewportMargin +
            radius;

        const minimumX =
            this.camera.getPositionX() +
            inset;

        const maximumX =
            this.camera.getPositionX() +
            this.camera.getViewportWidth() -
            inset;

        const minimumY =
            this.camera.getPositionY() +
            inset;

        const maximumY =
            this.camera.getPositionY() +
            this.camera.getViewportHeight() -
            inset;

        if (
            maximumX < minimumX ||
            maximumY < minimumY
        ) {
            return null;
        }

        return {
            minimumX,
            maximumX,
            minimumY,
            maximumY,
        };
    }

    private pickRandomSize():
        FireDebugSizeDefinition {

        const index =
            Math.floor(
                Math.random() *
                this.definition.sizes.length,
            );

        return (
            this.definition.sizes[index] ??
            this.definition.sizes[0]!
        );
    }

    private randomRange(
        minimum: number,
        maximum: number,
    ): number {
        if (maximum <= minimum) {
            return minimum;
        }

        return (
            minimum +
            Math.random() *
            (maximum - minimum)
        );
    }

    private randomIntegerInclusive(
        minimum: number,
        maximum: number,
    ): number {
        if (maximum <= minimum) {
            return minimum;
        }

        return (
            minimum +
            Math.floor(
                Math.random() *
                (
                    maximum -
                    minimum +
                    1
                ),
            )
        );
    }
}
