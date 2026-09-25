import type { DirectionalBumper } from "../entities/mechanisms/DirectionalBumper";
import type { DirectionalBumperTargetingSolution } from "../entities/mechanisms/DirectionalBumperTargeting";
import type { DirectionalBumperContactDebug } from "../physics/DirectionalBumperCollisionSystem";
import type { DirectionalBumperBehaviorDiagnostics } from "./DirectionalBumperBehaviorDiagnostics";
import { Entity } from "../entities/Entity";

/**
 * DB-5 dormant debug renderer.
 * The Directional Bumper overlay has been removed from World after collision
 * validation. This class intentionally renders nothing and can be expanded again
 * if a later mechanism phase needs temporary visualization.
 */
export class DirectionalBumperDebugRenderer extends Entity {
    public constructor(_bumper: DirectionalBumper) { super(); }
    public setTargetingSolution(_solution: DirectionalBumperTargetingSolution | null): void {}
    public setContact(_contact: DirectionalBumperContactDebug | null): void {}
    public setDiagnostics(_diagnostics: DirectionalBumperBehaviorDiagnostics): void {}
    protected onInitialize(): void {}
    protected onUpdate(): void {}
    protected onDestroy(): void { this.container.destroy({ children: true }); }
}
