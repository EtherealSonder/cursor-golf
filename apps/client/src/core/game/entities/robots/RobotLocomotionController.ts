import type { Sprite } from "pixi.js";

export type RobotLocomotionPhase =
    | "PLANTED"
    | "LEFT_REACH"
    | "LEFT_CATCHUP"
    | "RIGHT_REACH"
    | "RIGHT_CATCHUP";

export interface RobotLocomotionAdvance {
    readonly distance: number;
    readonly phase: RobotLocomotionPhase;
    readonly activeLeg: 0 | 1 | 2;
}

/**
 * R-3.1 foot-plant locomotion.
 *
 * A leg reaches forward while the chassis remains still. The chassis then
 * catches up to that planted foot while the trailing leg stays attached to
 * the chassis. The opposite leg repeats the same cycle.
 *
 * The controller owns only local leg poses and the requested forward body
 * distance. Robot remains authoritative for collision-safe world movement.
 */
export class RobotLocomotionController {
    private phase: RobotLocomotionPhase = "PLANTED";
    private nextLeg: 1 | 2 = 1;
    private phaseElapsed = 0;
    private catchupTravelled = 0;

    public constructor(
        private readonly leg1: Sprite,
        private readonly leg2: Sprite,
        private readonly baseLeg1X: number,
        private readonly baseLeg1Y: number,
        private readonly baseLeg2X: number,
        private readonly baseLeg2Y: number,
        private readonly stepDistance: number,
        private readonly legReachSeconds: number,
        private readonly bodyCatchupSeconds: number,
    ) {
        this.applyPlantedPose();
    }

    public update(deltaTime: number, maximumDistance: number): RobotLocomotionAdvance {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0 || maximumDistance <= 0 || !Number.isFinite(maximumDistance)) {
            return { distance: 0, phase: this.phase, activeLeg: this.getActiveLeg() };
        }

        if (this.phase === "PLANTED") {
            this.beginReach(this.nextLeg);
        }

        if (this.phase === "LEFT_REACH" || this.phase === "RIGHT_REACH") {
            this.phaseElapsed += deltaTime;
            const progress = Math.min(1, this.phaseElapsed / Math.max(0.001, this.legReachSeconds));
            this.applyReachPose(this.phase === "LEFT_REACH" ? 1 : 2, this.easeInOut(progress));
            if (progress >= 1) {
                this.phase = this.phase === "LEFT_REACH" ? "LEFT_CATCHUP" : "RIGHT_CATCHUP";
                this.phaseElapsed = 0;
                this.catchupTravelled = 0;
            }
            return { distance: 0, phase: this.phase, activeLeg: this.getActiveLeg() };
        }

        const activeLeg: 1 | 2 = this.phase === "LEFT_CATCHUP" ? 1 : 2;
        const speed = this.stepDistance / Math.max(0.001, this.bodyCatchupSeconds);
        const remaining = Math.max(0, this.stepDistance - this.catchupTravelled);
        const distance = Math.min(speed * deltaTime, remaining, maximumDistance);
        this.catchupTravelled += distance;
        this.phaseElapsed += deltaTime;

        // As Robot translates the visual root forward, pull the planted foot
        // backward by the same local distance. In world space it therefore
        // remains planted while the chassis catches up to it.
        this.applyCatchupPose(activeLeg, this.catchupTravelled);

        if (this.catchupTravelled >= this.stepDistance - 0.001 || maximumDistance <= distance + 0.001) {
            this.applyPlantedPose();
            this.nextLeg = activeLeg === 1 ? 2 : 1;
            this.phase = "PLANTED";
            this.phaseElapsed = 0;
            this.catchupTravelled = 0;
        }

        return { distance, phase: this.phase, activeLeg };
    }

    /** R-5: stop a gait cleanly before target orientation begins. */
    public plantForTargeting(): void { this.reset(); }

    public reset(): void {
        this.phase = "PLANTED";
        this.phaseElapsed = 0;
        this.catchupTravelled = 0;
        this.applyPlantedPose();
    }

    public getPhase(): RobotLocomotionPhase { return this.phase; }

    public getActiveLeg(): 0 | 1 | 2 {
        if (this.phase === "LEFT_REACH" || this.phase === "LEFT_CATCHUP") return 1;
        if (this.phase === "RIGHT_REACH" || this.phase === "RIGHT_CATCHUP") return 2;
        return 0;
    }

    private beginReach(leg: 1 | 2): void {
        this.phase = leg === 1 ? "LEFT_REACH" : "RIGHT_REACH";
        this.phaseElapsed = 0;
        this.catchupTravelled = 0;
        this.applyPlantedPose();
    }

    private applyPlantedPose(): void {
        this.leg1.position.set(this.baseLeg1X, this.baseLeg1Y);
        this.leg2.position.set(this.baseLeg2X, this.baseLeg2Y);
        this.leg1.rotation = 0;
        this.leg2.rotation = 0;
    }

    private applyReachPose(activeLeg: 1 | 2, progress: number): void {
        this.applyPlantedPose();
        const reach = this.stepDistance * progress;
        if (activeLeg === 1) this.leg1.x = this.baseLeg1X + reach;
        else this.leg2.x = this.baseLeg2X + reach;
    }

    private applyCatchupPose(activeLeg: 1 | 2, bodyTravel: number): void {
        this.applyPlantedPose();
        const plantedLocalX = this.stepDistance - bodyTravel;
        if (activeLeg === 1) this.leg1.x = this.baseLeg1X + plantedLocalX;
        else this.leg2.x = this.baseLeg2X + plantedLocalX;
    }

    private easeInOut(t: number): number {
        return t * t * (3 - 2 * t);
    }
}
