import { Container, Graphics } from "pixi.js";
import type { WaterVfxStreamDefinition } from "../config/WaterVfxDefinition";

export interface WaterStreamPoint { readonly x: number; readonly y: number; }
export interface WaterStreamPresentation {
    readonly points: readonly WaterStreamPoint[]; readonly startWidth: number; readonly endWidth: number;
    readonly bodyColor?: number; readonly highlightColor?: number; readonly bodyAlpha?: number; readonly highlightAlpha?: number;
    readonly highlightWidthFraction?: number; readonly highlightLength?: number; readonly highlightSpacing?: number; readonly highlightSpeed?: number;
    readonly resampleSpacing?: number; readonly centerWaveAmplitude?: number; readonly centerWaveFrequency?: number; readonly centerWaveSpeed?: number;
    readonly edgeWaveAmplitude?: number; readonly edgeWaveFrequency?: number; readonly edgeWaveSpeed?: number; readonly phaseOffset?: number;
}
interface Sample extends WaterStreamPoint { readonly distance: number; readonly nx: number; readonly ny: number; }
interface Slot { readonly container: Container; readonly body: Graphics; readonly highlight: Graphics; presentation: WaterStreamPresentation | null; }

/** 8I-5 current-state fluid ribbon. It owns material animation, never trajectory history. */
export class WaterStreamRenderer {
    private readonly container = new Container(); private readonly slots = new Map<string, Slot>(); private animationTime = 0;
    public constructor(private readonly definition: WaterVfxStreamDefinition) { }
    public getContainer(): Container { return this.container; }
    public setStreamById(id: string, s: WaterStreamPresentation): void { if (s.points.length < 2 || this.pathLength(s.points) < this.definition.minimumLength) { this.hideStream(id); return; } const slot = this.getOrCreateSlot(id); slot.presentation = s; slot.container.visible = true; this.draw(slot); }
    public update(dt: number): void { if (!Number.isFinite(dt) || dt <= 0) return; this.animationTime += dt; this.slots.forEach((slot) => { if (slot.container.visible && slot.presentation) this.draw(slot); }); }
    public hideStream(id: string): void { const s = this.slots.get(id); if (!s) return; s.container.visible = false; s.presentation = null; s.body.clear(); s.highlight.clear(); }
    public hideStreamsWithPrefix(prefix: string): void { this.slots.forEach((_slot, id) => { if (id.startsWith(prefix)) this.hideStream(id); }); }
    public reset(): void { this.animationTime = 0; this.slots.forEach((_slot, id) => this.hideStream(id)); }
    public destroy(): void { this.slots.forEach((s) => { s.body.destroy(); s.highlight.destroy(); s.container.destroy({ children: false }); }); this.slots.clear(); this.container.removeFromParent(); this.container.destroy({ children: false }); }

