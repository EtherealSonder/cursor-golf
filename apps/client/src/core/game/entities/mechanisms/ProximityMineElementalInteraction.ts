import { FireSourceType } from "../../config/FireSourceDefinition";
import type { FireSourceSystem } from "../../environment/FireSourceSystem";
import type { ProximityMine } from "./ProximityMine";
import { mineSegmentContact } from "./ProximityMineContactDetection";
/** Gameplay source geometry, never visual particles; suppressed jets use their effective length. */
export function applyDirectionalFireToMines(mines: readonly ProximityMine[], fire: FireSourceSystem): void {
    for (const source of fire.getSources()) {
        if (!source.isEnabled() || source.getType() !== FireSourceType.Directional) continue;
        const def = source.getDefinition();
        if (def.type !== FireSourceType.Directional) continue;
        const x = source.getPositionX(), y = source.getPositionY(), angle = source.getDirectionRadians();
        const length = fire.getDirectionalEffectiveLength(source.getId(), def.length);
        const ray = { id: source.getId(), startX: x, startY: y, endX: x + Math.cos(angle) * length,
            endY: y + Math.sin(angle) * length, radius: def.halfWidth };
        for (const mine of mines) if (mine.getState() !== "DETONATED" && mineSegmentContact(mine.getX(), mine.getY(), mine.getBodyRadius(), ray)) mine.triggerImmediateDetonation(`fire:${source.getId()}`);
    }
}
/** Sprinklers are excluded. Both player hose and robot hose sources are eligible. */
export function isMineDetonatingWaterSource(sourceId: string): boolean {
    const id = sourceId.toLowerCase();
    return !id.includes("sprinkler") && (id.includes("hose") || id.includes("water-robot"));
}

/**
 * PM-3C water-jet contact. The hose VFX follows authoritative airborne packet
 * sweeps. For this top-down mine, an XY overlap with a hose packet is contact:
 * unlike the Ball, the mine should not reject the visible jet on the basis of
 * the packet's ballistic height. Sprinkler packets remain explicitly excluded.
 * This does not alter packet transport, deposition, or other impact targets.
 */
export function applyHoseWaterToMines(
    mines: readonly ProximityMine[],
    sweeps: readonly import("../../environment/AirborneWaterSystem").AirborneWaterSweep[],
): void {
    if (mines.length === 0) return;
    for (const sweep of sweeps) {
        if (!isMineDetonatingWaterSource(sweep.sourceId)) continue;
        const segment = {
            id: sweep.sourceId,
            startX: sweep.startX,
            startY: sweep.startY,
            endX: sweep.endX,
            endY: sweep.endY,
            radius: 4, // Small allowance for the rendered hose stream width.
        };
        for (const mine of mines) {
            if (mine.getState() === "DETONATED") continue;
            if (mineSegmentContact(mine.getX(), mine.getY(), mine.getBodyRadius(), segment)) {
                mine.triggerImmediateDetonation(`water:${sweep.sourceId}`);
            }
        }
    }
}
