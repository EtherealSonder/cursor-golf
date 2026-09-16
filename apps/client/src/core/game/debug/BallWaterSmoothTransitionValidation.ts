import {
    BallWaterInteraction,
} from "../physics/water/BallWaterInteraction";

import type {
    BallWaterSample,
} from "../physics/water/BallWaterSampler";

/** Phase 8E-6 deterministic validation of standing-Water entry/exit smoothing. */
export class BallWaterSmoothTransitionValidation {
    public run(): void {
        const checks: readonly [string, () => boolean][] = [
            ["Entry does not jump instantly to target", () => this.entryDoesNotJump()],
            ["Entry monotonically approaches target", () => this.entryIsMonotonic()],
            ["Exit does not jump instantly to zero", () => this.exitDoesNotJump()],
            ["Exit monotonically approaches zero", () => this.exitIsMonotonic()],
            ["Entry response is faster than exit response", () => this.entryIsFasterThanExit()],
            ["Transition response never overshoots", () => this.noOvershoot()],
            ["Zero delta time preserves state", () => this.zeroDeltaIsStable()],
            ["Reset clears smoothed exposure", () => this.resetClearsState()],
            ["Transition classification is correct", () => this.transitionClassificationWorks()],
            ["30/60/120 FPS smoothing is equivalent", () => this.frameRateIndependent()],
            ["Finite large delta remains bounded", () => this.largeDeltaIsFinite()],
        ];

        let allPassed = true;
        for (const [label, check] of checks) {
            const passed = check();
            allPassed = allPassed && passed;
            console.log(`[8E-6] ${label} ${passed ? "PASS" : "FAIL"}`);
        }

        console.log(`[8E-6] Smooth Water Entry/Exit: ${allPassed ? "PASS" : "FAIL"}`);
        if (!allPassed) {
            throw new Error("Phase 8E-6 Smooth Water Entry/Exit validation failed.");
        }
    }

    private wetSample(): BallWaterSample {
        return {
            averageDepth: 0.12,
            maximumDepth: 0.12,
            coveredFraction: 1,
            averageVelocityX: 0,
            averageVelocityY: 0,
            sampleCount: 9,
            coveredSampleCount: 9,
        };
    }

    private drySample(): BallWaterSample {
        return {
            averageDepth: 0,
            maximumDepth: 0,
            coveredFraction: 0,
            averageVelocityX: 0,
            averageVelocityY: 0,
            sampleCount: 9,
            coveredSampleCount: 0,
        };
    }

    private entryDoesNotJump(): boolean {
        const interaction = new BallWaterInteraction();
        const state = interaction.update(this.wetSample(), 1 / 60);
        return state.smoothedExposure > 0 && state.smoothedExposure < state.targetExposure && state.transitionState === "entering";
    }

    private entryIsMonotonic(): boolean {
        const interaction = new BallWaterInteraction();
        let previous = 0;
        for (let i = 0; i < 30; i += 1) {
            const value = interaction.update(this.wetSample(), 1 / 60).smoothedExposure;
            if (value < previous || value > 1) return false;
            previous = value;
        }
        return previous > 0;
    }

    private exitDoesNotJump(): boolean {
        const interaction = new BallWaterInteraction();
        for (let i = 0; i < 30; i += 1) interaction.update(this.wetSample(), 1 / 60);
        const before = interaction.getSmoothedExposure();
        const state = interaction.update(this.drySample(), 1 / 60);
        return state.smoothedExposure > 0 && state.smoothedExposure < before && state.transitionState === "exiting";
    }

    private exitIsMonotonic(): boolean {
        const interaction = new BallWaterInteraction();
        for (let i = 0; i < 30; i += 1) interaction.update(this.wetSample(), 1 / 60);
        let previous = interaction.getSmoothedExposure();
        for (let i = 0; i < 30; i += 1) {
            const value = interaction.update(this.drySample(), 1 / 60).smoothedExposure;
            if (value > previous || value < 0) return false;
            previous = value;
        }
        return previous < 0.01;
    }

    private entryIsFasterThanExit(): boolean {
        const entry = new BallWaterInteraction();
        const entryState = entry.update(this.wetSample(), 1 / 60);
        const exit = new BallWaterInteraction();
        for (let i = 0; i < 120; i += 1) exit.update(this.wetSample(), 1 / 60);
        const beforeExit = exit.getSmoothedExposure();
        const exitState = exit.update(this.drySample(), 1 / 60);
        const entryChange = entryState.smoothedExposure;
        const exitChange = beforeExit - exitState.smoothedExposure;
        return entryChange > exitChange;
    }

    private noOvershoot(): boolean {
        const interaction = new BallWaterInteraction();
        for (let i = 0; i < 240; i += 1) {
            const state = interaction.update(this.wetSample(), 1 / 120);
            if (state.smoothedExposure < 0 || state.smoothedExposure > state.targetExposure + 1e-9) return false;
        }
        return true;
    }

    private zeroDeltaIsStable(): boolean {
        const interaction = new BallWaterInteraction();
        interaction.update(this.wetSample(), 1 / 60);
        const before = interaction.getSmoothedExposure();
        const after = interaction.update(this.drySample(), 0).smoothedExposure;
        return Math.abs(before - after) < 1e-12;
    }

    private resetClearsState(): boolean {
        const interaction = new BallWaterInteraction();
        interaction.update(this.wetSample(), 1 / 60);
        interaction.reset();
        return interaction.getSmoothedExposure() === 0;
    }

    private transitionClassificationWorks(): boolean {
        const interaction = new BallWaterInteraction();
        const dry = interaction.update(this.drySample(), 1 / 60);
        const entering = interaction.update(this.wetSample(), 1 / 60);
        for (let i = 0; i < 120; i += 1) interaction.update(this.wetSample(), 1 / 60);
        const stable = interaction.update(this.wetSample(), 1 / 60);
        const exiting = interaction.update(this.drySample(), 1 / 60);
        return dry.transitionState === "dry" && entering.transitionState === "entering" && stable.transitionState === "stable" && exiting.transitionState === "exiting";
    }

    private frameRateIndependent(): boolean {
        const simulate = (fps: number): number => {
            const interaction = new BallWaterInteraction();
            for (let i = 0; i < fps; i += 1) interaction.update(this.wetSample(), 1 / fps);
            return interaction.getSmoothedExposure();
        };
        const a = simulate(30);
        const b = simulate(60);
        const c = simulate(120);
        return Math.max(a, b, c) - Math.min(a, b, c) < 1e-9;
    }

    private largeDeltaIsFinite(): boolean {
        const interaction = new BallWaterInteraction();
        const state = interaction.update(this.wetSample(), 1);
        return Number.isFinite(state.smoothedExposure) && state.smoothedExposure >= 0 && state.smoothedExposure <= 1 && Number.isFinite(state.additionalResistance);
    }
}
