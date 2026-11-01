import type { EnvironmentField } from "../environment/EnvironmentField";
import type { WaterGroundInteractionSystem } from "../environment/WaterGroundInteractionSystem";
import type { MoistureSurfaceBridge } from "../environment/MoistureSurfaceBridge";
import type { SurfaceSystem } from "../surface/SurfaceSystem";
import { DOWNPOUR_CONFIG } from "./DownpourConfig";

/** Applies a persistent substrate floor. Does not inject standing water. */
export class DownpourController {
    private enabled = false;
    public constructor(
        private readonly field: EnvironmentField,
        private readonly ground: WaterGroundInteractionSystem,
        private readonly bridge: MoistureSurfaceBridge,
        private readonly surface: SurfaceSystem,
    ) {}
    public isEnabled(): boolean { return this.enabled; }
    public setEnabled(enabled: boolean): void {
        if (this.enabled === enabled) return;
        this.enabled = enabled;
        this.field.setPersistentMoistureFloor(enabled ? DOWNPOUR_CONFIG.moistureFloor : 0);
        this.ground.setPersistentMoistureFloor(enabled ? DOWNPOUR_CONFIG.moistureFloor : 0);
        this.bridge.setPersistentMoistureFloor(enabled ? DOWNPOUR_CONFIG.moistureFloor : 0);
        // WM-4A: the 0.65 floor is virtual. Never populate thousands of tracked
        // moisture cells solely to represent persistent rainfall.
        if (import.meta.env.DEV) {
            console.info("[WM-4A] Downpour", {
                enabled,
                moistureFloor: enabled ? DOWNPOUR_CONFIG.moistureFloor : 0,
                trackedMoistureCells: this.field.getTrackedMoistureCellCount(),
                bulkMoistureInjection: false,
                rainVfxEnabled: DOWNPOUR_CONFIG.enableRainVfx,
                wetGroundRenderingEnabled: DOWNPOUR_CONFIG.enableWetGroundRendering,
            });
        }
        this.surface.notifyDerivedStateChanged();
    }
}
