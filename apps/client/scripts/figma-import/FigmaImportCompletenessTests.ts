/** Run from apps/client: npx tsx scripts/figma-import/FigmaImportCompletenessTests.ts [figma-exports/level-01/level.json figma-exports/level-01/level.svg] */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runFigmaImportPipeline } from './FigmaImportPipeline';
import { parseFigmaNodes } from './FigmaNodeParser';
import { loadLevelDefinition } from '../../src/core/game/level/LevelLoader';

const names = [
    'COURSE_BOUNDARY', 'fan_2', 'box_1', 'box_3', 'golf_ball', 'hole',
    'opening_1', 'opening_2', 'directional_bumper_2', 'opening_3',
    'box_2', 'proximity_mine_1', 'fan_1', 'fire_robot_1', 'water_robot_1',
    'water_sprinkler_1', 'water_sprinkler_2', 'rotate_paddle_clockwise',
    'radial_bumper', 'directional_bumper_1', 'rotate_paddle_anticlockwise',
];
const expectedTypes: Record<string, number> = {
    fan: 2, staticMetalBox: 3, directionalBumper: 2, proximityMine: 1,
    fireRobot: 1, waterRobot: 1, sprinkler: 2, rotatingPaddle: 2,
    radialBumper: 1,
};
const jsonPath = resolve(process.argv[2] ?? 'figma-exports/level-01/level.json');
const svgPath = resolve(process.argv[3] ?? 'figma-exports/level-01/level.svg');
if (!existsSync(jsonPath) || !existsSync(svgPath)) {
    console.log(`SKIP real Level_01 fixture: ${jsonPath} and ${svgPath} are required. Pass paths to run full completeness checks.`);
} else {
    const json = JSON.parse(readFileSync(jsonPath, 'utf8')) as unknown;
    const svg = readFileSync(svgPath, 'utf8');
    const parsed = parseFigmaNodes(json);
    assert.equal(parsed.objects.length, 21, 'Level_01 must contain exactly 21 recognized objects');
    assert.deepEqual([...parsed.objects.map(o => o.name)].sort(), [...names].sort(), 'Level_01 source inventory differs');
    const result = runFigmaImportPipeline(json, svg, 'level-01');
    assert.equal(result.matchedCount, 21, JSON.stringify(result.validation.diagnostics));
    assert.equal(result.validation.valid, true, JSON.stringify(result.validation.diagnostics));
    const level = result.generation.level;
    assert.ok(level, 'Generator returned no level');
    assert.equal(result.generation.serializedCount, 21);
    assert.equal(level.course.type, 'polygon');
    assert.equal(level.course.openings.length, 3);
    assert.equal(level.objects.length, 15);
    for (const [type, count] of Object.entries(expectedTypes)) {
        assert.equal(level.objects.filter(o => o.type === type).length, count, `Count mismatch for ${type}`);
    }
    const ids = level.objects.map(o => o.id);
    assert.equal(new Set(ids).size, 15, 'Duplicate serialized object IDs');
    for (const obj of level.objects) {
        assert.ok(Number.isFinite(obj.x) && Number.isFinite(obj.y), `Nonfinite placement ${obj.id}`);
    }
    const loaded = loadLevelDefinition(level, { worldOrigin: { x: 0, y: 0 } });
    assert.equal(loaded.ok, true, JSON.stringify(loaded.validation.errors));
    if (loaded.ok) assert.equal(loaded.level.objects.length, 15);
    const existingPath = resolve('src/core/game/levels/level-01.json');
    if (existsSync(existingPath)) {
        const existing = JSON.parse(readFileSync(existingPath, 'utf8')) as unknown;
        assert.deepEqual(existing, level, 'Committed level-01.json differs from current Figma export; reimport first');
    }
    console.log('FI-5C.1C Level_01 completeness, runtime loading, and saved output checks passed (21/21)');
}
