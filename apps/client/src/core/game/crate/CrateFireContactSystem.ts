import { FireSourceType } from "../config/FireSourceDefinition";
import type { FireManager } from "../environment/FireManager";
import type { FireSourceSystem } from "../environment/FireSourceSystem";
import type { Crate } from "./Crate";
import { CRATE_FIRE } from "./CrateFireDefinition";
/** Tests active ground cells and point/directional fire against a moving rotated crate. */
export class CrateFireContactSystem {
    constructor(private readonly fire: FireManager, private readonly sources: FireSourceSystem) {}
    public touches(crate: Crate): boolean {
        if (crate.isDestroyed) return false;
        const def = crate.getDefinition();
        const halfW = def.width * 0.5, halfH = def.height * 0.5;
        const overlaps = (x: number,y: number,r: number): boolean => {
            const a = -crate.getRotationRadians(), dx=x-crate.x,dy=y-crate.y;
            const localX=dx*Math.cos(a)-dy*Math.sin(a), localY=dx*Math.sin(a)+dy*Math.cos(a);
            const nearX=Math.max(-halfW,Math.min(halfW,localX));
            const nearY=Math.max(-halfH,Math.min(halfH,localY));
            return Math.hypot(localX-nearX,localY-nearY)<=r+CRATE_FIRE.contactPadding;
        };
        for (const cell of this.fire.getActiveCells()) {
            if (overlaps(cell.getWorldCenterX(),cell.getWorldCenterY(),0)) return true;
        }
        for (const source of this.sources.getSources()) {
            if (!source.isEnabled()) continue;
            const d=source.getDefinition(),x=source.getPositionX(),y=source.getPositionY();
            if (d.type === FireSourceType.Directional) {
                const length=this.sources.getDirectionalEffectiveLength(source.getId(),d.length);
                if (length<=0) continue;
                const steps=Math.max(2,Math.ceil(length/CRATE_FIRE.directionalContactStep));
                const a=source.getDirectionRadians();
                for(let i=0;i<=steps;i++) {
                    const t=length*i/steps;
                    if(overlaps(x+Math.cos(a)*t,y+Math.sin(a)*t,d.halfWidth)) return true;
                }
            } else if(overlaps(x,y,d.radius)) return true;
        }
        return false;
    }
}
