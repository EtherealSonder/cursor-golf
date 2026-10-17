import { CONVEYOR_BELT_DEFINITION } from "../config/ConveyorBeltDefinition";

/** CB2 visual-only animation. Coordinates are conveyor-local, before cardinal rotation. */
export const CONVEYOR_BELT_ANIMATION = {
    platformWidth: CONVEYOR_BELT_DEFINITION.platformWidth,
    platformHeight: CONVEYOR_BELT_DEFINITION.platformHeight,
    gap: 11,
    speed: 140,
    poolSize: 5,
    // Interior is inset from the outer purple housing; the mask hides emerging segments.
    maskWidth: 182,
    maskHeight: 62,
} as const;

export const conveyorPlatformPitch = (): number =>
    CONVEYOR_BELT_ANIMATION.platformWidth + CONVEYOR_BELT_ANIMATION.gap;

/** Stable modulo ensures wrap is independent of frame rate, even for large delta times. */
export function conveyorPlatformX(index: number, elapsedSeconds: number): number {
    const { poolSize, speed } = CONVEYOR_BELT_ANIMATION;
    const pitch = conveyorPlatformPitch();
    const span = poolSize * pitch;
    const offset = ((elapsedSeconds * speed) % span + span) % span;
    return ((index * pitch + offset + span / 2) % span + span) % span - span / 2;
}
