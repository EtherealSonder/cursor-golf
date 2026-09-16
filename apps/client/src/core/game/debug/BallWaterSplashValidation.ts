import {
    DEFAULT_BALL_WATER_SPLASH_DEFINITION,
} from "../config/BallWaterSplashDefinition";

import {
    BallWaterSplashSystem,
} from "../physics/water/BallWaterSplashSystem";

import type {
    BallWaterSample,
} from "../physics/water/BallWaterSampler";

export class BallWaterSplashValidation {
    public run(): void {
        const checks: readonly [string, boolean][] = [
            ["Dry Ball produces no splash", this.dryProducesNoSplash()],
            ["Below-depth Water produces no splash", this.belowDepthProducesNoSplash()],
            ["Stationary Ball produces no splash", this.stationaryProducesNoSplash()],
            ["Slow Ball produces no splash", this.slowProducesNoSplash()],
            ["Meaningful moving entry produces one splash", this.entryProducesOneSplash()],
            ["Continuous Water contact does not spam events", this.continuousContactDoesNotSpam()],
            ["Leaving Water re-arms splash detection", this.leavingWaterRearms()],
            ["Re-entry produces another splash", this.reentryProducesAnotherSplash()],
            ["Higher speed increases splash intensity", this.higherSpeedIncreasesIntensity()],
            ["Greater depth increases splash intensity", this.greaterDepthIncreasesIntensity()],
            ["Greater coverage increases splash intensity", this.greaterCoverageIncreasesIntensity()],
            ["Splash intensity remains bounded", this.intensityRemainsBounded()],
            ["Invalid input cannot create invalid event data", this.invalidInputIsSafe()],
            ["Reset clears contact and re-arms system", this.resetRearms()],
            ["30/60/120 update repetition emits one entry event", this.frameRateIndependentEventCount()],
        ];

        for (const [name, passed] of checks) {
            console.log(`[8E-7] ${name} ${passed ? "PASS" : "FAIL"}`);
        }

        const passed = checks.every(([, value]) => value);
        console.log(`[8E-7] Splash Physics Event System: ${passed ? "PASS" : "FAIL"}`);

        if (!passed) {
            throw new Error("Phase 8E-7 Splash Physics Event System validation failed.");
        }
    }

    private dryProducesNoSplash(): boolean {
        return new BallWaterSplashSystem().update(this.input(500, 0, 0)) === null;
    }

    private belowDepthProducesNoSplash(): boolean {
        const d = DEFAULT_BALL_WATER_SPLASH_DEFINITION;
        return new BallWaterSplashSystem().update(
            this.input(500, d.minimumSplashDepth * 0.5, 1),
        ) === null;
    }

    private stationaryProducesNoSplash(): boolean {
        return new BallWaterSplashSystem().update(this.input(0, 0.04, 1)) === null;
    }

    private slowProducesNoSplash(): boolean {
        const d = DEFAULT_BALL_WATER_SPLASH_DEFINITION;
        return new BallWaterSplashSystem().update(
            this.input(d.minimumSplashSpeed * 0.5, 0.04, 1),
        ) === null;
    }

    private entryProducesOneSplash(): boolean {
        return new BallWaterSplashSystem().update(this.input(500, 0.04, 1)) !== null;
    }

    private continuousContactDoesNotSpam(): boolean {
        const system = new BallWaterSplashSystem();
        const first = system.update(this.input(500, 0.04, 1));
        const second = system.update(this.input(500, 0.04, 1));
        const third = system.update(this.input(500, 0.05, 1));
        return first !== null && second === null && third === null;
    }

    private leavingWaterRearms(): boolean {
        const system = new BallWaterSplashSystem();
        system.update(this.input(500, 0.04, 1));
        system.update(this.input(500, 0, 0));
        return system.isArmed() && !system.isInSplashWater();
    }

    private reentryProducesAnotherSplash(): boolean {
        const system = new BallWaterSplashSystem();
        const first = system.update(this.input(500, 0.04, 1));
        system.update(this.input(500, 0, 0));
        const second = system.update(this.input(500, 0.04, 1));
        return first !== null && second !== null;
    }

    private higherSpeedIncreasesIntensity(): boolean {
        const low = new BallWaterSplashSystem().update(this.input(200, 0.04, 1));
        const high = new BallWaterSplashSystem().update(this.input(800, 0.04, 1));
        return low !== null && high !== null && high.intensity > low.intensity;
    }

    private greaterDepthIncreasesIntensity(): boolean {
        const shallow = new BallWaterSplashSystem().update(this.input(500, 0.02, 1));
        const deep = new BallWaterSplashSystem().update(this.input(500, 0.10, 1));
        return shallow !== null && deep !== null && deep.intensity > shallow.intensity;
    }

    private greaterCoverageIncreasesIntensity(): boolean {
        const partial = new BallWaterSplashSystem().update(this.input(500, 0.04, 0.35));
        const full = new BallWaterSplashSystem().update(this.input(500, 0.04, 1));
        return partial !== null && full !== null && full.intensity > partial.intensity;
    }

    private intensityRemainsBounded(): boolean {
        const event = new BallWaterSplashSystem().update(this.input(100000, 100, 1));
        return event !== null && event.intensity >= 0 && event.intensity <= 1;
    }

    private invalidInputIsSafe(): boolean {
        const system = new BallWaterSplashSystem();
        const event = system.update({
            worldX: Number.NaN,
            worldY: Number.POSITIVE_INFINITY,
            velocityX: Number.NaN,
            velocityY: Number.NaN,
            sample: this.sample(0.04, 1),
        });
        return event === null;
    }

    private resetRearms(): boolean {
        const system = new BallWaterSplashSystem();
        system.update(this.input(500, 0.04, 1));
        system.reset();
        return system.isArmed() && !system.isInSplashWater();
    }

    private frameRateIndependentEventCount(): boolean {
        return [30, 60, 120].every((fps) => {
            const system = new BallWaterSplashSystem();
            let count = 0;
            for (let frame = 0; frame < fps; frame += 1) {
                const event = system.update(this.input(500, 0.04, 1));
                if (event) count += 1;
            }
            return count === 1;
        });
    }

    private input(speed: number, depth: number, coverage: number) {
        return {
            worldX: 100,
            worldY: 100,
            velocityX: speed,
            velocityY: 0,
            sample: this.sample(depth, coverage),
        };
    }

    private sample(depth: number, coverage: number): BallWaterSample {
        const clampedCoverage = Math.max(0, Math.min(1, coverage));
        return {
            averageDepth: Math.max(0, depth) * clampedCoverage,
            maximumDepth: Math.max(0, depth),
            coveredFraction: clampedCoverage,
            averageVelocityX: 0,
            averageVelocityY: 0,
            sampleCount: 9,
            coveredSampleCount: Math.round(9 * clampedCoverage),
        };
    }
}
