/**
 * Central semantic color palette for Cursor Golf.
 *
 * Visual direction:
 * - chunky readable shapes
 * - flat saturated colors
 * - minimal shading
 * - coordinated small palette
 *
 * Fire presentation follows the same pop-art/storybook language.
 * VFX code must consume these semantic colors rather than introducing
 * independent Fire color constants.
 */
export const GAME_COLOR_PALETTE = {
    terrain: {
        grass: 0x69d39e,
        grassDark: 0x3ead87,
        sand: 0xf4d98b,
        sandShadow: 0xdda96d,
        water: 0x55c9df,
        waterShadow: 0x368dbd,
    },

    golf: {
        ball: 0xfff7dc,
        ballShadow: 0xe9ddb8,
        hole: 0x29243a,
        flag: 0xef5d64,
    },

    fire: {
        /*
         * Original semantic names are retained for compatibility.
         */
        main: 0xf47b45,
        hot: 0xffd84a,
        accent: 0xe94f55,

        /*
         * Presentation aliases make the intended Fire hierarchy explicit:
         * core = hottest yellow
         * body = dominant orange
         * accent = red edge/trailing accent
         */
        core: 0xffd84a,
        body: 0xf47b45,
    },

    environment: {
        wood: 0xc9825b,
        rock: 0x8d89a3,
    },

    ink: {
        outline: 0x29243a,
    },
} as const;

export type GameColorPalette =
    typeof GAME_COLOR_PALETTE;
