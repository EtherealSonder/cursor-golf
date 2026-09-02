export interface FireDebugSizeDefinition {
    readonly minimumRadius: number;
    readonly maximumRadius: number;
    readonly minimumIgnitionCount: number;
    readonly maximumIgnitionCount: number;
}

export interface FireDebugDefinition {
    readonly viewportMargin: number;
    readonly placementAttemptCount: number;

    readonly sizes: readonly FireDebugSizeDefinition[];
}

export const DEFAULT_FIRE_DEBUG_DEFINITION: FireDebugDefinition = {
    viewportMargin: 72,
    placementAttemptCount: 24,

    sizes: [
        {
            minimumRadius: 20,
            maximumRadius: 40,
            minimumIgnitionCount: 1,
            maximumIgnitionCount: 3,
        },
        {
            minimumRadius: 45,
            maximumRadius: 80,
            minimumIgnitionCount: 4,
            maximumIgnitionCount: 7,
        },
        {
            minimumRadius: 85,
            maximumRadius: 130,
            minimumIgnitionCount: 8,
            maximumIgnitionCount: 14,
        },
    ],
};

export function validateFireDebugDefinition(
    definition: FireDebugDefinition,
): void {
    if (
        !Number.isFinite(definition.viewportMargin) ||
        definition.viewportMargin < 0
    ) {
        throw new Error(
            "Fire debug viewportMargin must be a finite number greater than or equal to zero.",
        );
    }

    if (
        !Number.isInteger(definition.placementAttemptCount) ||
        definition.placementAttemptCount <= 0
    ) {
        throw new Error(
            "Fire debug placementAttemptCount must be a positive integer.",
        );
    }

    if (definition.sizes.length === 0) {
        throw new Error(
            "Fire debug definition requires at least one fire size.",
        );
    }

    for (const size of definition.sizes) {
        if (
            !Number.isFinite(size.minimumRadius) ||
            !Number.isFinite(size.maximumRadius) ||
            size.minimumRadius <= 0 ||
            size.maximumRadius < size.minimumRadius
        ) {
            throw new Error(
                "Fire debug radii must be finite positive values with maximumRadius >= minimumRadius.",
            );
        }

        if (
            !Number.isInteger(size.minimumIgnitionCount) ||
            !Number.isInteger(size.maximumIgnitionCount) ||
            size.minimumIgnitionCount <= 0 ||
            size.maximumIgnitionCount < size.minimumIgnitionCount
        ) {
            throw new Error(
                "Fire debug ignition counts must be positive integers with maximumIgnitionCount >= minimumIgnitionCount.",
            );
        }
    }
}
