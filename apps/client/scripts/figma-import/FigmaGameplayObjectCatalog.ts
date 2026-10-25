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
    { prefix: 'portal_1', kind: 'portal1', levelType: 'portal1', assetBasename: 'portal_1' },
    { prefix: 'portal_2', kind: 'portal2', levelType: 'portal2', assetBasename: 'portal_2' },
    { prefix: 'portal_3', kind: 'portal3', levelType: 'portal3', assetBasename: 'portal_3' },
    { prefix: 'fan', kind: 'fan', levelType: 'fan', assetBasename: 'fan_body' },
    { prefix: 'water_sprinkler', kind: 'waterSprinkler', levelType: 'sprinkler' },
    { prefix: 'proximity_mine', kind: 'proximityMine', levelType: 'proximityMine' },
    { prefix: 'fire_robot', kind: 'fireRobot', levelType: 'fireRobot' },
    { prefix: 'water_robot', kind: 'waterRobot', levelType: 'waterRobot' },
    { prefix: 'wind_robot', kind: 'windRobot', levelType: 'windRobot' },
    { prefix: 'small_rock', kind: 'smallRock', levelType: 'smallRock' },
    { prefix: 'boulder', kind: 'boulder', levelType: 'boulder' },
    { prefix: 'bush', kind: 'bush', levelType: 'bush', assetBasename: 'bush' },
    { prefix: 'fire_marble', kind: 'fireMarble', levelType: 'fireMarble', assetBasename: 'fire_marble' },
    { prefix: 'water_marble', kind: 'waterMarble', levelType: 'waterMarble', assetBasename: 'water_marble' },
    { prefix: 'crate', kind: 'crate', levelType: 'crate', assetBasename: 'crate' },
    { prefix: 'conveyer_belt_bg', kind: 'conveyorBelt', levelType: 'conveyorBelt', assetBasename: 'conveyer_belt_bg' },
];
