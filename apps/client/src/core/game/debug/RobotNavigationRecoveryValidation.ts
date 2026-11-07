import { RobotDisplacementTracker } from "../navigation/RobotDisplacementTracker";
import { RobotNavigationRecoveryController } from "../navigation/RobotNavigationRecoveryController";
/** Lightweight RN-3 regression checks, opt-in for debug harnesses. */
export function validateRobotNavigationRecovery(): { passed: boolean; checks: Record<string, boolean> } {
    const tracker = new RobotDisplacementTracker();
    const recovery = new RobotNavigationRecoveryController();
    const checks = {
        smallMotionIgnored: !tracker.recordExternalMotion(1, 1),
        largeMotionDetected: tracker.recordExternalMotion(50, 0),
        firstReplanAllowed: recovery.request("test"),
        cooldownEnforced: !recovery.request("test"),
        escalationBounded: recovery.failed() === "ABANDON" && recovery.failed() === "ABANDON" && recovery.failed() === "RELOCATE",
    };
    return { passed: Object.values(checks).every(Boolean), checks };
}
