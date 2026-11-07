import { Container, Graphics } from "pixi.js";
import type { Robot } from "./Robot";
import type { RobotVisionOccluderSnapshot } from "./RobotVisionOcclusionGeometry";
import { buildVisibleConePerimeter } from "./RobotVisionOcclusionGeometry";
import { ROBOT_VISION_OCCLUSION_DEFINITION as OCCLUSION } from "../../config/RobotVisionOcclusionDefinition";
import { ROBOT_VISION_CONE_DEFINITION } from "../../config/RobotVisionConeDefinition";

/** Flat, translucent sector in world space, always behind gameplay actors. */
export class RobotVisionConeRenderer {
    private readonly graphics = new Graphics();
    private currentRange = -1;
    private currentHalfAngle = -1;
    private detectionBlend = 0;
    private redrawElapsed = Number.POSITIVE_INFINITY;
    private previousX = Number.NaN;
    private previousY = Number.NaN;
    private previousHeading = Number.NaN;
    private previousOccluderSignature = "";

    public constructor(private readonly robot: Robot) {
        this.graphics.label = `RobotVisionCone:${robot.getVisionConeState().element}`;
        this.graphics.eventMode = "none";
    }

    public getContainer(): Graphics { return this.graphics; }

    /** Clip the whole vision presentation layer once, not each moving cone. */
    public static applyCourseMask(layer: Container, mask: Graphics): void {
        layer.mask = mask;
    }


    public update(deltaTime: number, occluders: readonly RobotVisionOccluderSnapshot[] = []): void {
        const state = this.robot.getVisionConeState();
        this.graphics.visible = state.visible;
        if (!state.visible) return;

        const halfAngle = Math.max(0, Math.min(Math.PI, state.halfAngleDegrees * Math.PI / 180));
        this.redrawElapsed += Math.max(0, deltaTime);
        const signature = occluders.map(o => `${o.id}:${o.x.toFixed(1)}:${o.y.toFixed(1)}:${JSON.stringify(o.shape)}`).join("|");
        const changed = state.range !== this.currentRange || halfAngle !== this.currentHalfAngle ||
            Math.hypot(state.x - this.previousX, state.y - this.previousY) > OCCLUSION.movementThreshold ||
            Math.abs(Math.atan2(Math.sin(state.headingRadians - this.previousHeading), Math.cos(state.headingRadians - this.previousHeading))) > OCCLUSION.rotationThresholdRadians ||
            signature !== this.previousOccluderSignature;
        if (changed && this.redrawElapsed >= 1 / OCCLUSION.maximumUpdatesPerSecond) {
            this.redrawElapsed = 0;
            this.currentRange = state.range;
            this.currentHalfAngle = halfAngle;
            this.previousX = state.x; this.previousY = state.y;
            this.previousHeading = state.headingRadians;
            this.previousOccluderSignature = signature;
            const perimeter = buildVisibleConePerimeter(state.x, state.y, state.headingRadians,
                state.range, halfAngle, occluders, this.robot.getDefinition().id.replace(/-collider$/, ""));
            this.graphics.clear();
            if (perimeter.length >= 2) {
                this.graphics.moveTo(0, 0);
                for (const point of perimeter) this.graphics.lineTo(point.x - state.x, point.y - state.y);
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
        this.graphics.rotation = 0;
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
