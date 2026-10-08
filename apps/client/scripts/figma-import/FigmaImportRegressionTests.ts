/** Run from apps/client: npx tsx scripts/figma-import/FigmaImportRegressionTests.ts [figma-exports/level-01/level.json figma-exports/level-01/level.svg] */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runFigmaImportPipeline } from './FigmaImportPipeline';
import { parseFigmaNodes } from './FigmaNodeParser';

const jsonPath = resolve(process.argv[2] ?? 'figma-exports/level-01/level.json');
const svgPath = resolve(process.argv[3] ?? 'figma-exports/level-01/level.svg');
if (!existsSync(jsonPath) || !existsSync(svgPath)) {
    console.log(`SKIP real Level_01 regression fixture: ${jsonPath} and ${svgPath} are required.`);
} else {
    const original = JSON.parse(readFileSync(jsonPath, 'utf8')) as Record<string, unknown>;
    const svg = readFileSync(svgPath, 'utf8');
    const first = runFigmaImportPipeline(original, svg, 'level-01');
    assert.equal(first.validation.valid, true, JSON.stringify(first.validation.diagnostics));
    const second = runFigmaImportPipeline(original, svg, 'level-01');
    assert.deepEqual(second.generation.level, first.generation.level, 'Importer output is nondeterministic');
    assert.deepEqual(second.validation.diagnostics, first.validation.diagnostics, 'Diagnostics are nondeterministic');

    // Keep source fixture immutable; every negative case uses a deep clone.
    const clone = () => structuredClone(original);
    // Figma exports can be an array of root frames, a document wrapper,
    // or a single root frame. Return the actual mutable frame, not its wrapper.
    const frame = (data: unknown): { children: Array<Record<string, unknown>> } => {
        const documentRoot = data !== null && typeof data === 'object' && !Array.isArray(data)
            && 'document' in data ? (data as { document: unknown }).document : data;
        const roots = Array.isArray(documentRoot) ? documentRoot : [documentRoot];
        const candidate = roots.find((node): node is Record<string, unknown> =>
            node !== null && typeof node === 'object' && !Array.isArray(node)
            && node.type === 'FRAME' && Array.isArray(node.children));
        assert.ok(candidate, 'Expected a Figma FRAME with children (array, document, or single-node export)');
        return candidate as { children: Array<Record<string, unknown>> };
    };
    const source = frame(clone());
    assert.ok(source.children.length >= 2);
    const duplicated = clone();
    const duplicateChildren = frame(duplicated).children;
    duplicateChildren.push(structuredClone(duplicateChildren.find(c => c.name === 'fan_1') ?? duplicateChildren[1]));
    assert.ok(parseFigmaNodes(duplicated).diagnostics.some(d => d.code === 'DUPLICATE_OBJECT_ID'));
    assert.equal(runFigmaImportPipeline(duplicated, svg, 'level-01').validation.valid, false);

    for (const missingName of ['golf_ball', 'hole']) {
        const missing = clone();
        frame(missing).children = frame(missing).children.filter(c => c.name !== missingName);
        const result = runFigmaImportPipeline(missing, svg, 'level-01');
        assert.equal(result.validation.valid, false, `Missing ${missingName} must fail`);
    }
    const unsupported = clone();
    frame(unsupported).children.push({ name: 'unregistered_gameplay_999', type: 'RECTANGLE', x: 100, y: 100, width: 20, height: 20 });
    const unknownResult = runFigmaImportPipeline(unsupported, svg, 'level-01');
    assert.equal(unknownResult.validation.valid, false);
    assert.ok(unknownResult.validation.diagnostics.some(d => d.code === 'UNSUPPORTED_FIGMA_LAYER'));

    const mismatched = runFigmaImportPipeline(original, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2500 2000"></svg>', 'level-01');
    assert.equal(mismatched.validation.valid, false, 'Missing SVG shapes must fail');
    assert.ok(mismatched.validation.diagnostics.some(d => d.code === 'SVG_MATCH_COUNT'));

    console.log('FI-5C.1C deterministic import and negative regression tests passed');
}
