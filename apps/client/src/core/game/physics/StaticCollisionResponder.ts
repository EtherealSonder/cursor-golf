import type { CollisionManifold } from "./CollisionManifold";

export interface StaticCollisionResponseInput {
    readonly manifold: CollisionManifold;
    readonly incomingVelocityX: number;
    readonly incomingVelocityY: number;
    readonly incomingSpeed: number;
}

export interface StaticCollisionResponse {
    readonly velocityX: number;
    readonly velocityY: number;
}

export type StaticCollisionResponder = (
    input: StaticCollisionResponseInput,
) => StaticCollisionResponse;

/**
 * World-owned registry for exceptional static collision responses.
 * Generic obstacles continue through Ball's normal restitution/friction path.
 */
export class StaticCollisionResponderRegistry {
    private readonly responders = new Map<string, StaticCollisionResponder>();

    public register(id: string, responder: StaticCollisionResponder): void {
        if (id.trim().length === 0) {
            throw new Error("Static collision responder id cannot be empty.");
        }
        if (this.responders.has(id)) {
            throw new Error(`Static collision responder '${id}' is already registered.`);
        }
        this.responders.set(id, responder);
    }

    public unregister(id: string): boolean {
        return this.responders.delete(id);
    }

    public get(id: string): StaticCollisionResponder | null {
        return this.responders.get(id) ?? null;
    }
}
