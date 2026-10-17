/** CB3 tuning: high-authority directional conveyor, without solid collisions. */
export const CONVEYOR_BELT_PHYSICS = {
    /** Conveyor's sustained speed in its local forward direction, in world units/s. */
    targetDirectionalSpeed: 900,
    /** Strong enough to reverse a 1200 units/s opposite shot inside a 200-unit belt. */
    acceleration: 12000,
    /** Contact ramps up across the ball radius instead of switching at its centre. */
    minimumContactWeight: 0,
} as const;
