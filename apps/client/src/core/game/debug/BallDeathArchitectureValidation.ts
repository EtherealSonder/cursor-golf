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
