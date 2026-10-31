import type { DynamicObstacleDefinition } from "../config/ObstacleDefinition";
import type { PortalTeleportAdapter, PortalTeleportPose } from "./PortalTeleportAdapter";
import type { Rock } from "../entities/props/Rock";
import type { Crate } from "../crate/Crate";
import type { ElementalMarble } from "../marble/ElementalMarble";
import type { Fan } from "../entities/mechanisms/Fan";
import type { Sprinkler } from "../entities/mechanisms/Sprinkler";
import type { Robot } from "../entities/robots/Robot";

function footprint(definition: DynamicObstacleDefinition): number {
    if (definition.shape === "circle") return definition.radius;
    if (definition.shape === "rectangle") return Math.hypot(definition.width, definition.height) / 2;
    return Math.max(...definition.points.map(point => Math.hypot(point.x, point.y)));
}

type Movable = {
    getX(): number; getY(): number; getVelocityX(): number; getVelocityY(): number;
    getDefinition(): DynamicObstacleDefinition;
    teleportTo(x: number, y: number, vx: number, vy: number): void;
};

function adapt(id: string, body: Movable, eligible: () => boolean, kind: NonNullable<PortalTeleportAdapter["kind"]>): PortalTeleportAdapter {
    return {
        id, kind,
        getCollisionRadius: () => footprint(body.getDefinition()),
        getPose: () => ({ x: body.getX(), y: body.getY(), vx: body.getVelocityX(), vy: body.getVelocityY() }),
        canTeleport: eligible,
        applyTeleport: (pose: PortalTeleportPose) => {
            body.teleportTo(pose.x, pose.y, pose.vx, pose.vy);
        },
    };
}

export function rockPortalAdapter(body: Rock): PortalTeleportAdapter {
    return adapt(`rock:${body.id}`, body, () => body.canPortalTeleport(), "rock");
}
export function cratePortalAdapter(body: Crate): PortalTeleportAdapter {
    return adapt(`crate:${body.id}`, body, () => !body.isDestroyed && !body.isVoidRemoving, "crate");
}
export function marblePortalAdapter(body: ElementalMarble): PortalTeleportAdapter {
    return adapt(`marble:${body.id}`, body, () => !body.isRemoving(), "marble");
}
export function fanPortalAdapter(body: Fan): PortalTeleportAdapter {
    return adapt(`fan:${body.getDefinition().id}`, body, () => body.canPortalTeleport(), "fan");
}
export function sprinklerPortalAdapter(body: Sprinkler): PortalTeleportAdapter {
    return adapt(`sprinkler:${body.getDefinition().id}`, body, () => body.canPortalTeleport(), "sprinkler");
}
export function robotPortalAdapter(body: Robot): PortalTeleportAdapter {
    return adapt(`robot:${body.getDefinition().id}`, body, () => body.canPortalTeleport(), "robot");
}
