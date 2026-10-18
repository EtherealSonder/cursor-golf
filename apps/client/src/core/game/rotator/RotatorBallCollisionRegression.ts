import { ROTATOR_DEFINITION } from "../config/RotatorDefinition";
import { rotatorContacts } from "./RotatorCollisionGeometry";

export function assertRotatorBallCollisionRegression(): void {
    const hub = rotatorContacts(0, 0, 0, 2, 0, 0, 10);
    if (!hub.some(c => c.armIndex === -1 && c.depth > 0)) throw new Error("[R3] Hub collider missing");
    const tip = rotatorContacts(0, 0, 0, 2, 94 / Math.SQRT2, 94 / Math.SQRT2, 10);
    if (!tip.some(c => c.armIndex >= 0 && Math.hypot(c.surfaceX, c.surfaceY) > 100)) throw new Error("[R3] Arm tip collider or tangential velocity invalid");
    const reversed = rotatorContacts(0, 0, 0, -2, 94 / Math.SQRT2, 94 / Math.SQRT2, 10);
    const a = tip.find(c => c.armIndex >= 0)!;
    const b = reversed.find(c => c.armIndex === a.armIndex)!;
    if (Math.abs(a.surfaceX + b.surfaceX) > 1e-6 || Math.abs(a.surfaceY + b.surfaceY) > 1e-6) throw new Error("[R3] Rotation direction does not reverse contact velocity");
    if (ROTATOR_DEFINITION.hubDiameter >= ROTATOR_DEFINITION.diameter) throw new Error("[R3] Invalid collider dimensions");
    const nearTip = rotatorContacts(0, 0, 0, 2, 108 / Math.SQRT2, 108 / Math.SQRT2, 10);
    if (!nearTip.some(c => c.armIndex >= 0 && c.depth > 0)) throw new Error("[R3] Rounded end cap does not enclose tip");
    // Ball grazing either rounded corner of the transverse purple end cap.
    const angle = Math.PI / 4;
    const ux = Math.cos(angle), uy = Math.sin(angle);
    const tx = -uy, ty = ux;
    for (const side of [-1, 1]) {
        const capX = ux * ROTATOR_DEFINITION.armOuterRadius + tx * side * ROTATOR_DEFINITION.armCapHalfWidth;
        const capY = uy * ROTATOR_DEFINITION.armOuterRadius + ty * side * ROTATOR_DEFINITION.armCapHalfWidth;
        const contacts = rotatorContacts(0, 0, 0, 2, capX, capY, 9);
        if (!contacts.some(c => c.armIndex === 0 && c.depth > 0)) {
            throw new Error("[R3.1] End-cap corner collider missing");
        }
    }
    // Derive the near-contact probe from the current geometry instead of a
    // hardcoded radius. The shaft/end-cap dimensions may change during tuning.
    // A valid capture is outside physical penetration (depth <= 0), detected
    // only when the optional capture distance is supplied.
    const captureDistance = ROTATOR_DEFINITION.contactCaptureDistance;
    if (captureDistance > 0) {
        let foundNearContact = false;
        const ballRadius = 10;
        const step = Math.max(0.1, Math.min(0.5, captureDistance / 4));
        const searchEnd = ROTATOR_DEFINITION.armOuterRadius +
            ROTATOR_DEFINITION.armCapHalfThickness + ballRadius + captureDistance + 5;
        for (let r = ROTATOR_DEFINITION.armOuterRadius; r <= searchEnd; r += step) {
            const x = r / Math.SQRT2;
            const y = r / Math.SQRT2;
            const actual = rotatorContacts(0, 0, 0, 2, x, y, ballRadius);
            const captured = rotatorContacts(0, 0, 0, 2, x, y, ballRadius, captureDistance);
            if (!actual.some(c => c.armIndex === 0) &&
                captured.some(c => c.armIndex === 0 && c.depth <= 0)) {
                foundNearContact = true;
                break;
            }
        }
        if (!foundNearContact) throw new Error("[R3] Near-contact capture missing");
    }
}
