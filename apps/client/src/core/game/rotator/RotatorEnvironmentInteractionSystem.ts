import type { Rotator } from "../entities/mechanisms/Rotator";
import type { ProximityMine } from "../entities/mechanisms/ProximityMine";
import { ROTATOR_DEFINITION as D } from "../config/RotatorDefinition";
import { rotatorDynamicShapes } from "./RotatorDynamicCollisionGeometry";

/** Pure circle-vs-oriented-rectangle/circle mine overlap; no new explosion lifecycle. */
export function rotatorMineContact(rotator: Rotator, x: number, y: number, radius: number): boolean {
    const c = rotator.getCenter();
    if (Math.hypot(x - c.x, y - c.y) > D.diameter + radius) return false;
    for (const shape of rotatorDynamicShapes(rotator)) {
        if (shape.shape === "circle") {
            if (Math.hypot(x - shape.positionX, y - shape.positionY) <= radius + shape.radius) return true;
        } else {
            const dx = x - shape.positionX, dy = y - shape.positionY;
            const cos = Math.cos(shape.rotationRadians), sin = Math.sin(shape.rotationRadians);
            const lx = dx * cos + dy * sin, ly = -dx * sin + dy * cos;
            const px = Math.max(-shape.width / 2, Math.min(shape.width / 2, lx));
            const py = Math.max(-shape.height / 2, Math.min(shape.height / 2, ly));
            if ((lx - px) ** 2 + (ly - py) ** 2 <= radius * radius) return true;
        }
    }
    return false;
}

export class RotatorEnvironmentInteractionSystem {
    public triggerMineContacts(rotators: readonly Rotator[], mines: readonly ProximityMine[]): void {
        for (const mine of mines) {
            if (mine.getState() === "DETONATED") continue;
            for (const rotator of rotators) {
                if (rotatorMineContact(rotator, mine.getX(), mine.getY(), mine.getBodyRadius())) {
                    mine.triggerImmediateDetonation(`rotator:${rotator.getId()}`);
                    break;
                }
            }
        }
    }
}
