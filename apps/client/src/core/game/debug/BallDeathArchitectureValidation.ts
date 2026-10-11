import { fractionOutsideFootprint as D11fractionOutsideFootprint } from "../level/CourseBoundaryFootprintQuery";
import { RobotAttackController } from "../entities/robots/RobotAttackController";
import { BallRetryProtectionController } from "../death/BallRetryProtectionController";
import { BallDeathPhysicsLock } from "../death/BallDeathPhysicsLock";
import type { BallDeathController } from "../death/BallDeathController";
import { BallDeathCause } from "../death/BallDeathCause";
import { BallRetryResult } from "../death/BallRetryRequest";

/**
 * Temporary D-2 keyboard validation only. No environmental hazard detection is
 * performed here. Keys 1-4 submit each real death cause; R exercises retry.
 */
export class BallDeathArchitectureValidation {
    constructor(
        private readonly deathController: BallDeathController,
        private readonly performRetry: () => BallRetryResult | null,
    ) {
        window.addEventListener("keydown", this.onKeyDown);
    }

    private readonly onKeyDown = (event: KeyboardEvent): void => {
        if (event.repeat) {
            return;
        }

        const cause = this.getCauseForCode(event.code);
        if (cause) {
            const accepted = this.deathController.requestDeath(cause);
            console.info(
                `[D-2] ${cause} death request: ${accepted ? "ACCEPTED" : "REJECTED"}`,
                accepted ?? this.deathController.getSnapshot(),
            );
            return;
        }

        if (event.code === "KeyR") {
            console.info(
                "[D-2] Retry request:",
                this.performRetry(),
            );
        }
    };

    private getCauseForCode(code: string): BallDeathCause | null {
        switch (code) {
            case "Digit1": return BallDeathCause.Fire;
            case "Digit2": return BallDeathCause.Drowning;
            case "Digit3": return BallDeathCause.Explosion;
            case "Digit4": return BallDeathCause.OutOfBounds;
            default: return null;
        }
    }

    public destroy(): void {
        window.removeEventListener("keydown", this.onKeyDown);
    }
}

/** Pure lifecycle contract regression independent of browser input. */
export function validateBallDeathPhysicsLock(): void {
    const lock = new BallDeathPhysicsLock();
    if (lock.isLocked) throw new Error("[D1] Lock initially engaged");
    lock.engage(20, 30);
    lock.engage(90, 90);
    if (!lock.isLocked || lock.anchor.x !== 20) throw new Error("[D1] Duplicate death changed anchor");
    lock.relocate(100, 200);
    if (lock.anchor.y !== 200) throw new Error("[D1] Retry relocation failed");
    lock.release();
    if (lock.isLocked) throw new Error("[D1] Unlock failed");
}

/** D1.1: a transient swept excursion must not kill a ball whose resolved pose is safe. */
export function validateResolvedBallBoundaryThreshold(): void {
    const contains = (x: number, _y: number) => x >= 0;
    const fractionOutsideFootprint = D11fractionOutsideFootprint;
    const safe = fractionOutsideFootprint(contains, {kind: "circle", x: 0, y: 0, radius: 10}, 81);
    const lethal = fractionOutsideFootprint(contains, {kind: "circle", x: -9, y: 0, radius: 10}, 81);
    if (safe > 0.8 || lethal <= 0.8) throw new Error("[D1.1] Incorrect 80% coverage contract");
}

/** D2: cooldown must interrupt attack and restart the configured cooldown. */
export function validateD2ForcedRobotCooldown(): void {
    const controller = new RobotAttackController(5, 10);
    if (!controller.start("ball")) throw new Error("[D2] Robot attack failed to start");
    controller.forceCooldown();
    let state = controller.getSnapshot();
    if (state.phase !== "COOLDOWN" || state.targetId !== null || state.cooldownRemainingSeconds !== 10) {
        throw new Error("[D2] Forced cooldown did not clear active attack");
    }
    controller.updateCooldown(9);
    if (controller.isReady()) throw new Error("[D2] Cooldown ended early");
    controller.updateCooldown(1);
    if (!controller.isReady()) throw new Error("[D2] Cooldown did not finish");
}

/** D2: accepted retries cannot immediately consume another life. */
export function validateD2RetryProtection(): void {
    const protection = new BallRetryProtectionController();
    protection.start();
    if (!protection.isActive) throw new Error("[D2] Retry protection did not start");
    protection.update(0.5);
    if (!protection.isActive) throw new Error("[D2] Retry protection ended early");
    protection.update(0.25);
    if (protection.isActive) throw new Error("[D2] Retry protection did not expire");
}
