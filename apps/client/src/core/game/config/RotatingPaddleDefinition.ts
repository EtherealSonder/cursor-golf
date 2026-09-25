export type RotatingPaddleDirection = "clockwise" | "counterClockwise";

export interface RotatingPaddleDefinition {
    readonly textureKey: string;
    readonly displayDiameter: number;
    readonly poweredRadius: number;
    readonly centerStopperRadius: number;
    readonly angularSpeedRadiansPerSecond: number;

    readonly targetTangentialSpeedAtOuterRadius: number;
    readonly maximumTangentialDeltaSpeedPerSecond: number;
    readonly additionalTangentialPushPerSecond: number;
    readonly ballOutwardEscapeSpeed: number;
    readonly ballOutwardCouplingPerSecond: number;
    readonly maximumBallSpeed: number;

    readonly dynamicTargetTangentialSpeedAtOuterRadius: number;
    readonly dynamicTangentialDeltaSpeedPerSecond: number;
    readonly dynamicAdditionalTangentialPushPerSecond: number;
    readonly dynamicOutwardEscapeSpeed: number;
    readonly dynamicOutwardCouplingPerSecond: number;
    readonly dynamicEjectionRampSeconds: number;
    readonly dynamicReferenceMass: number;
    readonly dynamicMassResponseExponent: number;
    readonly dynamicMinimumMassFactor: number;
    readonly dynamicMaximumMassFactor: number;
    readonly dynamicMaximumImpulsePerSecond: number;

    readonly waterMinimumDepth: number;
    readonly waterTangentialTargetSpeed: number;
    readonly waterTangentialResponsePerSecond: number;
    readonly waterOutwardTargetSpeed: number;
    readonly waterOutwardResponsePerSecond: number;
    readonly waterMaximumDrivenSpeed: number;
    readonly waterTransportFractionPerSecond: number;
    readonly waterTransportDistance: number;
    readonly waterMinimumTransferFraction: number;
    readonly waterMaximumTransferFraction: number;
    readonly waterMinimumTransferAmount: number;
    readonly waterOuterCaptureMargin: number;
    readonly waterEdgeBandWidth: number;
    readonly waterEdgeOutwardSpeedMultiplier: number;
    readonly waterEdgeCleanupMargin: number;
    readonly waterEdgeMinimumTransferFraction: number;

    readonly centerRestitution: number;
    readonly centerFriction: number;
}

export const ROTATING_PADDLE_DEFINITION: Omit<RotatingPaddleDefinition, "textureKey"> = {
    displayDiameter: 200,
    poweredRadius: 96,
    centerStopperRadius: 20,
    angularSpeedRadiansPerSecond: 2.35,

    // Ball: rotation dominates. Outward escape is deliberately modest so the
    // paddle bends the shot strongly without turning into a launcher.
    targetTangentialSpeedAtOuterRadius: 700,
    maximumTangentialDeltaSpeedPerSecond: 9000,
    additionalTangentialPushPerSecond: 0.5,
    ballOutwardEscapeSpeed: 145,
    ballOutwardCouplingPerSecond: 8.0,
    maximumBallSpeed: 1050,

    // Generic rigid bodies: strong continuous tangential capture followed by a
    // controlled, mass-aware outward escape. The response floor prevents heavy
    // robots from orbiting indefinitely.
    dynamicTargetTangentialSpeedAtOuterRadius: 560,
    dynamicTangentialDeltaSpeedPerSecond: 7200,
    dynamicAdditionalTangentialPushPerSecond: 0.25,
    dynamicOutwardEscapeSpeed: 190,
    dynamicOutwardCouplingPerSecond: 5.5,
    dynamicEjectionRampSeconds: 0.50,
    dynamicReferenceMass: 1,
    dynamicMassResponseExponent: 0.14,
    dynamicMinimumMassFactor: 0.72,
    dynamicMaximumMassFactor: 1.20,
    dynamicMaximumImpulsePerSecond: 5600,

    // RP-3.1 standing Water: aggressively sweep wet cells with the rotation,
    // then drive them outward so puddles cannot remain settled on the surface.
    waterMinimumDepth: 0.01,
    waterTangentialTargetSpeed: 1500,
    waterTangentialResponsePerSecond: 22,
    waterOutwardTargetSpeed: 520,
    waterOutwardResponsePerSecond: 14,
    waterMaximumDrivenSpeed: 1700,
    waterTransportFractionPerSecond: 12,
    waterTransportDistance: 32,
    waterMinimumTransferFraction: 0.16,
    waterMaximumTransferFraction: 0.48,
    waterMinimumTransferAmount: 0.012,
    // Water-cell centers may sit just outside the sprite while the 8 px cell
    // still visibly overlaps it. This margin captures that final fringe.
    waterOuterCaptureMargin: 10,
    waterEdgeBandWidth: 32,
    waterEdgeOutwardSpeedMultiplier: 2.6,
    waterEdgeCleanupMargin: 8,
    waterEdgeMinimumTransferFraction: 0.30,

    centerRestitution: 0.78,
    centerFriction: 0.06,
};

export function createRotatingPaddleDefinition(
    direction: RotatingPaddleDirection,
): RotatingPaddleDefinition {
    return {
        ...ROTATING_PADDLE_DEFINITION,
        textureKey: direction === "clockwise"
            ? "rotatingPaddleClockwise"
            : "rotatingPaddleCounterClockwise",
    };
}
