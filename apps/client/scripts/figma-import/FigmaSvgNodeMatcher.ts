import type { FigmaParsedObject, FigmaParseDiagnostic, FigmaVector2 } from './FigmaNodeDefinition';
import type { SvgGeometry } from './FigmaSvgGeometryExtractor';
import { svgLocalBounds } from './FigmaCoordinateSpace';

export interface FigmaSvgMatch {
    readonly object: FigmaParsedObject;
    readonly geometry: SvgGeometry;
    readonly score: number;
}
export interface FigmaSvgMatchResult {
    readonly matches: readonly FigmaSvgMatch[];
    readonly unmatched: readonly FigmaParsedObject[];
    readonly diagnostics: readonly FigmaParseDiagnostic[];
}
const distance=(a:FigmaVector2,b:FigmaVector2)=>Math.hypot(a.x-b.x,a.y-b.y);
function score(o:FigmaParsedObject,g:SvgGeometry):number {
    const b=o.bounds;
    const jsonOrigin={x:b.x,y:b.y};
    const local=svgLocalBounds(g);
    // SVG rect x/y (or circle cx/cy) is geometry-local; the matrix alone is
    // often identity. Compare actual transformed vertices and bounding boxes.
    const anchorDistance=Math.min(distance(jsonOrigin,g.bounds),
        ...(g.vertices.length ? g.vertices.map(v=>distance(jsonOrigin,v)) : [Infinity]));
    const sameDimensions=Math.min(
        Math.abs(b.width-local.width)+Math.abs(b.height-local.height),
        Math.abs(b.width-local.height)+Math.abs(b.height-local.width));
    const kind=o.identity.kind;
    const tag=g.kind;
    if(kind==='courseBoundary'&&tag!=='path'&&tag!=='polygon')return Infinity;
    if(kind==='hole'&&tag!=='circle'&&tag!=='ellipse')return Infinity;
    if(kind==='wallOpening'&&tag!=='rect')return Infinity;
    if(kind==='metalBox'&&tag!=='rect')return Infinity;
    if(['rotatingPaddle','directionalBumper','radialBumper','ballSpawn'].includes(kind)&&tag!=='rect'&&tag!=='circle')return Infinity;
    // A matching Figma SVG rectangle may have no x/y and place its top-left via transform.
    return anchorDistance+sameDimensions*0.25;
}
/** Conservative one-to-one assignment. Ties are reported, never broken by DOM order. */
export function matchFigmaSvgNodes(objects:readonly FigmaParsedObject[],geometries:readonly SvgGeometry[],options:{maxScore?:number; ambiguityMargin?:number}={}):FigmaSvgMatchResult {
    const maxScore=options.maxScore??8;
    const margin=options.ambiguityMargin??0.25;
    const diagnostics:FigmaParseDiagnostic[]=[];
    const matches:FigmaSvgMatch[]=[];
    const used=new Set<SvgGeometry>();
    const unmatched:FigmaParsedObject[]=[];
    // Prefer objects with the fewest plausible candidates, to reduce collisions.
    const candidates=objects.map(object=>({object, options:geometries.map(geometry=>({geometry,score:score(object,geometry)}))
        .filter(item=>Number.isFinite(item.score)&&item.score<=maxScore).sort((a,b)=>a.score-b.score)}));
    candidates.sort((a,b)=>a.options.length-b.options.length||a.options[0]?.score-b.options[0]?.score);
    for(const item of candidates){
        const available=item.options.filter(v=>!used.has(v.geometry));
        if(!available.length){
            unmatched.push(item.object);
            diagnostics.push({severity:'error',code:'SVG_MATCH_MISSING',path:item.object.nodePath,message:`No unique SVG geometry found for ${item.object.name}`});
            continue;
        }
        if(available.length>1&&available[1].score-available[0].score<=margin){
            unmatched.push(item.object);
            diagnostics.push({severity:'error',code:'SVG_MATCH_AMBIGUOUS',path:item.object.nodePath,message:`Multiple SVG elements match ${item.object.name} equally well`});
            continue;
        }
        used.add(available[0].geometry);
        matches.push({object:item.object,geometry:available[0].geometry,score:available[0].score});
    }
    // Check whether a selected geometry was also the only valid candidate of a failed object.
    return {matches,unmatched,diagnostics};
}
