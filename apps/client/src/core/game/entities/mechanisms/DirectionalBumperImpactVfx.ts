import { Graphics } from "pixi.js";
import type { DirectionalBumperDefinition } from "../../config/DirectionalBumperDefinition";
import { Entity } from "../Entity";

export interface DirectionalBumperImpactPresentationEvent {
    readonly x: number;
    readonly y: number;
    readonly outgoingX: number;
    readonly outgoingY: number;
    readonly strength: number;
}

interface ActiveImpact {
    readonly event: DirectionalBumperImpactPresentationEvent;
    readonly streaks: readonly StreakSeed[];
    elapsed: number;
}
interface StreakSeed { readonly angleOffset: number; readonly lengthT: number; readonly lateral: number; readonly thicknessT: number; }

/** DB-3 crisp, presentation-only contact star + directional streak burst. */
export class DirectionalBumperImpactVfx extends Entity {
    private readonly graphics = new Graphics();
    private readonly impacts: ActiveImpact[] = [];
    public constructor(private readonly definition: DirectionalBumperDefinition) { super(); }

    public emit(event: DirectionalBumperImpactPresentationEvent): void {
        const countRange = Math.max(0, this.definition.impactStreakMaxCount - this.definition.impactStreakMinCount);
        const count = this.definition.impactStreakMinCount + Math.round(countRange * clamp01(event.strength));
        const streaks: StreakSeed[] = [];
        for (let i = 0; i < count; i += 1) {
            const centered = count <= 1 ? 0 : i / (count - 1) * 2 - 1;
            streaks.push({
                angleOffset: centered * this.definition.impactStreakSpreadRadians + (hash01(i * 43 + 19) * 2 - 1) * 0.035,
                lengthT: hash01(i * 17 + 3),
                lateral: (hash01(i * 31 + 11) * 2 - 1) * 14,
                thicknessT: hash01(i * 53 + 7),
            });
        }
        this.impacts.push({ event, streaks, elapsed: 0 });
    }

    protected onInitialize(): void { this.container.addChild(this.graphics); }
    protected onUpdate(deltaTime: number): void {
        const dt = Math.max(0, deltaTime);
        const lifetime = Math.max(this.definition.impactStarLifetimeSeconds, this.definition.impactStreakLifetimeSeconds);
        for (let i = this.impacts.length - 1; i >= 0; i -= 1) {
            this.impacts[i].elapsed += dt;
            if (this.impacts[i].elapsed >= lifetime) this.impacts.splice(i, 1);
        }
        this.redraw();
    }
    protected onDestroy(): void { this.impacts.length = 0; this.graphics.destroy(); this.container.destroy({ children: true }); }

    private redraw(): void {
        this.graphics.clear();
        for (const impact of this.impacts) {
            const speed = Math.hypot(impact.event.outgoingX, impact.event.outgoingY);
            if (speed <= 0.0001) continue;
            const baseAngle = Math.atan2(impact.event.outgoingY, impact.event.outgoingX);
            const starT = clamp01(impact.elapsed / this.definition.impactStarLifetimeSeconds);
            if (starT < 1) this.drawStar(impact.event.x, impact.event.y, starT);
            const streakT = clamp01(impact.elapsed / this.definition.impactStreakLifetimeSeconds);
            if (streakT < 1) this.drawStreaks(impact, baseAngle, streakT);
        }
    }

    private drawStar(x: number, y: number, t: number): void {
        const radius = this.definition.impactStarRadius * (0.48 + 0.88 * easeOutBack(t));
        const alpha = 1 - smoothStep(Math.max(0, (t - 0.18) / 0.82));
        const points: number[] = [];
        for (let i = 0; i < 12; i += 1) {
            const angle = -Math.PI * 0.5 + i * Math.PI / 6;
            const r = i % 2 === 0 ? radius : radius * 0.25;
            points.push(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
        }
        this.graphics.poly(points).fill({ color: 0xffffff, alpha });
    }

    private drawStreaks(impact: ActiveImpact, baseAngle: number, t: number): void {
        const extension = easeOutCubic(t);
        const alpha = 1 - smoothStep(Math.max(0, (t - 0.22) / 0.78));
        for (const seed of impact.streaks) {
            const angle = baseAngle + seed.angleOffset;
            const dx = Math.cos(angle), dy = Math.sin(angle);
            const nx = -dy, ny = dx;
            const travel = this.definition.impactStreakTravelDistance * extension;
            const length = lerp(this.definition.impactStreakMinLength, this.definition.impactStreakMaxLength, seed.lengthT) * (0.58 + 0.42 * extension);
            const startX = impact.event.x + dx * (8 + travel) + nx * seed.lateral;
            const startY = impact.event.y + dy * (8 + travel) + ny * seed.lateral;
            const endX = startX + dx * length;
            const endY = startY + dy * length;
            const thicknessVariation = lerp(0.82, 1.22, seed.thicknessT);
            const half = this.definition.impactStreakThickness * thicknessVariation * 0.5 * (1 - 0.28 * t);
            const taperX = startX + dx * length * 0.82;
            const taperY = startY + dy * length * 0.82;
            this.graphics.poly([
                startX + nx * half, startY + ny * half,
                taperX + nx * half * 0.42, taperY + ny * half * 0.42,
                endX, endY,
                taperX - nx * half * 0.42, taperY - ny * half * 0.42,
                startX - nx * half, startY - ny * half,
            ]).fill({ color: 0xffffff, alpha });
        }
    }
}
function clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3); }
function easeOutBack(t: number): number { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
function smoothStep(t: number): number { return t * t * (3 - 2 * t); }
function hash01(seed: number): number { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); }
