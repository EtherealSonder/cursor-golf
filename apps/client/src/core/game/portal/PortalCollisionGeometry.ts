import type { DynamicCompoundPrimitive } from "../physics/DynamicCollidable";
import { PORTAL_COLLIDER } from "../config/PortalPhysicsDefinition";

export interface PortalColliderSegment {
    readonly kind: "upperHousing" | "lowerHousing";
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
    readonly radius: number;
}
export interface PortalColliderBox {
    readonly kind: "leftHandle" | "rightHandle";
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}
export interface PortalCompoundGeometry {
    readonly housing: readonly PortalColliderSegment[];
    readonly handles: readonly PortalColliderBox[];
}

/** All coordinates are local to the holder center. Geometry is shared by all variants. */
export function createPortalCollisionGeometry(): PortalCompoundGeometry {
    const d = PORTAL_COLLIDER;
    const housing: PortalColliderSegment[] = [];
    // Two elliptical half-arcs, open at the left and right sides.
    for (const [kind, sign] of [["upperHousing", -1], ["lowerHousing", 1]] as const) {
        for (let i = 0; i < d.arcSegments; i++) {
            const a = Math.PI - i * Math.PI / d.arcSegments;
            const b = Math.PI - (i + 1) * Math.PI / d.arcSegments;
            housing.push({kind,
                x1: Math.cos(a) * d.arcRadiusX, y1: sign * Math.sin(a) * d.arcRadiusY,
                x2: Math.cos(b) * d.arcRadiusX, y2: sign * Math.sin(b) * d.arcRadiusY,
                radius: d.arcThickness / 2,
            });
        }
    }
    const handles: PortalColliderBox[] = [
        {kind: "leftHandle", x: -d.handleCenterX, y: 0, width: d.handleWidth, height: d.handleHeight},
        {kind: "rightHandle", x: d.handleCenterX, y: 0, width: d.handleWidth, height: d.handleHeight},
    ];
    return {housing, handles};
}

/** Reuse P2-A dimensions verbatim: capsule arcs + rectangular handles, no center fill. */
export function createPortalCompoundCollisionPrimitives(): readonly DynamicCompoundPrimitive[] {
    const geometry = createPortalCollisionGeometry();
    return [
        ...geometry.housing.map((segment, index): DynamicCompoundPrimitive => ({
            kind: "capsule", id: `${segment.kind}-${index}`,
            x1: segment.x1, y1: segment.y1, x2: segment.x2, y2: segment.y2,
            radius: segment.radius,
        })),
        ...geometry.handles.map((handle): DynamicCompoundPrimitive => ({
            kind: "rectangle", id: handle.kind, x: handle.x, y: handle.y,
            width: handle.width, height: handle.height,
        })),
    ];
}
