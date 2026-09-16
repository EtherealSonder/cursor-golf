import {
    Container,
    Graphics,
    Text,
} from "pixi.js";

import type {
    Ball,
    BallStandingWaterDebugSnapshot,
} from "../entities/Ball";

import type {
    BallWaterShotDistanceReport,
} from "./BallWaterShotDistanceValidation";

import type {
    BallWaterFrameRateStabilityReport,
} from "./BallWaterFrameRateStabilityValidation";

import type {
    BallWaterIntegratedAcceptanceReport,
} from "./BallWaterIntegratedAcceptanceValidation";

/** Development-only live readout for Phase 8E-5 Ball/standing-Water tuning. */
export class BallWaterDebugOverlay {
    private readonly container = new Container();
    private readonly background = new Graphics();
    private readonly text: Text;

    constructor(
        private readonly ball: Ball,
        private readonly shotDistanceReport:
            BallWaterShotDistanceReport | null = null,
        private readonly frameRateStabilityReport:
            BallWaterFrameRateStabilityReport | null = null,
        private readonly integratedAcceptanceReport:
            BallWaterIntegratedAcceptanceReport | null = null,
    ) {
        this.background
            .roundRect(0, 0, 330, 850, 8)
            .fill({ color: 0x101820, alpha: 0.82 });

        this.text = new Text({
            text: "BALL WATER DEBUG",
            style: {
                fontFamily: "monospace",
                fontSize: 12,
                fill: 0xffffff,
                lineHeight: 18,
            },
        });
        this.text.position.set(12, 10);

        this.container.addChild(this.background, this.text);
        this.container.position.set(12, 70);
    }

    public update(): void {
        const snapshot = this.ball.getStandingWaterDebugSnapshot();
        this.text.text = this.format(snapshot);
    }

    public getContainer(): Container {
        return this.container;
    }

    public destroy(): void {
        this.container.destroy({ children: true });
    }

    private format(snapshot: BallStandingWaterDebugSnapshot | null): string {
        if (!snapshot) {
            return [
                "BALL WATER DEBUG",
                "No standing-Water sample yet.",
                "Launch the Ball to begin sampling.",
            ].join("\n");
        }

        const pct = (value: number): string => `${(value * 100).toFixed(1)}%`;
        const f3 = (value: number): string => value.toFixed(3);
        const f4 = (value: number): string => value.toFixed(4);

        return [
            "BALL WATER DEBUG",
            "",
            `Average Depth       ${f4(snapshot.averageDepth)}`,
            `Maximum Depth       ${f4(snapshot.maximumDepth)}`,
            `Coverage            ${pct(snapshot.coveredFraction)}`,
            `Representative      ${f4(snapshot.representativeWetDepth)}`,
            "",
            `Normalized Depth    ${f3(snapshot.normalizedDepth)}`,
            `Curved Depth        ${f3(snapshot.curvedDepth)}`,
            `Target Exposure     ${f3(snapshot.targetExposure)}`,
            `Smoothed Exposure   ${f3(snapshot.smoothedExposure)}`,
            `Water Transition    ${snapshot.transitionState.toUpperCase()}`,
            "",
            `Surface Resistance  ${f3(snapshot.surfaceResistance)}`,
            `Water Resistance   +${f3(snapshot.additionalResistance)}`,
            `Combined Resistance ${f3(snapshot.combinedResistance)}`,
            "",
            `Terrain Decel       ${snapshot.terrainDeceleration.toFixed(1)}`,
            `Water Decel        +${snapshot.waterDeceleration.toFixed(1)}`,
            `Total Decel         ${snapshot.totalDeceleration.toFixed(1)} px/s²`,
            "",
            `PEAK Depth          ${f4(snapshot.peakRepresentativeWetDepth)}`,
            `PEAK Coverage       ${pct(snapshot.peakCoveredFraction)}`,
            `PEAK Exposure       ${f3(snapshot.peakSmoothedExposure)}`,
            `PEAK Water Resist  +${f3(snapshot.peakAdditionalResistance)}`,
            `Water Contact       ${snapshot.contactTime.toFixed(3)} s`,
            "",
            "SPLASH DEBUG",
            `Armed               ${snapshot.splashArmed ? "YES" : "NO"}`,
            `In Splash Water     ${snapshot.inSplashWater ? "YES" : "NO"}`,
            `Splash Count        ${snapshot.splashCount}`,
            `Last Splash         ${f3(snapshot.lastSplashIntensity)}`,
            `Last Speed          ${snapshot.lastSplashSpeed.toFixed(1)} px/s`,
            `Last Depth          ${f4(snapshot.lastSplashDepth)}`,
            ...this.formatShotDistanceReport(),
            ...this.formatFrameRateStabilityReport(),
            ...this.formatIntegratedAcceptanceReport(),
        ].join("\n");
    }

    private formatShotDistanceReport(): string[] {
        const report = this.shotDistanceReport;

        if (!report) {
            return [];
        }

        return [
            "",
            "8E-8 DISTANCE TEST",
            `Dry                 ${report.dry.stopDistance.toFixed(2)} px`,
            `Wet                 ${report.wet.stopDistance.toFixed(2)} px`,
            `Shallow             ${report.shallow.stopDistance.toFixed(2)} px`,
            `Medium              ${report.medium.stopDistance.toFixed(2)} px`,
            `Deep                ${report.deep.stopDistance.toFixed(2)} px`,
            `Ordering            ${report.orderingPassed ? "PASS" : "FAIL"}`,
        ];
    }

    private formatFrameRateStabilityReport(): string[] {
        const report = this.frameRateStabilityReport;

        if (!report) {
            return [];
        }

        return [
            "",
            "8E-9 FPS STABILITY",
            `30 FPS              ${report.hierarchy30Passed ? "PASS" : "FAIL"}`,
            "60 FPS              REFERENCE",
            `120 FPS             ${report.hierarchy120Passed ? "PASS" : "FAIL"}`,
            `Max Error           ${report.maximumDeviationPercent.toFixed(3)}%`,
            `Tolerance           ${report.tolerancePercent.toFixed(2)}%`,
            `Result              ${report.passed ? "PASS" : "FAIL"}`,
        ];
    }


    private formatIntegratedAcceptanceReport(): string[] {
        const report =
            this.integratedAcceptanceReport;

        if (!report) {
            return [];
        }

        return [
            "",
            "8E-10 ACCEPTANCE",
            `Dry                 ${report.dryPassed ? "PASS" : "FAIL"}`,
            `Entry               ${report.entryPassed ? "PASS" : "FAIL"}`,
            `Continuous          ${report.continuousPassed ? "PASS" : "FAIL"}`,
            `Exit/Re-entry       ${report.exitReentryPassed ? "PASS" : "FAIL"}`,
            `Reset               ${report.resetPassed ? "PASS" : "FAIL"}`,
            `Finite              ${report.allFinitePassed ? "PASS" : "FAIL"}`,
            `Result              ${report.passed ? "PASS" : "FAIL"}`,
        ];
    }

}
