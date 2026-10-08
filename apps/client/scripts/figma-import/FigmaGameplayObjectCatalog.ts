import type { FigmaGameplayObjectKind } from './FigmaNodeDefinition';
import type { LevelObjectPlacement } from '../../src/core/game/level/LevelDefinition';

/** Explicit mappings: image filenames never imply gameplay behavior. */
export interface GameplayCatalogEntry {
    readonly prefix: string;
    readonly kind: FigmaGameplayObjectKind;
    readonly levelType: LevelObjectPlacement['type'];
    readonly assetBasename?: string;
}
export const FIGMA_GAMEPLAY_CATALOG: readonly GameplayCatalogEntry[] = [
    { prefix: 'fan', kind: 'fan', levelType: 'fan', assetBasename: 'fan_body' },
    { prefix: 'water_sprinkler', kind: 'waterSprinkler', levelType: 'sprinkler' },
    { prefix: 'proximity_mine', kind: 'proximityMine', levelType: 'proximityMine' },
    { prefix: 'fire_robot', kind: 'fireRobot', levelType: 'fireRobot' },
    { prefix: 'water_robot', kind: 'waterRobot', levelType: 'waterRobot' },
    { prefix: 'wind_robot', kind: 'windRobot', levelType: 'windRobot' },
    { prefix: 'small_rock', kind: 'smallRock', levelType: 'smallRock' },
    { prefix: 'boulder', kind: 'boulder', levelType: 'boulder' },
];
