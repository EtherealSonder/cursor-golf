import { FIGMA_GAMEPLAY_CATALOG } from './FigmaGameplayObjectCatalog';
import type { FigmaObjectIdentity, FigmaGameplayObjectKind } from './FigmaNodeDefinition';
/** Explicit aliases preserve existing Figma layer names even when textures use other names. */
const exact:Readonly<Record<string,FigmaObjectIdentity>>={
    course_boundary:{kind:'courseBoundary',id:'course-boundary'},
    golf_ball:{kind:'ballSpawn',id:'ball-spawn'},hole:{kind:'hole',id:'hole'},
    radial_bumper:{kind:'radialBumper',id:'radial-bumper'},
    directional_bumper:{kind:'directionalBumper',id:'directional-bumper'},
    rotate_paddle_clockwise:{kind:'rotatingPaddle',id:'rotate-paddle-clockwise',direction:'clockwise'},
    rotate_paddle_anticlockwise:{kind:'rotatingPaddle',id:'rotate-paddle-anticlockwise',direction:'anticlockwise'},
};
export interface FigmaNamingPrefix {readonly prefix:string;readonly kind:FigmaGameplayObjectKind;readonly direction?:'clockwise'|'anticlockwise'}
const prefixes=new Map<string,FigmaNamingPrefix>();
const defaults:FigmaNamingPrefix[]=[
    {prefix:'opening',kind:'wallOpening'}, {prefix:'box',kind:'metalBox'},
    {prefix:'radial_bumper',kind:'radialBumper'}, {prefix:'directional_bumper',kind:'directionalBumper'},
    {prefix:'rotate_paddle_clockwise',kind:'rotatingPaddle',direction:'clockwise'},
    {prefix:'rotate_paddle_anticlockwise',kind:'rotatingPaddle',direction:'anticlockwise'},
];
for(const item of [...defaults, ...FIGMA_GAMEPLAY_CATALOG]) prefixes.set(item.prefix,item);
/** Register an asset basename (without .png) to a gameplay kind; no automatic physics inference. */
export function registerFigmaAssetPrefix(prefix:string,kind:FigmaGameplayObjectKind,direction?:'clockwise'|'anticlockwise'):void {
    const key=prefix.trim().toLowerCase().replace(/\.png$/i,'');
    if(!/^[a-z][a-z0-9_]*$/.test(key)||prefixes.has(key)||Object.hasOwn(exact,key))throw new Error(`Invalid or already registered Figma asset prefix: ${prefix}`);
    prefixes.set(key,{prefix:key,kind,...(direction?{direction}:{})});
}
export function resolveFigmaName(name:string):FigmaObjectIdentity|null {
    const key=name.trim().toLowerCase();
    if(Object.hasOwn(exact,key))return exact[key];
    const match=/^([a-z][a-z0-9_]*)_(\d+)$/.exec(key);
    if(!match)return null;
    const index=Number(match[2]),entry=prefixes.get(match[1]);
    if(!entry||!Number.isSafeInteger(index)||index<1)return null;
    return {kind:entry.kind,id:`${entry.prefix.replace(/_/g,'-')}-${index}`,index,...(entry.direction?{direction:entry.direction}:{})};
}
export function registeredFigmaPrefixes():readonly string[]{return [...prefixes.keys()];}
