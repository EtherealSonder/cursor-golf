import { Container, Graphics } from "pixi.js";
import type { Camera } from "../camera/Camera";
import {
    DEFAULT_BALL_DEATH_TRANSITION_DEFINITION,
} from "../config/BallDeathTransitionDefinition";
import type {
    BallDeathTransitionDefinition,
} from "../config/BallDeathTransitionDefinition";
import type {
    BallDeathTransitionSnapshot,
} from "./BallDeathTransitionController";

export interface BallDeathTransitionWorldPoint {
    readonly x: number;
    readonly y: number;
}

/**
 * Stable screen-space iris. Instead of Graphics.cut(), the charcoal area is
 * built as a ring of convex quads from the circular aperture to an outer
 * circle that is guaranteed to cover the viewport. This avoids transient
 * cut-path/crescent artifacts while geometry changes every frame.
 */
export class BallDeathTransitionRenderer {
    private readonly container = new Container();
    private readonly graphics = new Graphics();
    private viewportWidth = 1;
    private viewportHeight = 1;
    private deathWorldPoint: BallDeathTransitionWorldPoint = { x: 0, y: 0 };
    private currentWorldPoint: BallDeathTransitionWorldPoint = { x: 0, y: 0 };

    public constructor(
        private readonly camera: Camera,
        private readonly definition: BallDeathTransitionDefinition =
            DEFAULT_BALL_DEATH_TRANSITION_DEFINITION,
    ) {
        this.container.label = "BallDeathIrisTransition";
        this.container.visible = false;
        this.container.eventMode = "none";
        this.container.addChild(this.graphics);
    }

    public getContainer(): Container { return this.container; }

    public resize(width: number, height: number): void {
        this.viewportWidth = Math.max(1, width);
        this.viewportHeight = Math.max(1, height);
    }

    public setDeathWorldPoint(x: number, y: number): void {
        this.deathWorldPoint = { x, y };
        this.currentWorldPoint = { x, y };
    }

    public setCurrentWorldPoint(x: number, y: number): void {
        this.currentWorldPoint = { x, y };
    }

    public render(snapshot: BallDeathTransitionSnapshot): void {
        if (
            snapshot.state === "idle" ||
            snapshot.state === "cameraFocus" ||
            snapshot.state === "slowMotion" ||
            snapshot.state === "complete"
        ) {
            this.container.visible = false;
            this.graphics.clear();
            return;
        }

        this.container.visible = true;

        const point = snapshot.state === "closing"
            ? this.deathWorldPoint
            : this.currentWorldPoint;
        const screen = this.camera.worldToViewport(point.x, point.y);
        const maximumRadius = this.calculateCoverRadius(screen.x, screen.y);
        const eased = this.easeInOutCubic(snapshot.progress);

        let apertureRadius = this.definition.minimumApertureRadius;
        if (snapshot.state === "closing") {
            apertureRadius = this.lerp(
                maximumRadius,
                this.definition.minimumApertureRadius,
                eased,
            );
        } else if (snapshot.state === "lifeLoss") {
            apertureRadius = this.definition.minimumApertureRadius;
        } else if (snapshot.state === "opening") {
            apertureRadius = this.lerp(
                this.definition.minimumApertureRadius,
                maximumRadius,
                eased,
            );
        }

        this.drawInverseCircle(screen.x, screen.y, apertureRadius);
    }

    public destroy(): void {
        this.graphics.destroy();
        this.container.destroy({ children: false });
    }

    private drawInverseCircle(centerX: number, centerY: number, innerRadius: number): void {
        this.graphics.clear();

        const outerRadius =
            Math.hypot(this.viewportWidth, this.viewportHeight) * 2 +
            Math.abs(centerX) + Math.abs(centerY) +
            this.definition.radiusOverscan;
        const segments = Math.max(32, this.definition.apertureSegments);

        for (let index = 0; index < segments; index += 1) {
            const a0 = (index / segments) * Math.PI * 2;
            const a1 = ((index + 1) / segments) * Math.PI * 2;
            const ix0 = centerX + Math.cos(a0) * innerRadius;
            const iy0 = centerY + Math.sin(a0) * innerRadius;
            const ix1 = centerX + Math.cos(a1) * innerRadius;
            const iy1 = centerY + Math.sin(a1) * innerRadius;
            const ox0 = centerX + Math.cos(a0) * outerRadius;
            const oy0 = centerY + Math.sin(a0) * outerRadius;
            const ox1 = centerX + Math.cos(a1) * outerRadius;
            const oy1 = centerY + Math.sin(a1) * outerRadius;

            this.graphics
                .poly([ix0, iy0, ox0, oy0, ox1, oy1, ix1, iy1])
                .fill({ color: this.definition.overlayColor, alpha: 1 });
        }
    }

    private calculateCoverRadius(centerX: number, centerY: number): number {
        return Math.max(
            Math.hypot(centerX, centerY),
            Math.hypot(this.viewportWidth - centerX, centerY),
            Math.hypot(centerX, this.viewportHeight - centerY),
            Math.hypot(this.viewportWidth - centerX, this.viewportHeight - centerY),
        ) + this.definition.radiusOverscan;
    }

    private easeInOutCubic(value: number): number {
        const t = Math.max(0, Math.min(1, value));
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }
}
