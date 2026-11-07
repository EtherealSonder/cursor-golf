import type { RobotElement } from "./RobotDefinition";

export interface RobotVisionConePalette {
    readonly idleColor: number;
    readonly detectingColor: number;
    readonly idleAlpha: number;
    readonly detectingAlpha: number;
}

/** Presentation only. Does not change the authoritative vision scan. */
export const ROBOT_VISION_CONE_DEFINITION = {
    transitionSeconds: 0.25,
    palettes: {
        fire: { idleColor: 0xff8c94, detectingColor: 0xf45b70, idleAlpha: 0.20, detectingAlpha: 0.42 },
        water: { idleColor: 0x9adfff, detectingColor: 0x59b9f0, idleAlpha: 0.20, detectingAlpha: 0.42 },
        wind: { idleColor: 0xf1f6ff, detectingColor: 0xe4eeff, idleAlpha: 0.23, detectingAlpha: 0.46 },
    } satisfies Record<RobotElement, RobotVisionConePalette>,
} as const;
