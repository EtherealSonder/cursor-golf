/** Run from the client root: npx tsx scripts/figma-import/FigmaImportCoordinateTests.ts */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFigmaNodes } from './FigmaNodeParser';
import { parseFigmaSvg } from './FigmaSvgParser';
import { extractFigmaSvgGeometry } from './FigmaSvgGeometryExtractor';
import { matchFigmaSvgNodes } from './FigmaSvgNodeMatcher';
import { resolveFigmaMatchedGeometry } from './FigmaResolvedGeometry';
import { convertFigmaObjects } from './FigmaTransformConverter';
import { convertFigmaGeometry } from './FigmaGeometryConverter';
import { resolveFigmaName, registerFigmaAssetPrefix } from './FigmaObjectNaming';
import type { FigmaNode } from './FigmaNodeDefinition';

const near=(actual:number,expected:number,tolerance=0.01)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);
assert.equal(resolveFigmaName('fan_1')?.kind, 'fan', 'FI-5C.1B registers fan objects');
assert.equal(resolveFigmaName('fan_1')?.id, 'fan-1');
assert.equal(resolveFigmaName('box_3')?.id,'box-3');
assert.equal(resolveFigmaName('rotate_paddle_clockwise')?.direction,'clockwise');
registerFigmaAssetPrefix('crates.png','metalBox');
assert.equal(resolveFigmaName('crates_2')?.id,'crates-2');

const root:FigmaNode={name:'Test',type:'FRAME',x:2102,y:0,width:2500,height:2000,children:[
    {name:'COURSE_BOUNDARY',type:'VECTOR',x:100,y:100,width:800,height:800},
    {name:'golf_ball',type:'INSTANCE',x:200,y:200,width:20,height:20},
    {name:'hole',type:'INSTANCE',x:400,y:400,width:36,height:36},
    {name:'opening_1',type:'RECTANGLE',x:100,y:300,width:28,height:100},
    {name:'box_3',type:'RECTANGLE',x:500,y:500,width:50,height:60},
]};
const svg=`<svg viewBox="0 0 2500 2000" xmlns="http://www.w3.org/2000/svg">
<path d="M100 100H900V900H100Z"/><rect x="200" y="200" width="20" height="20"/>
<circle cx="418" cy="418" r="18"/><rect x="100" y="300" width="28" height="100"/>
<rect x="500" y="500" width="50" height="60"/></svg>`;
const parsed=parseFigmaNodes(root);
assert.equal(parsed.diagnostics.length,0);
const geometries=extractFigmaSvgGeometry(parseFigmaSvg(svg));
const matched=matchFigmaSvgNodes(parsed.objects,geometries);
assert.equal(matched.matches.length,5,JSON.stringify(matched.diagnostics));
const resolved=resolveFigmaMatchedGeometry(matched);
const converted=convertFigmaObjects(parsed.objects,root,resolved);
const ball=converted.find(o=>o.object.identity.kind==='ballSpawn')!;
const hole=converted.find(o=>o.object.identity.kind==='hole')!;
near(ball.transform.position.x,210);near(ball.transform.position.y,210);
near(hole.transform.position.x,418);near(hole.transform.position.y,418);
const box=converted.find(o=>o.object.identity.kind==='metalBox')!;
near(box.transform.position.x,525);near(box.transform.position.y,530);
const geometry=convertFigmaGeometry(converted,2500,2000,resolved);
assert.equal(geometry.course?.vertices.length,4);
assert.equal(geometry.course?.openings.length,1,JSON.stringify(geometry.diagnostics));
near(geometry.course!.openings[0].start,500);

// Optional real fixture: pass the JSON and SVG paths as command-line arguments.
if(process.argv[2]&&process.argv[3]) {
    const fixture=JSON.parse(readFileSync(process.argv[2],'utf8'));
    const real=parseFigmaNodes(fixture);
    const shapes=extractFigmaSvgGeometry(parseFigmaSvg(readFileSync(process.argv[3],'utf8')));
    const result=matchFigmaSvgNodes(real.objects,shapes);
    assert.equal(result.unmatched.length,0,JSON.stringify(result.diagnostics));
    const placements=convertFigmaObjects(real.objects,fixture,resolveFigmaMatchedGeometry(result));
    for(const entry of placements) assert.ok(Number.isFinite(entry.transform.position.x)&&Number.isFinite(entry.transform.position.y));
    console.log(`Real fixture: ${result.matches.length}/${real.objects.length} recognized objects matched`);
}
console.log('FI-5C.1C coordinate and naming regression tests passed');

// Regression: one 230px vertical opening spanning a vertex on a straight wall
// must create TWO intervals rather than truncate to one edge.
const splitRoot: FigmaNode = { name: 'Split', type: 'FRAME', x: 0, y: 0, width: 500, height: 500, children: [
    { name: 'COURSE_BOUNDARY', type: 'VECTOR', x: 100, y: 100, width: 300, height: 300 },
    { name: 'opening_1', type: 'RECTANGLE', x: 386, y: 170, width: 28, height: 230 },
] };
const splitSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><path d="M100 100H400V270V400H100Z"/><rect x="386" y="170" width="28" height="230"/></svg>`;
const splitParsed = parseFigmaNodes(splitRoot);
const splitMatched = matchFigmaSvgNodes(splitParsed.objects, extractFigmaSvgGeometry(parseFigmaSvg(splitSvg)));
assert.equal(splitMatched.unmatched.length, 0, JSON.stringify(splitMatched.diagnostics));
const splitConverted = convertFigmaObjects(splitParsed.objects, splitRoot, resolveFigmaMatchedGeometry(splitMatched));
const splitGeometry = convertFigmaGeometry(splitConverted, 500, 500, resolveFigmaMatchedGeometry(splitMatched));
assert.equal(splitGeometry.course?.openings.length, 2, JSON.stringify(splitGeometry.diagnostics));
near(splitGeometry.course!.openings.reduce((total, o) => total + o.end - o.start, 0), 230);
