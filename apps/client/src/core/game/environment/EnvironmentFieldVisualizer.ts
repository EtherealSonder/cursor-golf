import {
    Graphics,
} from "pixi.js";

import type {
    EnvironmentField,
} from "./EnvironmentField";

/**
 * DEPRECATED.
 *
 * Scorch presentation moved to:
 *
 * EnvironmentField
 *     -> FireVfxSystem
 *     -> ScorchRenderer
 *     -> ScorchFieldTextureGenerator
 *
 * This compatibility shell remains temporarily so the TypeScript project can
 * still compile while the legacy file is present in src/. It intentionally
 * performs no scorch rendering and owns no simulation state.
 *
 * Once architecture cleanup begins, this file can be moved to the project's
 * unused/archive folder if no imports remain.
 */
export class EnvironmentFieldVisualizer {

    private readonly graphics =
        new Graphics();

    private destroyed =
        false;

    public constructor(
        _environmentField:
            EnvironmentField,
    ) {
        /*
         * Intentionally empty.
         */
    }

    public update():
        void {
        /*
         * Intentionally disabled.
         * ScorchRenderer is the sole active scorch presentation path.
         */
    }

    public getGraphics():
        Graphics {

        return this.graphics;
    }

    public destroy():
        void {

        if (
            this.destroyed
        ) {
            return;
        }

        this.destroyed =
            true;

        this.graphics
            .removeFromParent();

        this.graphics.destroy();
    }
}
