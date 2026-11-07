import { Container, Graphics } from "pixi.js";
import type { Robot } from "./Robot";
import { ROBOT_VISION_CONE_DEFINITION } from "../../config/RobotVisionConeDefinition";

/** Flat, translucent sector in world space, always behind gameplay actors. */
export class RobotVisionConeRenderer {
    private readonly graphics = new Graphics();
    private currentRange = -1;
    private currentHalfAngle = -1;
    private detectionBlend = 0;

    public constructor(private readonly robot: Robot) {
        this.graphics.label = `RobotVisionCone:${robot.getVisionConeState().element}`;
        this.graphics.eventMode = "none";
    }

    public getContainer(): Graphics { return this.graphics; }

    /** Clip the whole vision presentation layer once, not each moving cone. */
    public static applyCourseMask(layer: Container, mask: Graphics): void {
        layer.mask = mask;
    }


    public update(deltaTime: number): void {
        const state = this.robot.getVisionConeState();
        this.graphics.visible = state.visible;
        if (!state.visible) return;

        const halfAngle = Math.max(0, Math.min(Math.PI, state.halfAngleDegrees * Math.PI / 180));
        if (state.range !== this.currentRange || halfAngle !== this.currentHalfAngle) {
            this.currentRange = state.range;
            this.currentHalfAngle = halfAngle;
            this.graphics.clear();
            if (state.range > 0 && halfAngle > 0) {
                this.graphics.moveTo(0, 0);
                this.graphics.arc(0, 0, state.range, -halfAngle, halfAngle);
                this.graphics.closePath();
                this.graphics.fill(0xffffff);
            }
        }

        const target = state.detecting ? 1 : 0;
        const duration = ROBOT_VISION_CONE_DEFINITION.transitionSeconds;
        const fraction = duration > 0 ? Math.min(1, Math.max(0, deltaTime) / duration) : 1;
        this.detectionBlend += (target - this.detectionBlend) * fraction;
        const palette = ROBOT_VISION_CONE_DEFINITION.palettes[state.element];
        this.graphics.tint = blendRgb(palette.idleColor, palette.detectingColor, this.detectionBlend);
        this.graphics.alpha = palette.idleAlpha + (palette.detectingAlpha - palette.idleAlpha) * this.detectionBlend;
        this.graphics.position.set(state.x, state.y);
        this.graphics.rotation = state.headingRadians;
    }

    public destroy(): void {
        this.graphics.removeFromParent();
        this.graphics.destroy();
    }
}

function blendRgb(a: number, b: number, t: number): number {
    const channel = (shift: number): number => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
    return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
