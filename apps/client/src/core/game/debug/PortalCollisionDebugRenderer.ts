import { Container, Graphics } from "pixi.js";
import type { Portal } from "../portal/Portal";
import type { Ball } from "../entities/Ball";
import { createPortalCollisionGeometry } from "../portal/PortalCollisionGeometry";
import { PORTAL_COLLIDER } from "../config/PortalPhysicsDefinition";
import { PORTAL_INTERACTION } from "../portal/PortalInteractionDefinition";

/** Presentation-only debug drawing. Uses the exact capsule/box geometry returned to physics. */
export class PortalCollisionDebugRenderer {
    public static active: PortalCollisionDebugRenderer | null = null;
    public readonly container = new Container();
    private readonly graphics = new Graphics();
    private readonly geometry = createPortalCollisionGeometry();
    private lastContact: { x: number; y: number; nx: number; ny: number; part: string; until: number } | null = null;
    public constructor() {
        this.container.label = "P3:PortalCollisionDebug";
        this.container.eventMode = "none";
        this.container.label = "P3:PortalColliderOverlay:WorldSpace";
        this.container.addChild(this.graphics);
        PortalCollisionDebugRenderer.active = this;
    }
    public recordContact(x: number, y: number, nx: number, ny: number, part: string): void {
        this.lastContact = { x, y, nx, ny, part, until: performance.now() + 1800 };
        console.debug(`[P3 collider] ${part} contact at (${x.toFixed(1)}, ${y.toFixed(1)}), normal (${nx.toFixed(2)}, ${ny.toFixed(2)})`);
    }
    public update(portals: readonly Portal[], ball: Ball | null): void {
        const g = this.graphics;
        g.clear();
        for (const portal of portals) {
            const { x, y, rotation } = portal.getInteractionTransform();
            const c = Math.cos(rotation), s = Math.sin(rotation);
            const point = (lx: number, ly: number) => ({ x: x + lx*c - ly*s, y: y + lx*s + ly*c });
            for (const segment of this.geometry.housing) {
                const a = point(segment.x1, segment.y1), b = point(segment.x2, segment.y2);
                g.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({width:segment.radius*2,color:0xff3333,alpha:0.32,cap:"round"});
                g.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({width:1.4,color:0xff4444,alpha:0.95});
                g.circle(a.x,a.y,segment.radius).stroke({width:0.6,color:0xff3333,alpha:0.5});
            }
            for (const handle of this.geometry.handles) {
                const corners = [[-1,-1],[1,-1],[1,1],[-1,1]].map(([sx,sy]) => point(handle.x + sx*handle.width/2,handle.y + sy*handle.height/2));
                g.moveTo(corners[0].x,corners[0].y);
                for (let i=1;i<corners.length;i++) g.lineTo(corners[i].x,corners[i].y);
                g.closePath().fill({color:0xffa500,alpha:0.16}).stroke({color:0xffa500,width:2});
            }
            // Draw ellipse in world coordinates so it rotates with the authoritative portal.
            for (const [rx,ry,color] of [
                [PORTAL_INTERACTION.outerRadiusX,PORTAL_INTERACTION.outerRadiusY,0x39a8ff],
                [PORTAL_INTERACTION.centralRadiusX,PORTAL_INTERACTION.centralRadiusY,0x35ff87],
            ] as const) {
                const steps=72;
                for(let i=0;i<=steps;i++) {
                    const t=i*2*Math.PI/steps, pt=point(rx*Math.cos(t),ry*Math.sin(t));
                    if(i===0)g.moveTo(pt.x,pt.y);else g.lineTo(pt.x,pt.y);
                }
                g.stroke({color,width:2,alpha:0.95});
            }
            // Show the exact capsule-surface gap on both sides of the vortex.
            // Dashed green horizontal spans mark the traversable top/bottom
            // corridors. These are guides, not collision primitives.
            const halfGap=PORTAL_COLLIDER.entranceHalfWidth;
            for (const sign of [-1,1]) {
                const yLocal=sign*(PORTAL_COLLIDER.arcRadiusY+PORTAL_COLLIDER.arcThickness/2);
                const left=point(-halfGap,yLocal),right=point(halfGap,yLocal);
                g.moveTo(left.x,left.y).lineTo(right.x,right.y)
                    .stroke({color:0x00ff77,width:3,alpha:0.95});
                for (const edge of [-halfGap,halfGap]) {
                    const a=point(edge,yLocal-5),b=point(edge,yLocal+5);
                    g.moveTo(a.x,a.y).lineTo(b.x,b.y)
                        .stroke({color:0x00ff77,width:2,alpha:0.95});
                }
            }
            // High-contrast, oversized pivot marker. If this is visible but the
            // geometry is displaced, the portal geometry transform is incorrect.
            // All points here are world coordinates within the world-space Debug layer.
            g.circle(x, y, 13).fill({color:0xff00ff,alpha:0.3})
                .stroke({color:0xffffff,width:3,alpha:1});
            g.moveTo(x-20,y).lineTo(x+20,y)
                .moveTo(x,y-20).lineTo(x,y+20)
                .stroke({color:0xff00ff,width:3,alpha:1});
            g.circle(x,y,3).fill({color:0xffffff,alpha:1});
        }
        if(ball){
            g.circle(ball.getX(),ball.getY(),ball.getRadius()).stroke({color:0xffffff,width:2,alpha:1});
        }
        if(this.lastContact && performance.now()<this.lastContact.until){
            const m=this.lastContact;
            g.circle(m.x,m.y,5).fill({color:0xffff00,alpha:0.9});
            g.moveTo(m.x,m.y).lineTo(m.x+m.nx*24,m.y+m.ny*24).stroke({color:0xffff00,width:2});
        }
    }
    public destroy(): void {
        if(PortalCollisionDebugRenderer.active===this) PortalCollisionDebugRenderer.active=null;
        this.container.removeFromParent();
        this.container.destroy({children:true});
    }
}
