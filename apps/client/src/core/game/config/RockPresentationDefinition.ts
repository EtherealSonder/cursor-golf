export interface RockPalette {
    readonly body: number;
    readonly facet: number;
    readonly detail: number;
    readonly outline: number;
}

export interface RockVisualProfile {
    readonly minimumRadius: number;
    readonly maximumRadius: number;
    readonly minimumVertices: number;
    readonly maximumVertices: number;
    readonly radialVariation: number;
    readonly facetCountMinimum: number;
    readonly facetCountMaximum: number;
    readonly crackProbability: number;
    readonly outlineWidth: number;
}

export interface RockPresentationDefinition {
    readonly smallRock: RockVisualProfile;
    readonly boulder: RockVisualProfile;
    readonly palettes: readonly RockPalette[];
}

/**
 * R-ROCK-1 flat illustrated stone language.
 *
 * The palette deliberately stays warm/desaturated so the rocks belong to the
 * colourful course without becoming neutral grey noise. Facets are graphic
 * markings, not lighting or shading. No gradients or cast shadows are used.
 */
export const DEFAULT_ROCK_PRESENTATION_DEFINITION: RockPresentationDefinition = {
    smallRock: {
        minimumRadius: 11,
        maximumRadius: 16,
        minimumVertices: 6,
        maximumVertices: 9,
        radialVariation: 0.14,
        facetCountMinimum: 1,
        facetCountMaximum: 1,
        crackProbability: 0.22,
        outlineWidth: 2.8,
    },
    boulder: {
        minimumRadius: 38,
        maximumRadius: 62,
        minimumVertices: 7,
        maximumVertices: 9,
        radialVariation: 0.16,
        facetCountMinimum: 1,
        facetCountMaximum: 1,
        crackProbability: 0.32,
        outlineWidth: 4.5,
    },
    palettes: [
        { body: 0x8f9098, facet: 0xa9aab1, detail: 0x26152d, outline: 0x26152d },
    ],
};
