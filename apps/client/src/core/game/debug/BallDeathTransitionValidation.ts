import { BallDeathTransitionController } from "../death/BallDeathTransitionController";

export class BallDeathTransitionValidation {
    public static validate(): void {
        const controller = new BallDeathTransitionController({
            cameraFocusDurationSeconds: 1.0,
            slowMotionDurationSeconds: 1.0,
            feedbackTimeScale: 0.15,
            lifeLossDurationSeconds: 0.68,
            closeDurationSeconds: 1.5,
            relocateDurationSeconds: 1.0,
            openDurationSeconds: 1.5,
            overlayColor: 0x242128,
            minimumApertureRadius: 10,
            radiusOverscan: 48,
            apertureSegments: 72,
        });

        if (!controller.begin()) throw new Error("[D-FINAL] Begin failed.");
        if (controller.getSnapshot().state !== "cameraFocus")
            throw new Error("[D-FINAL] Death must start with camera focus.");
        if (controller.begin())
            throw new Error("[D-FINAL] Duplicate death restarted transition.");

        controller.update(1.01);
        if (controller.getSnapshot().state !== "slowMotion")
            throw new Error("[D-FINAL] Camera focus must advance to slow motion.");

        controller.update(1.01);
        if (controller.getSnapshot().state !== "closing")
            throw new Error("[D-FINAL] Slow motion must advance to closing.");

        controller.update(1.51);
        if (controller.getSnapshot().state !== "lifeLoss")
            throw new Error("[D-FINAL] Closing must advance to life loss.");

        controller.update(0.69);
        const relocating = controller.getSnapshot();
        if (relocating.state !== "relocating" || !relocating.retryRequested)
            throw new Error("[D-FINAL] Relocation must follow life loss.");

        controller.acknowledgeRetry();
        controller.update(1.01);
        if (controller.getSnapshot().state !== "opening")
            throw new Error("[D-FINAL] Relocation must advance to opening.");

        controller.update(1.51);
        if (controller.getSnapshot().state !== "complete")
            throw new Error("[D-FINAL] Opening must complete.");

        controller.finish();
        if (controller.getSnapshot().state !== "idle")
            throw new Error("[D-FINAL] Finish must return to idle.");
    }
}
