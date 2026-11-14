/** Single-player accepts any intentional drag. Multiplayer restrictions remain configurable. */
export const SHOT_INPUT_POLICY = {
    enforceMultiplayerMinimumShot: false,
    pointerDragDeadZonePixels: 2.5,
    singlePlayerMinimumBaselineTravelDistance: 0,
} as const;
