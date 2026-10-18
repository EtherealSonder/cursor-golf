import { Container } from "pixi.js";
import { WorldRenderLayer } from "./WorldRenderLayer";

/** Owns the fixed semantic PixiJS container hierarchy inside the world root. */
export class WorldPresentationLayers {
    private readonly layers = new Map<WorldRenderLayer, Container>();
    private readonly bushForeground = new Container();
    // Always above foliage; club, aiming UI and ball silhouette live here.
    private readonly aimingForeground = new Container();

    public constructor(private readonly worldRoot: Container) {
        /*
         * Phase 8C-6F scalar-texture ordering:
         * terrain -> Wet/ground state -> standing Water -> Water effects.
         * This guarantees the former puddle footprint is revealed as Water
         * retreats instead of painting Wet terrain above the puddle.
         */
        const orderedLayers: readonly WorldRenderLayer[] = [
            WorldRenderLayer.BaseTerrain,
            WorldRenderLayer.GroundState,
            WorldRenderLayer.SurfaceMechanisms,
            WorldRenderLayer.StandingWater,
            WorldRenderLayer.RotatorMechanisms,
            WorldRenderLayer.WaterEffects,
            WorldRenderLayer.PhysicalObjects,
            WorldRenderLayer.HazardEffects,
            WorldRenderLayer.GameplayActors,
            WorldRenderLayer.AirborneEffects,
            WorldRenderLayer.GameplayIndicators,
            WorldRenderLayer.Debug,
        ];

        for (const layer of orderedLayers) {
            const container = new Container();
            container.label = `WorldLayer:${WorldRenderLayer[layer]}`;
            container.zIndex = layer;
            container.sortableChildren = true;
            this.layers.set(layer, container);
            this.worldRoot.addChild(container);
        }

        this.bushForeground.label = "WorldLayer:BushForeground";
        this.bushForeground.zIndex = 750;
        this.bushForeground.sortableChildren = true;
        this.worldRoot.addChild(this.bushForeground);
        this.aimingForeground.label = "WorldLayer:AimingForeground";
        this.aimingForeground.zIndex = 850;
        this.aimingForeground.sortableChildren = true;
        this.worldRoot.addChild(this.aimingForeground);
        this.worldRoot.sortableChildren = true;
    }

    public getLayer(layer: WorldRenderLayer): Container {
        const container = this.layers.get(layer);
        if (!container) {
            throw new Error(`World presentation layer '${layer}' is unavailable.`);
        }
        return container;
    }

    public getBushForegroundLayer(): Container { return this.bushForeground; }
    public getAimingForegroundLayer(): Container { return this.aimingForeground; }

    /** B6: ball covers the meter origin, while the club stays on top. */
    public arrangeForegroundAim(indicator: Container, ball: Container | null, club: Container | null): void {
        this.aimingForeground.addChildAt(indicator, 0);
        if (ball) this.aimingForeground.addChild(ball);
        if (club) this.aimingForeground.addChild(club);
    }

    public destroy(): void {
        this.aimingForeground.removeFromParent();
        this.aimingForeground.destroy({ children: false });
        this.bushForeground.removeFromParent();
        this.bushForeground.destroy({ children: false });
        this.layers.forEach(
            (container): void => {
                container.removeFromParent();

                container.destroy({
                    children: false,
                });
            },
        );

        this.layers.clear();
    }
}
