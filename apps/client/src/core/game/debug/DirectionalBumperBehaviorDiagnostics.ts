import type { DirectionalBumperState } from "../entities/mechanisms/DirectionalBumper";
import type { DirectionalBumperTargetingDiagnostic } from "../entities/mechanisms/DirectionalBumperTargeting";
import type { DirectionalBumperCollisionDiagnostic } from "../physics/DirectionalBumperCollisionSystem";

/**
 * DB-5 dormant diagnostic hook.
 * Runtime overlay and console diagnostics were intentionally removed after DB-4
 * collision validation. The no-op surface is retained so diagnostics can be
 * reintroduced later without restoring console output accidentally.
 */
export class DirectionalBumperBehaviorDiagnostics {
    public updateTargeting(
        _state: DirectionalBumperState,
        _diagnostic: DirectionalBumperTargetingDiagnostic,
        _strikeRequested: boolean,
        _strikeAccepted: boolean,
    ): void {}

    public updateCollision(_diagnostic: DirectionalBumperCollisionDiagnostic): void {}
    public reset(): void {}
}
