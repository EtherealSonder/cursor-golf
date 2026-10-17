import type { DynamicCollidable } from "../physics/DynamicCollidable";
import type { PhysicsWorld } from "../physics/PhysicsWorld";
import type { ConveyorBelt } from "../entities/mechanisms/ConveyorBelt";
import { Crate } from "../crate/Crate";
import { Robot } from "../entities/robots/Robot";
import { CONVEYOR_BELT_PHYSICS } from "./ConveyorBeltPhysicsDefinition";

type Point = { x: number; y: number };

function clip(poly: Point[], axis: "x" | "y", boundary: number, positive: boolean): Point[] {
    const result: Point[] = [];
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i];
        const b = poly[(i + 1) % poly.length];
        const da = (a[axis] - boundary) * (positive ? 1 : -1);
        const db = (b[axis] - boundary) * (positive ? 1 : -1);
        if (da >= 0) result.push(a);
        if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
            const t = da / (da - db);
            result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }
    }
    return result;
}

function polygonAreaCentroid(points: readonly Point[]): { area: number; x: number; y: number } {
    let twiceArea = 0, sx = 0, sy = 0;
    for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        const cross = a.x * b.y - b.x * a.y;
        twiceArea += cross;
        sx += (a.x + b.x) * cross;
        sy += (a.y + b.y) * cross;
    }
    if (Math.abs(twiceArea) < 1e-7) return { area: 0, x: 0, y: 0 };
    return { area: Math.abs(twiceArea) / 2, x: sx / (3 * twiceArea), y: sy / (3 * twiceArea) };
}

/** Exact rotated-rectangle clipping; circles use a 20-sided contact approximation. */
export function conveyorDynamicContact(
    body: DynamicCollidable, belt: ConveyorBelt,
): { weight: number; x: number; y: number } {
    const shape = body.getDefinition();
    const width = belt.getFootprintWidth(), height = belt.getFootprintHeight();
    const angle = belt.getRotationRadians();
    const c = Math.cos(angle), s = Math.sin(angle);
    const dx = body.getX() - belt.getX(), dy = body.getY() - belt.getY();
    const cx = c * dx + s * dy, cy = -s * dx + c * dy;
    const vertices: Point[] = [];
    let bodyArea: number;
    if (shape.shape === "rectangle") {
        const halfW = shape.width / 2, halfH = shape.height / 2;
        const theta = body.getRotationRadians() - angle;
        const bc = Math.cos(theta), bs = Math.sin(theta);
        for (const [x, y] of [[-halfW,-halfH],[halfW,-halfH],[halfW,halfH],[-halfW,halfH]]) {
            vertices.push({ x: cx + bc * x - bs * y, y: cy + bs * x + bc * y });
        }
        bodyArea = shape.width * shape.height;
    } else if (shape.shape === "circle") {
        const segments = 20;
        for (let i = 0; i < segments; i++) {
            const t = i * 2 * Math.PI / segments;
            vertices.push({ x: cx + Math.cos(t) * shape.radius, y: cy + Math.sin(t) * shape.radius });
        }
        bodyArea = polygonAreaCentroid(vertices).area;
    } else return { weight: 0, x: body.getX(), y: body.getY() };
    let clipped = vertices;
    clipped = clip(clipped, "x", -width / 2, true);
    clipped = clip(clipped, "x", width / 2, false);
    clipped = clip(clipped, "y", -height / 2, true);
    clipped = clip(clipped, "y", height / 2, false);
    if (clipped.length < 3 || bodyArea <= 0) return { weight: 0, x: body.getX(), y: body.getY() };
    const contact = polygonAreaCentroid(clipped);
    return {
        weight: Math.min(1, Math.max(0, contact.area / bodyArea)),
        x: belt.getX() + c * contact.x - s * contact.y,
        y: belt.getY() + s * contact.x + c * contact.y,
    };
}

/** Adds impulses to registered movable bodies without changing pose or collision ownership. */
export class ConveyorBeltDynamicTransportSystem {
    public update(dt: number, physics: PhysicsWorld, belts: readonly ConveyorBelt[]): void {
        if (!Number.isFinite(dt) || dt <= 0 || belts.length === 0) return;
        for (const body of physics.getMovableRigidDynamicCollidables()) {
            // Robot movement is AI-owned. Do not override navigation in CB4.
            if (body instanceof Robot || (body instanceof Crate && body.isDestroyed)) continue;
            const invMass = body.getInverseMass();
            if (!(invMass > 0)) continue;
            for (const belt of belts) {
                const contact = conveyorDynamicContact(body, belt);
                if (contact.weight <= 0) continue;
                const direction = belt.getTransportDirection();
                const speed = body.getVelocityX() * direction.x + body.getVelocityY() * direction.y;
                const remaining = CONVEYOR_BELT_PHYSICS.dynamicTargetDirectionalSpeed - speed;
                if (remaining <= 0) continue;
                const dv = Math.min(remaining, CONVEYOR_BELT_PHYSICS.dynamicAcceleration * dt * contact.weight);
                const impulse = dv / invMass;
                const ix = direction.x * impulse, iy = direction.y * impulse;
                const offsetX = contact.x - body.getX(), offsetY = contact.y - body.getY();
                const offsetLength = Math.hypot(offsetX, offsetY);
                const offsetScale = offsetLength > 0 ? Math.min(1, CONVEYOR_BELT_PHYSICS.dynamicMaximumContactOffset / offsetLength) : 1;
                const contactX = body.getX() + offsetX * offsetScale * CONVEYOR_BELT_PHYSICS.dynamicTorqueScale;
                const contactY = body.getY() + offsetY * offsetScale * CONVEYOR_BELT_PHYSICS.dynamicTorqueScale;
                if (body instanceof Crate) body.applyConveyorImpulse(ix, iy, contactX, contactY);
                else body.applyImpulseAtWorldPoint(ix, iy, contactX, contactY);
            }
        }
    }
}
