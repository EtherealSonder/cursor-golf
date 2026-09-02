import {
    DEFAULT_GAME_VIEWPORT_DEFINITION,
} from "./GameViewportDefinition";
import {
    GAME_COLOR_PALETTE,
} from "./GameColorPalette";

export interface HoleDefinition {
    readonly positionX: number;
    readonly positionY: number;
    readonly visualRadius: number;
    readonly captureAssistMargin: number;
    readonly minimumEntryRatio: number;
    readonly minimumCaptureSpeed: number;
    readonly maximumCaptureSpeed: number;
    readonly captureSpeedCurveExponent: number;
    readonly captureDuration: number;
    readonly capturedBallScale: number;
    readonly fillColor: number;
    readonly fillAlpha: number;
    readonly outlineColor: number;
    readonly outlineAlpha: number;
    readonly outlineWidth: number;
    readonly tooFastOutlineColor: number;
    readonly validEntryOutlineColor: number;
    readonly showDebugCaptureRadius: boolean;
    readonly debugCaptureRadiusColor: number;
    readonly debugCaptureRadiusAlpha: number;
    readonly debugCaptureRadiusWidth: number;
}

export const DEFAULT_HOLE_DEFINITION: HoleDefinition = {
    positionX: DEFAULT_GAME_VIEWPORT_DEFINITION.width * 0.75,
    positionY: DEFAULT_GAME_VIEWPORT_DEFINITION.height * 0.5,
    visualRadius: 18,
    captureAssistMargin: 4,
    minimumEntryRatio: 0.2,
    minimumCaptureSpeed: 200,
    maximumCaptureSpeed: 360,
    captureSpeedCurveExponent: 1.35,
    captureDuration: 0.3,
    capturedBallScale: 0,
    fillColor: GAME_COLOR_PALETTE.golf.hole,
    fillAlpha: 0.98,
    outlineColor: GAME_COLOR_PALETTE.golf.ballShadow,
    outlineAlpha: 0.88,
    outlineWidth: 2,
    tooFastOutlineColor: GAME_COLOR_PALETTE.fire.accent,
    validEntryOutlineColor: GAME_COLOR_PALETTE.terrain.grassDark,
    showDebugCaptureRadius: true,
    debugCaptureRadiusColor: GAME_COLOR_PALETTE.fire.hot,
    debugCaptureRadiusAlpha: 0.65,
    debugCaptureRadiusWidth: 1,
};
