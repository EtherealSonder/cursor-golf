import {
    FireSourceType,
} from "../config/FireSourceDefinition";

import type {
    FireSourceSystem,
} from "../environment/FireSourceSystem";

import type {
    FireCell,
} from "../environment/FireCell";

export interface DirectionalFirePresentationFootprint {
    readonly sourceId: string;
    readonly originX: number;
    readonly originY: number;
    readonly directionX: number;
    readonly directionY: number;
    readonly effectiveLength: number;
    readonly halfWidth: number;
}

/**
 * Phase F-2 presentation-only ownership region.
 *
 * Reads active Directional FireSource state and its authoritative current
 * effective length. It never deposits heat, ignites/extinguishes Fire,
 * changes source state, or writes scorch/burn history.
 */
export class DirectionalFirePresentationRegion {
    private readonly footprints: DirectionalFirePresentationFootprint[] = [];

    private readonly ownedFireCellKeys =
        new Set<string>();

    public constructor(
        private readonly fireSourceSystem: FireSourceSystem,
    ) {}

    public update(): void {
        this.footprints.length = 0;

        for (const source of this.fireSourceSystem.getSources()) {
            if (!source.isEnabled() || source.getType() !== FireSourceType.Directional) {
                continue;
            }

            const definition = source.getDefinition();
            if (definition.type !== FireSourceType.Directional) {
                continue;
            }

            const direction = source.getDirectionRadians();
            const effectiveLength = Math.max(
                0,
                this.fireSourceSystem.getDirectionalEffectiveLength(
                    source.getId(),
                    definition.length,
                ),
            );

            if (effectiveLength <= 0) {
                continue;
            }

            this.footprints.push({
                sourceId: source.getId(),
                originX: source.getPositionX(),
                originY: source.getPositionY(),
                directionX: Math.cos(direction),
                directionY: Math.sin(direction),
                effectiveLength,
                halfWidth: Math.max(0, definition.halfWidth),
            });
        }
    }

    public syncOwnedFireCells(
        cells: readonly FireCell[],
    ): void {
        this.ownedFireCellKeys.clear();

        for (const cell of cells) {
            if (
                cell &&
                this.containsPoint(
                    cell.getWorldCenterX(),
                    cell.getWorldCenterY(),
                )
            ) {
                this.ownedFireCellKeys.add(
                    DirectionalFirePresentationRegion.getFireCellKey(cell),
                );
            }
        }
    }

    public ownsFireCell(cell: FireCell): boolean {
        return this.ownedFireCellKeys.has(
            DirectionalFirePresentationRegion.getFireCellKey(cell),
        );
    }

    public ownsFireCellKey(key: string | undefined): boolean {
        return (
            typeof key === "string" &&
            this.ownedFireCellKeys.has(key)
        );
    }

    public getOwnedFireCellCount(): number {
        return this.ownedFireCellKeys.size;
    }

    public containsPoint(worldX: number, worldY: number): boolean {
        if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) {
            return false;
        }

        for (const footprint of this.footprints) {
            if (DirectionalFirePresentationRegion.containsPointInFootprint(
                worldX,
                worldY,
                footprint,
            )) {
                return true;
            }
        }

        return false;
    }

    public getFootprints(): readonly DirectionalFirePresentationFootprint[] {
        return this.footprints;
    }

    public reset(): void {
        this.footprints.length = 0;
        this.ownedFireCellKeys.clear();
    }

    public static getFireCellKey(cell: FireCell): string {
        return `${cell.getWorldCenterX()}:${cell.getWorldCenterY()}`;
    }

    public static containsPointInFootprint(
        worldX: number,
        worldY: number,
        footprint: DirectionalFirePresentationFootprint,
    ): boolean {
        const offsetX = worldX - footprint.originX;
        const offsetY = worldY - footprint.originY;
        const forward = offsetX * footprint.directionX + offsetY * footprint.directionY;

        if (forward < 0 || forward > footprint.effectiveLength) {
            return false;
        }

        const lateral = Math.abs(
            offsetX * -footprint.directionY +
            offsetY * footprint.directionX,
        );

        return lateral <= footprint.halfWidth;
    }
}
