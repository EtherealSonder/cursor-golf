export type GameplayCourseSide = "left" | "right" | "top" | "bottom";

export interface GameplayCourseOpening {
    readonly side: GameplayCourseSide;
    readonly start: number;
    readonly end: number;
}

export interface GameplayCoursePoint {
    readonly x: number;
    readonly y: number;
}

export interface GameplayCourseDefinition {
    readonly minimumX: number;
    readonly maximumX: number;
    readonly minimumY: number;
    readonly maximumY: number;
    readonly wallThickness: number;
    readonly openings: readonly GameplayCourseOpening[];
    readonly ballSpawn: GameplayCoursePoint;
    readonly outOfBoundsFallDurationSeconds: number;
    readonly outsideBackgroundColor: number;
    readonly wallColor: number;
    readonly wallOutlineColor: number;
}

/**
 * D-5 first authored test course. This is gameplay geometry, not the large
 * technical world/camera safety boundary. It is deliberately data-shaped so a
 * later level editor can replace this constant with serialized level data.
 */
export const DEFAULT_GAMEPLAY_COURSE_DEFINITION: GameplayCourseDefinition = {
    minimumX: 100,
    maximumX: 1100,
    minimumY: -1250,
    maximumY: 1250,
    wallThickness: 28,
    openings: [
        { side: "left", start: -520, end: -350 },
        { side: "left", start: 360, end: 530 },
        { side: "right", start: -900, end: -720 },
        { side: "right", start: -120, end: 60 },
        { side: "right", start: 760, end: 940 },
    ],
    ballSpawn: { x: 600, y: 1135 },
    outOfBoundsFallDurationSeconds: 0.24,
    outsideBackgroundColor: 0xeee8ef,
    wallColor: 0xa96f2a,
    wallOutlineColor: 0x81511d,
};
