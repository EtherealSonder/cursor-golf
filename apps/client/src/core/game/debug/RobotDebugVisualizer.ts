import { Container, Graphics, Text } from "pixi.js";
import type { Robot } from "../entities/robots/Robot";

export class RobotDebugVisualizer {
    private readonly container = new Container();
    private readonly graphics = new Graphics();
    private readonly text = new Text({ text: "ROBOT R-4", style: { fontFamily: "monospace", fontSize: 14, fill: 0xffffff, lineHeight: 19, stroke: { color: 0x15101a, width: 4 } } });
    public constructor(private readonly robot: Robot) { this.container.addChild(this.graphics, this.text); }
    public getContainer(): Container { return this.container; }
    public update(): void {
        const s = this.robot.getDebugSnapshot(); this.graphics.clear();
        this.graphics.circle(s.roamCenterX, s.roamCenterY, s.roamRadius).stroke({ width: 3, color: 0xf6c453, alpha: 0.9 });
        this.graphics.circle(s.roamCenterX, s.roamCenterY, 6).fill({ color: 0xf6c453, alpha: 1 });
        if (s.destination) {
            this.graphics.moveTo(s.x, s.y).lineTo(s.destination.x, s.destination.y).stroke({ width: 2, color: 0x7ee8fa, alpha: 0.45 });
            this.graphics.circle(s.destination.x, s.destination.y, s.clearanceRadius).stroke({ width: 2, color: 0x7ee8fa, alpha: 0.4 });
            this.graphics.circle(s.destination.x, s.destination.y, 7).fill({ color: 0x7ee8fa, alpha: 1 });
        }
        if (s.avoidanceProbePoint) {
            this.graphics.moveTo(s.x, s.y).lineTo(s.avoidanceProbePoint.x, s.avoidanceProbePoint.y).stroke({ width: 3, color: s.avoidingObstacle ? 0xff8a65 : 0x7cff8b, alpha: 0.9 });
        }

        const left = s.rotationRadians - s.visionHalfAngleDegrees * Math.PI / 180;
        const right = s.rotationRadians + s.visionHalfAngleDegrees * Math.PI / 180;
        const lx = s.x + Math.cos(left) * s.visionRange, ly = s.y + Math.sin(left) * s.visionRange;
        const rx = s.x + Math.cos(right) * s.visionRange, ry = s.y + Math.sin(right) * s.visionRange;
        this.graphics.moveTo(s.x, s.y).lineTo(lx, ly).stroke({ width: 2, color: 0xffd166, alpha: 0.75 });
        this.graphics.moveTo(s.x, s.y).lineTo(rx, ry).stroke({ width: 2, color: 0xffd166, alpha: 0.75 });
        this.graphics.arc(s.x, s.y, s.visionRange, left, right).stroke({ width: 2, color: 0xffd166, alpha: 0.55 });
        for (const candidate of s.visionCandidates) {
            const tx = candidate.target.getX(), ty = candidate.target.getY();
            this.graphics.moveTo(s.x, s.y).lineTo(tx, ty).stroke({ width: 2, color: candidate.visible ? 0x66ff99 : 0xff5c70, alpha: 0.85 });
            this.graphics.circle(tx, ty, candidate.target.id === s.detectedTargetId ? 10 : 6).stroke({ width: 3, color: candidate.visible ? 0x66ff99 : 0xff5c70, alpha: 1 });
        }

        this.text.position.set(s.x - 220, s.y - 250);
        this.text.text = [
            "FIRE ROBOT  R-4", `State: ${s.state}`, `Locomotion: ${s.locomotionPhase}`,
            `Vision: ${s.visionRange}px / ±${s.visionHalfAngleDegrees}°`,
            `Candidates: ${s.visionCandidates.length}`, `Target: ${s.detectedTargetLabel ?? "NONE"}`,
            `Heading error: ${s.headingErrorDegrees.toFixed(1)} deg`,
            `Destination: ${s.destination ? "VALID" : "NONE"}`,
            `Avoidance: ${s.avoidingObstacle ? `STEERING ${s.avoidanceTurnDegrees.toFixed(0)} deg` : "DIRECT"}`,
            `Stuck: ${s.stuckSeconds.toFixed(2)} s`, `Abandoned: ${s.abandonedDestinations}`,
        ].join("\n");
    }
    public destroy(): void { this.container.destroy({ children: true }); }
}
