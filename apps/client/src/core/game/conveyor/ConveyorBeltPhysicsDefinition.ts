/** CB3 tuning: high-authority directional conveyor, without solid collisions. */
export const CONVEYOR_BELT_PHYSICS = {
    /** Conveyor's sustained speed in its local forward direction, in world units/s. */
    targetDirectionalSpeed: 900,
    /** Strong enough to reverse a 1200 units/s opposite shot inside a 200-unit belt. */
    acceleration: 12000,
    /** Contact ramps up across the ball radius instead of switching at its centre. */
    minimumContactWeight: 0,
    /** Dynamic rigid-body conveyor transport, tuned below the ball response. */
    dynamicTargetDirectionalSpeed: 550,
    dynamicAcceleration: 6500,
    /** Off-centre conveyor contact imparts rotational impulse, bounded for stability. */
    dynamicTorqueScale: 0.32,
    dynamicMaximumContactOffset: 26,
    /** Standing-water transport is gentler than ball and crate transport. */
    waterTargetDirectionalSpeed: 160,
    waterResponsePerSecond: 12,
    waterMaximumDrivenSpeed: 180,
    waterTransferFractionPerSecond: 14,
    waterTransportDistance: 18,
    waterMinimumDepth: 0.00001,
} as const;
