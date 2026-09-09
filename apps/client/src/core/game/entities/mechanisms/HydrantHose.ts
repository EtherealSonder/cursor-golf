import type { Ball } from "../Ball";
import { Entity } from "../Entity";
import type { HydrantHoseDefinition } from "../../config/HydrantHoseDefinition";
import { DEFAULT_HYDRANT_HOSE_DEFINITION } from "../../config/HydrantHoseDefinition";
import { HoseRope } from "../../physics/rope/HoseRope";
import { HoseBallCollision } from "../../physics/rope/HoseBallCollision";
import { HoseGraphicsRenderer } from "./HoseGraphicsRenderer";

export class HydrantHose extends Entity {
    private readonly rope: HoseRope;
    private readonly collision: HoseBallCollision;
    private readonly renderer: HoseGraphicsRenderer;

    constructor(
        anchorX: number,
        anchorY: number,
        private readonly ball: Ball,
        private readonly definition: HydrantHoseDefinition = DEFAULT_HYDRANT_HOSE_DEFINITION,
    ) {
        super();
        this.rope = new HoseRope(anchorX, anchorY, definition);
        this.collision = new HoseBallCollision(this.rope, definition);
        this.renderer = new HoseGraphicsRenderer(definition);
    }

    protected onInitialize(): void {
        this.container.addChild(this.renderer.getGraphics());
        this.renderer.redraw(this.rope);
    }

    protected onUpdate(deltaTime: number): void {
        this.rope.update(deltaTime);
        this.collision.resolve(this.ball);
        this.renderer.redraw(this.rope);
    }

    protected onDestroy(): void {
        this.renderer.destroy();
        this.container.destroy({ children: false });
    }

    public reset(randomValue?: number): void {
        this.rope.reset(randomValue);
        this.renderer.redraw(this.rope);
    }

    public getRope(): HoseRope { return this.rope; }
    public getRopePoints() { return this.rope.getPoints(); }
    public getAnchorPosition() { const p = this.rope.getPoints()[0]!; return { x: p.x, y: p.y }; }
    public getNozzlePosition() { const p = this.rope.getNozzlePoint(); return { x: p.x, y: p.y }; }
    public getNozzleDirectionRadians(): number { return this.rope.getNozzleDirectionRadians(); }
    public getDefinition(): HydrantHoseDefinition { return this.definition; }
}
