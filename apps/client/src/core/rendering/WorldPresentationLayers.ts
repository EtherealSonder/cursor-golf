import { Container } from "pixi.js";
import { WorldRenderLayer } from "./WorldRenderLayer";

/** Owns the fixed semantic PixiJS container hierarchy inside the world root. */
export class WorldPresentationLayers {
    private readonly layers = new Map<WorldRenderLayer, Container>();

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
            WorldRenderLayer.WaterEffects,
            WorldRenderLayer.PhysicalObjects,
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

        this.worldRoot.sortableChildren = true;
    }

    public getLayer(layer: WorldRenderLayer): Container {
        const container = this.layers.get(layer);
        if (!container) {
            throw new Error(`World presentation layer '${layer}' is unavailable.`);
        }
        return container;
    }

    public destroy(): void {
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
