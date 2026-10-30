import type { PortalPlacement } from "../level/LevelDefinition";

/** Pure P1 pair selection; no physics, no rendering, no teleportation. */
export function selectValidPortalPairs(
    objects: readonly PortalPlacement[], levelId: string,
): PortalPlacement[] {
    const accepted: PortalPlacement[] = [];
    for (const variant of [1, 2, 3] as const) {
        const group = objects.filter(p => p.type === `portal${variant}`);
        if (!group.length) continue;
        const ids = group.map(p => p.id);
        const expected = [`portal-${variant}-1`, `portal-${variant}-2`];
        if (group.length !== 2 || new Set(ids).size !== 2 ||
            !expected.every(id => ids.includes(id)) ||
            group.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.rotation))) {
            console.warn(`[Portal P1] Level ${levelId}: invalid portal ${variant} pair (${ids.join(", ")}); skipping all instances.`);
            continue;
        }
        accepted.push(...group);
    }
    return accepted;
}

/** Bidirectional lookup over validated instantiated portal pairs. */
export function getPairedPortal<T extends {readonly id:string}>(portals:readonly T[], source:T):T|null {
    const match=/^portal-([123])-([12])$/.exec(source.id);
    if(!match) return null;
    const destinationId=`portal-${match[1]}-${match[2]==="1"?"2":"1"}`;
    return portals.find(p=>p.id===destinationId)??null;
}
