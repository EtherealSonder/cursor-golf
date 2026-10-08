import type { FigmaAffineTransform, FigmaBounds, FigmaVector2 } from './FigmaNodeDefinition';
import type { SvgGeometry } from './FigmaSvgGeometryExtractor';

export const IDENTITY_MATRIX: FigmaAffineTransform = [[1,0,0],[0,1,0]];
export function transformCoordinate(matrix:FigmaAffineTransform, point:FigmaVector2):FigmaVector2 {
    return {x:matrix[0][0]*point.x+matrix[0][1]*point.y+matrix[0][2],y:matrix[1][0]*point.x+matrix[1][1]*point.y+matrix[1][2]};
}
export function multiplyCoordinates(a:FigmaAffineTransform,b:FigmaAffineTransform):FigmaAffineTransform {
    return [[a[0][0]*b[0][0]+a[0][1]*b[1][0],a[0][0]*b[0][1]+a[0][1]*b[1][1],a[0][0]*b[0][2]+a[0][1]*b[1][2]+a[0][2]],
        [a[1][0]*b[0][0]+a[1][1]*b[1][0],a[1][0]*b[0][1]+a[1][1]*b[1][1],a[1][0]*b[0][2]+a[1][1]*b[1][2]+a[1][2]]];
}
export function invertCoordinates(m:FigmaAffineTransform):FigmaAffineTransform {
    const det=m[0][0]*m[1][1]-m[0][1]*m[1][0];
    if(Math.abs(det)<1e-10) throw new Error('Singular coordinate transform');
    return [[m[1][1]/det,-m[0][1]/det,(m[0][1]*m[1][2]-m[1][1]*m[0][2])/det],
        [-m[1][0]/det,m[0][0]/det,(m[1][0]*m[0][2]-m[0][0]*m[1][2])/det]];
}
export function boundsOfCoordinates(vertices:readonly FigmaVector2[]):FigmaBounds {
    if(!vertices.length) throw new Error('Empty geometry');
    const xs=vertices.map(v=>v.x),ys=vertices.map(v=>v.y),x=Math.min(...xs),y=Math.min(...ys);
    return {x,y,width:Math.max(...xs)-x,height:Math.max(...ys)-y};
}
/** SVG element x/y and cx/cy are local coordinates; its transform alone is NOT its placement. */
export function svgLocalBounds(shape:SvgGeometry):FigmaBounds {
    return boundsOfCoordinates(shape.vertices.map(v=>transformCoordinate(invertCoordinates(shape.matrix),v)));
}
/** Anchor in SVG element-local space, transformed once to SVG root/viewBox coordinates. */
export function svgAnchor(shape:SvgGeometry,normalized:FigmaVector2):FigmaVector2 {
    const b=svgLocalBounds(shape);
    return transformCoordinate(shape.matrix,{x:b.x+b.width*normalized.x,y:b.y+b.height*normalized.y});
}
/** Figma x/y from the supported exporter are frame-local, not document-global. */
export function frameLocalBounds(bounds:FigmaBounds):FigmaBounds {return {...bounds};}
