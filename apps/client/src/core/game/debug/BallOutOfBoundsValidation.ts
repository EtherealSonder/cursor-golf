import { DEFAULT_GAMEPLAY_COURSE_DEFINITION } from "../config/GameplayCourseDefinition";
import { BallOutOfBoundsController } from "../death/BallOutOfBoundsController";

export class BallOutOfBoundsValidation {
    public static validate(): void {
        const d = DEFAULT_GAMEPLAY_COURSE_DEFINITION;
        const c = new BallOutOfBoundsController(d);
        const inside = c.update(d.ballSpawn.x, d.ballSpawn.y, 1 / 60);
        if (inside.state !== "inside") throw new Error("[D-5] Spawn must begin inside gameplay course.");
        const first = c.update(d.minimumX - 1, d.ballSpawn.y, 0);
        if (first.state !== "falling" || first.requestDeath) throw new Error("[D-5] Leaving course must begin fall before death.");
        const done = c.update(d.minimumX - 1, d.ballSpawn.y, d.outOfBoundsFallDurationSeconds + 0.01);
        if (!done.requestDeath || done.fallProgress !== 1) throw new Error("[D-5] Completed fall must request one death.");
        const duplicate = c.update(d.minimumX - 20, d.ballSpawn.y, 1);
        if (duplicate.requestDeath) throw new Error("[D-5] OOB death request must be one-shot.");
        c.reset();
        if (c.getState() !== "inside") throw new Error("[D-5] Reset must restore inside state.");
    }
}
