import { WILDFIRE_CONFIG } from "./WildfireConfig";

/** WM-5C: presentation-only warning styling. All dimensions are world pixels. */
export const WILDFIRE_WARNING_VFX = Object.freeze({
    poolSize: 3,
    radius: WILDFIRE_CONFIG.warningRadius,
    initialScale: 0,
    growInSeconds: 0.45,
    fadeOutSeconds: 0.50,
    rotationRadiansPerSecond: 0.90,
    ringSegments: 12,
    ringFillRatio: 0.58,
    ringRadiusFraction: 0.88,
    ringThickness: 2.8,
    glowColor: 0xff444b,
    ringColor: 0xff8686,
    innerRingColor: 0xffaaaa,
    maxGlowAlpha: 0.34,
    centerRadiusFraction: 0.68,
    centerInitialColor: 0xef5559,
    centerFinalColor: 0x690712,
    centerInitialAlpha: 0.35,
    centerFinalAlpha: 0.98,
    maxRingAlpha: 0.90,
    pulseStartFraction: 0.80,
    cullPadding: 4,
});