    private draw(slot: Slot): void {
        const s = slot.presentation; if (!s) return; const total = this.pathLength(s.points); if (total <= 0) return;
        const samples = this.resample(s.points, total, Math.max(3, s.resampleSpacing ?? 8)); if (samples.length < 2) return;
        const phase = s.phaseOffset ?? 0, left: WaterStreamPoint[] = [], right: WaterStreamPoint[] = [];
        for (const p of samples) {
            const t = Math.min(1, p.distance / total), base = this.clampWidth(s.startWidth + (s.endWidth - s.startWidth) * t);
            const center = Math.sin(p.distance * (s.centerWaveFrequency ?? 0) - this.animationTime * (s.centerWaveSpeed ?? 0) + phase) * Math.max(0, s.centerWaveAmplitude ?? 0);
            const edgeA = Math.sin(p.distance * (s.edgeWaveFrequency ?? 0) - this.animationTime * (s.edgeWaveSpeed ?? 0) + phase * 1.37) * Math.max(0, s.edgeWaveAmplitude ?? 0);
            const edgeB = Math.sin(p.distance * (s.edgeWaveFrequency ?? 0) * .83 - this.animationTime * (s.edgeWaveSpeed ?? 0) * .91 + phase * 2.11) * Math.max(0, s.edgeWaveAmplitude ?? 0);
            const cx = p.x + p.nx * center, cy = p.y + p.ny * center, minHalf = this.definition.minimumWidth * .5;
            const lh = Math.max(minHalf, base * .5 + edgeA), rh = Math.max(minHalf, base * .5 + edgeB);
            left.push({ x: cx + p.nx * lh, y: cy + p.ny * lh }); right.push({ x: cx - p.nx * rh, y: cy - p.ny * rh });
        }
        const poly: number[] = []; for (const p of left) poly.push(p.x, p.y); for (let i = right.length - 1; i >= 0; i--)poly.push(right[i].x, right[i].y);
        slot.body.clear().poly(poly).fill({ color: s.bodyColor ?? this.definition.bodyColor, alpha: this.clamp01(s.bodyAlpha ?? this.definition.bodyAlpha) });
        this.drawHighlights(slot.highlight, s, samples, total, phase);
    }
    private drawHighlights(g: Graphics, s: WaterStreamPresentation, pts: readonly Sample[], total: number, phase: number): void {
        g.clear(); const frac = this.clamp01(s.highlightWidthFraction ?? this.definition.highlightWidthFraction); if (frac <= 0) return;
        const spacing = Math.max(24, s.highlightSpacing ?? 52), len = Math.max(5, Math.min(spacing * .55, s.highlightLength ?? 16)), speed = Math.max(0, s.highlightSpeed ?? 150), offset = (this.animationTime * speed + phase * 13) % spacing;
        for (let d = offset; d < total; d += spacing) { const a = Math.max(1.5, d), b = Math.min(total - 1.5, d + len); if (b <= a) continue; const pa = this.sampleResampled(pts, a), pb = this.sampleResampled(pts, b), t = Math.min(1, (a + b) * .5 / total), w = this.clampWidth(s.startWidth + (s.endWidth - s.startWidth) * t); g.moveTo(pa.x, pa.y).lineTo(pb.x, pb.y).stroke({ width: Math.max(1, w * frac), color: s.highlightColor ?? this.definition.highlightColor, alpha: this.clamp01(s.highlightAlpha ?? this.definition.highlightAlpha), cap: "round" }); }
    }
    private resample(points: readonly WaterStreamPoint[], total: number, spacing: number): Sample[] { const count = Math.max(2, Math.ceil(total / spacing) + 1), out: Sample[] = []; for (let i = 0; i < count; i++) { const d = i === count - 1 ? total : Math.min(total, i * spacing), p = this.sample(points, d, total), a = this.sample(points, Math.max(0, d - spacing * .6), total), b = this.sample(points, Math.min(total, d + spacing * .6), total), dx = b.x - a.x, dy = b.y - a.y, m = Math.hypot(dx, dy) || 1; out.push({ x: p.x, y: p.y, distance: d, nx: -dy / m, ny: dx / m }); } return out; }
    private sampleResampled(points: readonly Sample[], d: number): WaterStreamPoint { if (d <= 0) return points[0]; for (let i = 1; i < points.length; i++) { const b = points[i]; if (b.distance >= d) { const a = points[i - 1], span = Math.max(1e-6, b.distance - a.distance), t = (d - a.distance) / span; return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; } } return points[points.length - 1]; }
    private sample(points: readonly WaterStreamPoint[], distance: number, total: number): WaterStreamPoint { let acc = 0; const target = Math.max(0, Math.min(total, distance)); for (let i = 1; i < points.length; i++) { const a = points[i - 1], b = points[i], seg = Math.hypot(b.x - a.x, b.y - a.y); if (acc + seg >= target) { const t = seg > 0 ? (target - acc) / seg : 0; return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; } acc += seg; } return points[points.length - 1]; }
    private pathLength(points: readonly WaterStreamPoint[]): number { let n = 0; for (let i = 1; i < points.length; i++)n += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y); return n; }
    private getOrCreateSlot(id: string): Slot { const e = this.slots.get(id); if (e) return e; const container = new Container(), body = new Graphics(), highlight = new Graphics(); container.addChild(body, highlight); this.container.addChild(container); const s: Slot = { container, body, highlight, presentation: null }; this.slots.set(id, s); return s; }
    private clampWidth(v: number): number { return Number.isFinite(v) ? Math.max(this.definition.minimumWidth, Math.min(this.definition.maximumWidth, v)) : this.definition.minimumWidth; }
    private clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }
}
