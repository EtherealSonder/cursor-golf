import type { Application } from "pixi.js";
import { World } from "../world/World";

/** The same World construction path is used for first launch and every replacement. */
export class LevelRuntimeLifecycle {
    public create(app: Application, levelId: string | undefined, width: number, height: number): World {
        const world = new World(app, undefined, levelId);
        world.resizeViewport(width, height);
        world.initialize();
        return world;
    }

    public dispose(world: World): void {
        world.setBallDeathReporter(null);
        world.setCrateRewardListener(null);
        world.destroy();
    }
}
