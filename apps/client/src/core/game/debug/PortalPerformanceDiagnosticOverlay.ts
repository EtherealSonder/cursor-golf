import { Container, Graphics, Text } from "pixi.js";
import type { PortalPerformanceDiagnosticController } from "./PortalPerformanceDiagnosticController";
/** Screen-space, fixed-width HUD; the final 30s snapshot remains visible. */
export class PortalPerformanceDiagnosticOverlay {
    public readonly container = new Container();
    private readonly background = new Graphics();
    private readonly text = new Text({text:"PORTAL P2-C5 INITIALIZING", style:{fontFamily:"monospace",fontSize:12,fill:0xffffff,wordWrap:true,wordWrapWidth:610}});
    public constructor() {
        this.container.position.set(12,12);
        this.background.roundRect(0,0,640,280,8).fill({color:0x101722,alpha:0.91});
        this.text.position.set(12,10);
        this.container.addChild(this.background,this.text);
    }
    public update(controller: PortalPerformanceDiagnosticController): void { this.text.text = controller.snapshot(); }
    public destroy(): void { this.container.removeFromParent(); this.container.destroy({children:true}); }
}
