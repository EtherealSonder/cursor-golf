import type { OverdriveProfiles } from "./OverdriveDefinition";
import { ROTATOR_OVERDRIVE_TARGET_DEGREES_PER_SECOND } from "../rotator/RotatorAnimationDefinition";
/** WM-7A to WM-7E: mechanism-specific profiles. WM-7E conveyor transport and animation consume the active profile. */
export const NORMAL_MECHANISM_PROFILES: Readonly<OverdriveProfiles> = Object.freeze({
    robot: Object.freeze({ movementSpeed: 72, visionRange: 450, visionHalfAngleDegrees: 42, attackDurationSeconds: 5, attackCooldownSeconds: 10, attackWarningSeconds: 1.5, turnSpeedDegreesPerSecond: 324 }),
    paddle: Object.freeze({ angularSpeedRadiansPerSecond: 2.35, ballTangentialTargetSpeed: 450, ballOutwardEscapeSpeed: 110, ballMaximumSpeed: 650, bodyTangentialTargetSpeed: 560, bodyOutwardEscapeSpeed: 190, maximumDynamicImpulsePerSecond: 5600 }),
    rotator: Object.freeze({ angularSpeedDegreesPerSecond: 120 }),
    fan: Object.freeze({ rotorSpeedRadiansPerSecond: 5.8, airflowAccelerationMultiplier: 1, particleSpeedMultiplier: 1 }),
    radialBumper: Object.freeze({ ballBounceMultiplier: 1.35, bodyBounceMultiplier: 1.75, maximumReboundSpeed: 1400, pulseScale: 1.2 }),
    directionalBumper: Object.freeze({ ballMinimumLaunchSpeed: 390, ballLaunchMultiplier: 1.24, maximumLaunchSpeed: 1250, strikeDurationSeconds: 0.08, returnDurationSeconds: 0.16, cooldownSeconds: 0.12, bodyLaunchMultiplier: 1.18, bodyMaximumLaunchSpeed: 850 }),
    conveyor: Object.freeze({ ballTargetSpeed: 900, ballAcceleration: 12000, bodyTargetSpeed: 550, bodyAcceleration: 6500, animationSpeed: 140 }),
});
export const OVERDRIVE_MECHANISM_PROFILES: Readonly<OverdriveProfiles> = Object.freeze({
    robot: Object.freeze({ movementSpeed: 105, visionRange: 540, visionHalfAngleDegrees: 52, attackDurationSeconds: 6.5, attackCooldownSeconds: 6, attackWarningSeconds: 1.2, turnSpeedDegreesPerSecond: 360 }),
    paddle: Object.freeze({ angularSpeedRadiansPerSecond: 3.3, ballTangentialTargetSpeed: 560, ballOutwardEscapeSpeed: 150, ballMaximumSpeed: 780, bodyTangentialTargetSpeed: 680, bodyOutwardEscapeSpeed: 240, maximumDynamicImpulsePerSecond: 6500 }),
    rotator: Object.freeze({ angularSpeedDegreesPerSecond: ROTATOR_OVERDRIVE_TARGET_DEGREES_PER_SECOND }),
    fan: Object.freeze({ rotorSpeedRadiansPerSecond: 9, airflowAccelerationMultiplier: 1.35, particleSpeedMultiplier: 1.4 }),
    radialBumper: Object.freeze({ ballBounceMultiplier: 1.6, bodyBounceMultiplier: 2.05, maximumReboundSpeed: 1550, pulseScale: 1.28 }),
    directionalBumper: Object.freeze({ ballMinimumLaunchSpeed: 460, ballLaunchMultiplier: 1.45, maximumLaunchSpeed: 1400, strikeDurationSeconds: 0.065, returnDurationSeconds: 0.12, cooldownSeconds: 0.09, bodyLaunchMultiplier: 1.35, bodyMaximumLaunchSpeed: 1000 }),
    conveyor: Object.freeze({ ballTargetSpeed: 1100, ballAcceleration: 12000, bodyTargetSpeed: 700, bodyAcceleration: 7500, animationSpeed: 210 }),
});
