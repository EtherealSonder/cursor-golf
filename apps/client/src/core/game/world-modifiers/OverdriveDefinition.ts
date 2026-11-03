/** WM-7A: typed profiles only. Mechanisms are connected in WM-7B through WM-7E. */
export interface RobotOverdriveProfile {
    readonly movementSpeed: number;
    readonly visionRange: number;
    readonly visionHalfAngleDegrees: number;
    readonly attackDurationSeconds: number;
    readonly attackCooldownSeconds: number;
    readonly attackWarningSeconds: number;
    readonly turnSpeedDegreesPerSecond: number;
}
export interface PaddleOverdriveProfile {
    readonly angularSpeedRadiansPerSecond: number;
    readonly ballTangentialTargetSpeed: number;
    readonly ballOutwardEscapeSpeed: number;
    readonly ballMaximumSpeed: number;
    readonly bodyTangentialTargetSpeed: number;
    readonly bodyOutwardEscapeSpeed: number;
    readonly maximumDynamicImpulsePerSecond: number;
}
export interface RotatorOverdriveProfile { readonly angularSpeedDegreesPerSecond: number; }
export interface FanOverdriveProfile {
    readonly rotorSpeedRadiansPerSecond: number;
    readonly airflowAccelerationMultiplier: number;
    readonly particleSpeedMultiplier: number;
}
export interface RadialBumperOverdriveProfile {
    readonly ballBounceMultiplier: number;
    readonly bodyBounceMultiplier: number;
    readonly maximumReboundSpeed: number;
    readonly pulseScale: number;
}
export interface DirectionalBumperOverdriveProfile {
    readonly ballMinimumLaunchSpeed: number;
    readonly ballLaunchMultiplier: number;
    readonly maximumLaunchSpeed: number;
    readonly strikeDurationSeconds: number;
    readonly returnDurationSeconds: number;
    readonly cooldownSeconds: number;
    readonly bodyLaunchMultiplier: number;
    readonly bodyMaximumLaunchSpeed: number;
}
export interface ConveyorOverdriveProfile {
    readonly ballTargetSpeed: number;
    readonly ballAcceleration: number;
    readonly bodyTargetSpeed: number;
    readonly bodyAcceleration: number;
    readonly animationSpeed: number;
}
export interface OverdriveProfiles {
    readonly robot: RobotOverdriveProfile;
    readonly paddle: PaddleOverdriveProfile;
    readonly rotator: RotatorOverdriveProfile;
    readonly fan: FanOverdriveProfile;
    readonly radialBumper: RadialBumperOverdriveProfile;
    readonly directionalBumper: DirectionalBumperOverdriveProfile;
    readonly conveyor: ConveyorOverdriveProfile;
}
export type OverdriveMechanism = keyof OverdriveProfiles;
