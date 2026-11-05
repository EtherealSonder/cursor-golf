import { StickyBallAttachmentController } from "../ball-effects/StickyBallAttachmentController";
import { isStickyEligible } from "../config/StickyBallDefinition";
/** Headless state-machine checks. Does not mutate the live ball or world. */
export function assertStickyBallRegression(): void {
    const check = (ok: boolean, message: string): void => { if (!ok) throw new Error(`[P-4G] ${message}`); };
    const controller = new StickyBallAttachmentController();
    let events = 0;
    const unsubscribe = controller.onAttached(() => { events++; });
    controller.setEnabled(true);
    const anchor = { x: 120, y: 80 };
    const staticTarget = { id: "wall-1", kind: "static" as const, getAnchor: () => anchor };
    check(controller.attach(staticTarget), "static attachment rejected");
    check(events === 1, "attachment event not emitted exactly once");
    check(!controller.attach(staticTarget) && events === 1, "duplicate attachment emitted splash");
    controller.update(6);
    check(controller.getSnapshot().state === "attached", "static attachment expired");
    controller.release();
    check(controller.attach(staticTarget) && events === 2, "same wall cannot be reattached");
    controller.setEnabled(false);
    check(controller.getSnapshot().state === "free", "effect switch did not clear attachment");
    controller.setEnabled(true);
    check(controller.attach({ id: "robot-1", kind: "robot", getAnchor: () => anchor }), "robot attachment rejected");
    controller.update(4.6);
    check(controller.getSnapshot().state !== "attached", "robot timeout failed");
    check(!isStickyEligible("crate") && !isStickyEligible("mine") && !isStickyEligible("marble") &&
        !isStickyEligible("portal-opening") && !isStickyEligible("bush"), "exclusion policy regressed");
    controller.clear();
    check(controller.getSnapshot().state === "free", "reset did not clear attachment");
    unsubscribe();
}
