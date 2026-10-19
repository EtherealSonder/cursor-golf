/**
 * Semantic world-space presentation layers.
 *
 * Global ordering belongs here rather than in individual entities. Local
 * ordering inside one layer may still use child order where required.
 */
export enum WorldRenderLayer {
    BaseTerrain = 100,
    GroundState = 200,
    SurfaceMechanisms = 250,
    StandingWater = 300,
    /** R5: motorized rotators sit above puddles but below airborne splashes. */
    RotatorMechanisms = 350,
    WaterEffects = 400,
    PhysicalObjects = 500,
    /** Presentation-only hazards that must remain readable below actors. */
    HazardEffects = 550,
    GameplayActors = 600,
    AirborneEffects = 700,
    GameplayIndicators = 800,
    /** Wind particles render above foliage but below the aiming foreground. */
    WindForeground = 825,
    Debug = 900,
}
