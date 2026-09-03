import type {
    Graphics,
} from "pixi.js";

/**
 * Legacy compatibility shell for the retired experimental Fire field filter.
 *
 * The previous implementation performed global influence reconstruction,
 * pairwise connection tests and multi-layer Graphics drawing every frame.
 * R1 removes that work from the active renderer.
 *
 * This file remains temporarily so experimental source files can stay in the
 * repository without being part of the production presentation path.
 */
export class FireFieldFilter {
    public clear(
        graphics: Graphics,
    ): void {

        graphics.clear();
    }
}
