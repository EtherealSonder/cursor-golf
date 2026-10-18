import { ROTATOR_DEFINITION } from "../config/RotatorDefinition";

export interface RotatorContact { normalX: number; normalY: number; depth: number; contactX: number; contactY: number; surfaceX: number; surfaceY: number; armIndex: number; }

/** Circle against a segment capsule; the returned surface velocity is evaluated at the actual contact. */
function capsuleContact(cx: number, cy: number, omega: number, bx: number, by: number, radius: number, capture: number,
    ax: number, ay: number, zx: number, zy: number, capsuleRadius: number, armIndex: number): RotatorContact | null {
    const vx = zx - ax, vy = zy - ay;
    const len2 = vx * vx + vy * vy;
    const t = len2 > 1e-10 ? Math.max(0, Math.min(1, ((bx - ax) * vx + (by - ay) * vy) / len2)) : 0;
    const px = ax + vx * t, py = ay + vy * t;
    const dx = bx - px, dy = by - py;
    const distance = Math.hypot(dx, dy);
    if (distance >= radius + capsuleRadius + capture) return null;
    const nx = distance > 1e-8 ? dx / distance : (len2 > 1e-10 ? -vy / Math.sqrt(len2) : 1);
    const ny = distance > 1e-8 ? dy / distance : (len2 > 1e-10 ? vx / Math.sqrt(len2) : 0);
    const contactX = px + nx * capsuleRadius, contactY = py + ny * capsuleRadius;
    return { normalX: nx, normalY: ny, depth: radius + capsuleRadius - distance,
        contactX, contactY, surfaceX: -omega * (contactY - cy), surfaceY: omega * (contactX - cx), armIndex };
}

/** Four deliberately oversized shaft capsules plus transverse end caps, and the unchanged stationary hub.
 * The outer endpoint and cap center share armOuterRadius so the extended tip has no collision gap. */
export function rotatorContacts(cx: number, cy: number, angle: number, omega: number, bx: number, by: number, radius: number, capture = 0): RotatorContact[] {
    const contacts: RotatorContact[] = [];
    const dx = bx - cx, dy = by - cy;
    const hubR = ROTATOR_DEFINITION.hubDiameter / 2;
    const hubD = Math.hypot(dx, dy);
    if (hubD < hubR + radius + capture) {
        const nx = hubD > 1e-8 ? dx / hubD : 1;
        const ny = hubD > 1e-8 ? dy / hubD : 0;
        contacts.push({ normalX: nx, normalY: ny, depth: hubR + radius - hubD,
            contactX: cx + nx * hubR, contactY: cy + ny * hubR, surfaceX: 0, surfaceY: 0, armIndex: -1 });
    }
    for (let i = 0; i < 4; i++) {
        const a = angle + Math.PI / 4 + i * Math.PI / 2;
        const ux = Math.cos(a), uy = Math.sin(a);
        const tx = -uy, ty = ux;
        const shaft = capsuleContact(cx, cy, omega, bx, by, radius, capture,
            cx + ux * ROTATOR_DEFINITION.armInnerRadius, cy + uy * ROTATOR_DEFINITION.armInnerRadius,
            cx + ux * ROTATOR_DEFINITION.armOuterRadius, cy + uy * ROTATOR_DEFINITION.armOuterRadius,
            ROTATOR_DEFINITION.armWidth / 2 + ROTATOR_DEFINITION.armTipSafetyMargin, i);
        if (shaft) contacts.push(shaft);
        // The purple cap is transverse to the shaft, not a circular enlargement
        // that starts only after the ball has passed the shaft endpoint.
        // Match the visual tip while keeping the cap transverse to the shaft.
        // The compound geometry is tested at the final sprite angle, not an
        // intermediate substep angle, during the last projection pass.
        const capCenterX = cx + ux * ROTATOR_DEFINITION.armOuterRadius;
        const capCenterY = cy + uy * ROTATOR_DEFINITION.armOuterRadius;
        const half = ROTATOR_DEFINITION.armCapHalfWidth - ROTATOR_DEFINITION.armCapHalfThickness;
        const cap = capsuleContact(cx, cy, omega, bx, by, radius, capture,
            capCenterX - tx * half, capCenterY - ty * half,
            capCenterX + tx * half, capCenterY + ty * half,
            ROTATOR_DEFINITION.armCapHalfThickness + ROTATOR_DEFINITION.armTipSafetyMargin, i);
        if (cap) contacts.push(cap);
    }
    return contacts;
}
