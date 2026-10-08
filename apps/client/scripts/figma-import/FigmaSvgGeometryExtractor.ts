import type { FigmaAffineTransform, FigmaBounds, FigmaVector2 } from './FigmaNodeDefinition';
import type { SvgDocument, SvgElement } from './FigmaSvgParser';
import { boundsOfCoordinates } from './FigmaCoordinateSpace';

export interface SvgGeometry {
    readonly element: SvgElement;
    readonly kind: 'path' | 'rect' | 'circle' | 'ellipse' | 'polygon' | 'polyline';
    readonly matrix: FigmaAffineTransform;
    readonly determinant: number;
    readonly mirrored: boolean;
    readonly bounds: FigmaBounds;
    readonly vertices: readonly FigmaVector2[];
    readonly pathData?: string;
    readonly fill?: string;
    readonly curved: boolean;
}
const I: FigmaAffineTransform = [[1, 0, 0], [0, 1, 0]];
const numeric = '[+-]?(?:\\d*\\.\\d+|\\d+\\.?\\d*)(?:[eE][+-]?\\d+)?';
const numberRe = new RegExp(numeric, 'g');
function nums(s: string): number[] { return [...s.matchAll(numberRe)].map(m => Number(m[0])); }
function mul(a: FigmaAffineTransform, b: FigmaAffineTransform): FigmaAffineTransform {
    return [
        [a[0][0]*b[0][0]+a[0][1]*b[1][0], a[0][0]*b[0][1]+a[0][1]*b[1][1], a[0][0]*b[0][2]+a[0][1]*b[1][2]+a[0][2]],
        [a[1][0]*b[0][0]+a[1][1]*b[1][0], a[1][0]*b[0][1]+a[1][1]*b[1][1], a[1][0]*b[0][2]+a[1][1]*b[1][2]+a[1][2]],
    ];
}
function move(x: number, y: number): FigmaAffineTransform { return [[1,0,x],[0,1,y]]; }
export function parseSvgTransform(source?: string): FigmaAffineTransform {
    if (!source?.trim()) return I;
    let result = I;
    const regex = /([A-Za-z]+)\s*\(([^)]*)\)/g;
    let consumed = 0; let match: RegExpExecArray | null;
    while ((match = regex.exec(source))) {
        if (source.slice(consumed, match.index).trim().replace(/,/g, '')) throw new Error('Invalid SVG transform syntax');
        consumed = regex.lastIndex;
        const values = nums(match[2]);
        const remainder = match[2].replace(numberRe, '').replace(/[\s,]/g, '');
        if (remainder) throw new Error(`Invalid ${match[1]} transform arguments`);
        const [a,b,c,d,e,f] = values;
        let part: FigmaAffineTransform;
        switch (match[1]) {
            case 'matrix': if (values.length !== 6) throw new Error('matrix expects 6 numbers'); part = [[a,c,e],[b,d,f]]; break;
            case 'translate': if (values.length < 1 || values.length > 2) throw new Error('translate expects 1 or 2 numbers'); part = move(a,b ?? 0); break;
            case 'scale': if (values.length < 1 || values.length > 2) throw new Error('scale expects 1 or 2 numbers'); part = [[a,0,0],[0,b ?? a,0]]; break;
            case 'rotate': {
                if (values.length !== 1 && values.length !== 3) throw new Error('rotate expects 1 or 3 numbers');
                const angle = a * Math.PI / 180;
                const rotation: FigmaAffineTransform = [[Math.cos(angle),-Math.sin(angle),0],[Math.sin(angle),Math.cos(angle),0]];
                part = values.length === 3 ? mul(mul(move(b,c),rotation),move(-b,-c)) : rotation;
                break;
            }
            case 'skewX': case 'skewY': {
                if (values.length !== 1) throw new Error('skew expects 1 number');
                const t = Math.tan(a*Math.PI/180);
                part = match[1] === 'skewX' ? [[1,t,0],[0,1,0]] : [[1,0,0],[t,1,0]];
                break;
            }
            default: throw new Error(`Unsupported SVG transform ${match[1]}`);
        }
        result = mul(result, part);
    }
    if (source.slice(consumed).trim()) throw new Error('Unparsed SVG transform syntax');
    return result;
}
export function transformPoint(m: FigmaAffineTransform, p: FigmaVector2): FigmaVector2 {
    return {x:m[0][0]*p.x+m[0][1]*p.y+m[0][2],y:m[1][0]*p.x+m[1][1]*p.y+m[1][2]};
}
function rectangle(x:number,y:number,w:number,h:number): FigmaVector2[] {
    return [{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
}
function attr(e:SvgElement,key:string,fallback=0):number {
    const raw=e.attributes[key]; if(raw===undefined) return fallback;
    const value=Number(raw); if(!Number.isFinite(value)) throw new Error(`Invalid ${key} on SVG element ${e.order}`);
    return value;
}
function pathVertices(path:string): {vertices:FigmaVector2[];curved:boolean} {
    // Full command tokenization; curves are not approximated in FI-5A.
    const tokens=path.match(/[MmLlHhVvZzCcSsQqTtAa]|[+-]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][+-]?\d+)?/g)??[];
    if(path.replace(/[MmLlHhVvZzCcSsQqTtAa]|[+-]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][+-]?\d+)?|[\s,]/g,'').length) throw new Error('Unsupported SVG path syntax');
    const vertices:FigmaVector2[]=[]; let current={x:0,y:0}; let start={x:0,y:0}; let cmd=''; let i=0; let curved=false;
    const isCmd=(v:string)=>/^[A-Za-z]$/.test(v);
    const arity:Record<string,number>={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7};
    while(i<tokens.length) {
        if(isCmd(tokens[i])) cmd=tokens[i++];
        if(!cmd) throw new Error('SVG path is missing a command');
        const upper=cmd.toUpperCase(); const relative=cmd!==upper;
        if(upper==='Z') { current={...start}; cmd=''; continue; }
        const n=arity[upper]; if(!n||i+n>tokens.length||tokens.slice(i,i+n).some(isCmd)) throw new Error(`Malformed SVG path command ${cmd}`);
        const v=tokens.slice(i,i+n).map(Number); i+=n;
        const point=(x:number,y:number):FigmaVector2=>({x:relative?current.x+x:x,y:relative?current.y+y:y});
        if(upper==='M'||upper==='L') current=point(v[0],v[1]);
        else if(upper==='H') current={x:relative?current.x+v[0]:v[0],y:current.y};
        else if(upper==='V') current={x:current.x,y:relative?current.y+v[0]:v[0]};
        else { curved=true; const endpoint=upper==='A'?5:n-2; current=point(v[endpoint],v[endpoint+1]); }
        if(upper==='M') {start={...current};cmd=relative?'l':'L';}
        vertices.push({...current});
    }
    return {vertices,curved};
}
function localVertices(e:SvgElement):{vertices:FigmaVector2[];curved:boolean}|null {
    switch(e.tag){
        case 'rect':return {vertices:rectangle(attr(e,'x'),attr(e,'y'),attr(e,'width'),attr(e,'height')),curved:false};
        case 'circle': {const x=attr(e,'cx'),y=attr(e,'cy'),r=attr(e,'r');return {vertices:rectangle(x-r,y-r,2*r,2*r),curved:true};}
        case 'ellipse': {const x=attr(e,'cx'),y=attr(e,'cy'),rx=attr(e,'rx'),ry=attr(e,'ry');return {vertices:rectangle(x-rx,y-ry,2*rx,2*ry),curved:true};}
        case 'polygon':case 'polyline': {const v=nums(e.attributes.points??'');if(v.length<4||v.length%2) throw new Error('Invalid polygon points');return {vertices:Array.from({length:v.length/2},(_,i)=>({x:v[i*2],y:v[i*2+1]})),curved:false};}
        case 'path':return pathVertices(e.attributes.d??'');
        default:return null;
    }
}
function bbox(points:readonly FigmaVector2[]):FigmaBounds {
    if(!points.length) throw new Error('SVG geometry has no vertices');
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
    const x=Math.min(...xs),y=Math.min(...ys);
    return {x,y,width:Math.max(...xs)-x,height:Math.max(...ys)-y};
}
export function extractFigmaSvgGeometry(document:SvgDocument): readonly SvgGeometry[] {
    const output:SvgGeometry[]=[];
    function walk(e:SvgElement,parent:FigmaAffineTransform):void {
        if(e.inDefinitions||e.attributes.display==='none'||e.attributes.visibility==='hidden')return;
        const matrix=mul(parent,parseSvgTransform(e.attributes.transform));
        const geometry=localVertices(e);
        if(geometry){
            const vertices=geometry.vertices.map(p=>transformPoint(matrix,p));
            const determinant=matrix[0][0]*matrix[1][1]-matrix[0][1]*matrix[1][0];
            output.push({element:e,kind:e.tag as SvgGeometry['kind'],matrix,determinant,mirrored:determinant<0,bounds:boundsOfCoordinates(vertices),vertices,
                ...(e.tag==='path'?{pathData:e.attributes.d??''}:{}),...(e.attributes.fill?{fill:e.attributes.fill}:{}),curved:geometry.curved});
        }
        for(const child of e.children)walk(child,matrix);
    }
    walk(document.root,I);
    return output;
}
