import { createCrateCollisionDefinition, CRATE_PHYSICS } from "./CratePhysicsDefinition";
import { CratePhysicsController } from "./CratePhysicsController";

/** C2 deterministic checks; call from existing validation runner if desired. */
export function assertCratePhysicsRegression(): void {
    const definition = createCrateCollisionDefinition("regression", 100, 100);
    const centered = new CratePhysicsController(definition);
    centered.applyImpulse(100, 0, 100, 100);
    if (centered.body.getVelocityX() <= 0 || centered.body.getAngularVelocity() !== 0) {
        throw new Error("C2: centered impulse must translate without torque");
    }
    const offCenter = new CratePhysicsController(definition);
    offCenter.applyImpulse(100, 0, 100, 100 + CRATE_PHYSICS.height / 4);
    if (Math.abs(offCenter.body.getAngularVelocity()) <= 0) {
        throw new Error("C2: off-center impulse must produce rotation");
    }
    const previousX = offCenter.x;
    offCenter.update(1 / 60);
    if (offCenter.x <= previousX) throw new Error("C2: integrated crate must move");
}
