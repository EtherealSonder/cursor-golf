import { WaterSourceType } from "../config/WaterSourceDefinition";
import type { FireManager } from "../environment/FireManager";
import type { WaterSourceSystem } from "../environment/WaterSourceSystem";
import type { ElementalMarble } from "./ElementalMarble";

/** Dispatches a single elemental effect via existing world simulation systems. */
export class ElementalMarbleDischargeController {
    private readonly discharged = new Set<string>();
    constructor(private readonly fire: FireManager, private readonly water: WaterSourceSystem) {}
    public discharge(marble: ElementalMarble): void {
        if (this.discharged.has(marble.id)) return;
        this.discharged.add(marble.id);
        const x = marble.getX(), y = marble.getY();
        if (marble.kind === "fire") { this.fire.ignite(x, y); return; }
        // Radial, airborne water packets; the normal water pipeline handles deposition.
        const packets = 12;
        for (let i = 0; i < packets; i++) {
            this.water.queueEmissionRequest({
                sourceId: `marble-burst-${marble.id}`,
                sourceType: WaterSourceType.DirectionalJet,
                sequence: i + 1,
                positionX: x, positionY: y,
                directionRadians: i * Math.PI * 2 / packets,
                launchSpeed: 210,
                launchElevationRadians: Math.PI / 5,
                waterAmount: 0.11,
                windResponse: 0.18,
                impactMomentumRetention: 0.55,
            });
        }
    }
    public clear(): void { this.discharged.clear(); }
}
