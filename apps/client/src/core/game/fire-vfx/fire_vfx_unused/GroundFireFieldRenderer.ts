import {
    Container,
} from "pixi.js";

import type {
    FireManager,
} from "../environment/FireManager";

/**
 * Legacy compatibility shell for the experimental connected-field renderer.
 *
 * Phase 4B-6E-R1 retires this renderer from the active Fire VFX path.
 * It intentionally performs no visual reconstruction.
 *
 * Kept temporarily so older imports/debug branches do not force us to delete
 * experimental files before the replacement renderer is validated.
 */
export class GroundFireFieldRenderer {
    private readonly container =
        new Container();

    public constructor(
        _fireManager: FireManager,
    ) { }

    public getContainer():
        Container {

        return this.container;
    }

    public update(
        _deltaTime: number,
    ): void {
        // Intentionally inactive during R1/R2.
    }

    public reset():
        void {
        // No retained experimental state.
    }

    public destroy():
        void {

        this.container.destroy({
            children:
                true,
        });
    }
}
