import { Container, Graphics } from "pixi.js";
import type { GeneratedCourseGeometry } from "../../level/LevelRuntimeDefinition";

/** One world-space mask shared by every elemental robot vision cone. */
export class RobotVisionConeCourseMask {
    private readonly graphics = new Graphics();

    public constructor(geometry: GeneratedCourseGeometry, worldRoot: Container) {
        this.graphics.label = "RobotVisionCone:PlayableCourseMask";
        this.graphics.eventMode = "none";
        const vertices = geometry.vertices;
        if (vertices.length < 3) {
            throw new Error("Robot vision cone course mask requires at least three boundary vertices.");
        }
        this.graphics.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            this.graphics.lineTo(vertices[i].x, vertices[i].y);
        }
        this.graphics.closePath();
        this.graphics.fill(0xffffff);
        // Keep the mask in world coordinates, as a sibling of the vision layer.
        // PixiJS treats Graphics used as a mask as mask geometry, not visible paint.
        worldRoot.addChild(this.graphics);
    }

    public getGraphics(): Graphics { return this.graphics; }

    public destroy(): void {
        this.graphics.removeFromParent();
        this.graphics.destroy();
    }
}
