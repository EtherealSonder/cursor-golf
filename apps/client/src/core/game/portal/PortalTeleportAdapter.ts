/** P4-A contract. Adapters delegate writes to each object's authoritative physics controller. */
export interface PortalTeleportPose {
    readonly x: number;
    readonly y: number;
    readonly vx: number;
    readonly vy: number;
}

export interface PortalTeleportAdapter {
    /** Unique, stable ID for this object during its registered lifetime. */
    readonly id: string;
    /** Conservative circular footprint used for entry and exit clearance. */
    getCollisionRadius(): number;
    getPose(): PortalTeleportPose;
    /** Return false when destroyed, immovable, or temporarily ineligible. */
    canTeleport(): boolean;
    /** Apply position and linear velocity together using the object's own controller. */
    applyTeleport(pose: PortalTeleportPose): void;
    /** Optional diagnostic category for a supported gameplay body. */
    readonly kind?: "rock" | "crate" | "marble" | "fan" | "sprinkler" | "robot";
}
