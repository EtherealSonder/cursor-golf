import assert from 'node:assert/strict';
import { FIGMA_GAMEPLAY_CATALOG } from './FigmaGameplayObjectCatalog';
import { identifyFigmaObject, getFigmaLevelObjectHandler, getFigmaTransformProfile } from './FigmaObjectRegistry';
import { registerFigmaAssetPrefix } from './FigmaObjectNaming';
import { parseFigmaNodes } from './FigmaNodeParser';
import type { FigmaConvertedObject, FigmaGameplayObjectKind } from './FigmaNodeDefinition';

for (const entry of FIGMA_GAMEPLAY_CATALOG) {
    const identity = identifyFigmaObject(`${entry.prefix}_1`);
    assert.equal(identity?.kind, entry.kind, entry.prefix);
    assert.ok(getFigmaTransformProfile(entry.kind));
    const handler = getFigmaLevelObjectHandler(entry.kind);
    assert.ok(handler, `No handler for ${entry.kind}`);
    const converted = {
        object: { identity: identity!, bounds: {x: 50, y: 60, width: 40, height: 40} },
        transform: { position: {x: 70, y: 80}, rotationRadians: 0.4, scaleX: 1, scaleY: 1 },
    } as FigmaConvertedObject;
    const serialized = handler!(converted);
    assert.equal(serialized.type, entry.levelType);
    assert.equal(serialized.x, 70);
    assert.equal(serialized.y, 80);
}
assert.equal(identifyFigmaObject('bush_3')?.id, 'bush-3');
assert.equal(identifyFigmaObject('fire_marble_1')?.kind, 'fireMarble');
assert.equal(identifyFigmaObject('water_marble_2')?.id, 'water-marble-2');
assert.equal(identifyFigmaObject('rotator_clockwise_1')?.kind, 'rotator');
assert.equal(identifyFigmaObject('rotator_anticlockwise_2')?.direction, 'anticlockwise');
assert.equal(getFigmaTransformProfile('rotator').strategy, 'center');
const rotatorHandler = getFigmaLevelObjectHandler('rotator')!;
assert.deepEqual(rotatorHandler({
    object: { identity: { kind: 'rotator', id: 'rotator-anticlockwise-2', direction: 'anticlockwise' }, bounds: { x: 0, y: 0, width: 200, height: 200 } },
    transform: { position: { x: 400, y: 600 }, rotationRadians: 0, scaleX: 1, scaleY: 1, mirrored: false },
} as FigmaConvertedObject), { id: 'rotator-anticlockwise-2', x: 400, y: 600, type: 'rotator', direction: 'counterClockwise' });
assert.equal(identifyFigmaObject('crate_3')?.id, 'crate-3');
assert.equal(identifyFigmaObject('conveyer_belt_bg_2')?.kind, 'conveyorBelt');
assert.equal(getFigmaTransformProfile('conveyorBelt').strategy, 'center');
const conveyorHandler = getFigmaLevelObjectHandler('conveyorBelt')!;
assert.deepEqual(conveyorHandler({
    object: { identity: { kind: 'conveyorBelt', id: 'conveyer-belt-bg-2' }, bounds: { x: 0, y: 0, width: 200, height: 89 } },
    transform: { position: { x: 200, y: 300 }, rotationRadians: Math.PI / 2, scaleX: 1, scaleY: 1, mirrored: false },
} as FigmaConvertedObject), { id: 'conveyer-belt-bg-2', x: 200, y: 300, type: 'conveyorBelt', rotation: Math.PI / 2 });
assert.equal(getFigmaTransformProfile('crate').strategy, 'center');
assert.equal(getFigmaTransformProfile('crate').sizing, 'fixed');
assert.equal(getFigmaTransformProfile('bush').sizing, 'fixed');
for (const name of ['fan_1', 'water_sprinkler_2', 'proximity_mine_1',
    'fire_robot_1', 'water_robot_1', 'wind_robot_1', 'box_3',
    'directional_bumper_1', 'radial_bumper', 'rotate_paddle_clockwise',
    'rotate_paddle_anticlockwise', 'golf_ball', 'hole', 'opening_3', 'COURSE_BOUNDARY']) {
    assert.ok(identifyFigmaObject(name), `Not recognized: ${name}`);
}
registerFigmaAssetPrefix('crates.png', 'metalBox');
assert.equal(identifyFigmaObject('crates_12')?.kind, 'metalBox');
const nodes = [{ name: 'Test', type: 'FRAME', x: 0, y: 0, width: 500, height: 500,
    children: [
        {name: 'fan_1', type: 'INSTANCE', x: 10, y: 10, width: 50, height: 50},
        {name: 'fan_2', type: 'INSTANCE', x: 100, y: 10, width: 50, height: 50},
        {name: 'water_robot_1', type: 'INSTANCE', x: 150, y: 10, width: 50, height: 50},
    ] }];
const parsed = parseFigmaNodes(nodes);
assert.equal(parsed.objects.length, 3);
assert.equal(parsed.diagnostics.filter(d => d.severity === 'error').length, 0);
const duplicate = parseFigmaNodes([{ ...nodes[0], children: [nodes[0].children[0], nodes[0].children[0]] }]);
assert.ok(duplicate.diagnostics.some(d => d.code === 'DUPLICATE_OBJECT_ID'));
// FI-5C.1C: all Level_01 gameplay layers have a serialization handler.
const expectedGameplayNames = [
    'fan_2', 'box_1', 'box_3', 'directional_bumper_2', 'box_2',
    'proximity_mine_1', 'fan_1', 'fire_robot_1', 'water_robot_1',
    'water_sprinkler_1', 'water_sprinkler_2', 'rotate_paddle_clockwise',
    'radial_bumper', 'directional_bumper_1', 'rotate_paddle_anticlockwise',
];
assert.equal(expectedGameplayNames.length, 15);
for (const name of expectedGameplayNames) {
    const identity = identifyFigmaObject(name);
    assert.ok(identity, `Unrecognized Level_01 gameplay object: ${name}`);
    assert.ok(getFigmaLevelObjectHandler(identity.kind), `Missing serializer for ${name}`);
}
assert.equal(new Set(expectedGameplayNames.map(name => identifyFigmaObject(name)!.id)).size, 15);
console.log('FI-5C.1C gameplay catalog, serialization, and Level_01 inventory tests passed');
