/**
 * Semantic world-space presentation layers.
 *
 * Global ordering belongs here rather than in individual entities. Local
 * ordering inside one layer may still use child order where required.
 */
export enum WorldRenderLayer {
    BaseTerrain = 100,
    GroundState = 200,
    StandingWater = 300,
    WaterEffects = 400,
    PhysicalObjects = 500,
    GameplayActors = 600,
    AirborneEffects = 700,
    GameplayIndicators = 800,
    Debug = 900,
}
