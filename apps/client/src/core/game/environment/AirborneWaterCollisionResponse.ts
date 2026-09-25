import type { AirborneWaterCollisionHit } from "./AirborneWaterObstacleShape";
import type { AirborneWaterPacket } from "./AirborneWaterPacket";

export interface AirborneWaterReflectionDefinition {
    readonly speedRetention: number;
    readonly separationDistance: number;
    readonly minimumOutgoingSpeed: number;
    readonly onImpact?: () => void;
}

export interface AirborneWaterReflectionResult {
    readonly velocityX: number;
    readonly velocityY: number;
    readonly positionX: number;
    readonly positionY: number;
}

/**
 * Policy registry for exceptional static-collider responses.
 * Unregistered colliders keep the existing terminal impact/deposition path.
 */
export class AirborneWaterCollisionResponse {
    private readonly reflectors = new Map<string, AirborneWaterReflectionDefinition>();

    public registerReflector(colliderId: string, definition: AirborneWaterReflectionDefinition): void {
        if (!colliderId) throw new Error("Airborne Water reflector requires a collider id.");
        if (!Number.isFinite(definition.speedRetention) || definition.speedRetention < 0) {
            throw new Error("Airborne Water reflection speedRetention must be finite and >= 0.");
        }
        if (!Number.isFinite(definition.separationDistance) || definition.separationDistance < 0) {
            throw new Error("Airborne Water reflection separationDistance must be finite and >= 0.");
        }
        if (!Number.isFinite(definition.minimumOutgoingSpeed) || definition.minimumOutgoingSpeed < 0) {
            throw new Error("Airborne Water reflection minimumOutgoingSpeed must be finite and >= 0.");
        }
        this.reflectors.set(colliderId, definition);
    }

    public unregister(colliderId: string): void {
        this.reflectors.delete(colliderId);
    }

    public clear(): void {
        this.reflectors.clear();
    }

    public resolve(packet: AirborneWaterPacket, hit: AirborneWaterCollisionHit): AirborneWaterReflectionResult | null {
        if (!hit.colliderId) return null;
        const definition = this.reflectors.get(hit.colliderId);
        if (!definition) return null;

        const nx = hit.normalX;
        const ny = hit.normalY;
        const normalLength = Math.hypot(nx, ny);
        if (normalLength <= 1e-8) return null;
        const normalX = nx / normalLength;
        const normalY = ny / normalLength;

        const incomingX = packet.getVelocityX();
        const incomingY = packet.getVelocityY();
        const incomingSpeed = Math.hypot(incomingX, incomingY);
        const normalVelocity = incomingX * normalX + incomingY * normalY;

        // Only reflect Water travelling into the surface. This also prevents
        // a separated packet from being re-reflected while travelling away.
        if (normalVelocity >= 0) return null;

        let reflectedX = incomingX - 2 * normalVelocity * normalX;
        let reflectedY = incomingY - 2 * normalVelocity * normalY;
        let outgoingSpeed = incomingSpeed * definition.speedRetention;
        outgoingSpeed = Math.max(definition.minimumOutgoingSpeed, outgoingSpeed);

        const reflectedLength = Math.hypot(reflectedX, reflectedY);
        if (reflectedLength > 1e-8) {
            reflectedX = reflectedX / reflectedLength * outgoingSpeed;
            reflectedY = reflectedY / reflectedLength * outgoingSpeed;
        }

        definition.onImpact?.();
        return {
            velocityX: reflectedX,
            velocityY: reflectedY,
            positionX: hit.positionX + normalX * definition.separationDistance,
            positionY: hit.positionY + normalY * definition.separationDistance,
        };
    }
}
