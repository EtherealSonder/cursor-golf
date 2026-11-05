import { STICKY_BALL, isStickyEligible, type StickyAttachmentKind, type StickyCollisionKind } from "../config/StickyBallDefinition";
export interface StickyAttachmentEvent { readonly x: number; readonly y: number; readonly targetId: string; readonly kind: StickyAttachmentKind; }
export type StickyAttachmentState = "free" | "attached" | "released";
export interface StickyAttachmentTarget {
    readonly id: string;
    readonly kind: StickyAttachmentKind;
    /** Target's current contact point, supplied by later collision integrations. */
    getAnchor(): { x: number; y: number } | null;
    getReleaseVelocity?(): { x: number; y: number };
    advance?(dt: number): void;
}
export interface StickyAttachmentSnapshot {
    readonly state: StickyAttachmentState;
    readonly targetId: string | null;
    readonly kind: StickyAttachmentKind | null;
    readonly remainingSeconds: number | null;
}
/** Central Sticky Ball attachment lifecycle for static and future moving targets. */
export class StickyBallAttachmentController {
    private readonly attachmentListeners = new Set<(event: StickyAttachmentEvent) => void>();
    public onAttached(listener: (event: StickyAttachmentEvent) => void): () => void {
        this.attachmentListeners.add(listener);
        return () => { this.attachmentListeners.delete(listener); };
    }
    private enabled = false;
    private state: StickyAttachmentState = "free";
    private target: StickyAttachmentTarget | null = null;
    private remainingSeconds: number | null = null;
    private cooldownSeconds = 0;
    private lastTargetId: string | null = null;
    private pendingReleaseVelocity: { x: number; y: number } | null = null;
    private pendingReleaseKind: StickyAttachmentKind | null = null;
    public consumeReleaseKind(): StickyAttachmentKind | null { const kind = this.pendingReleaseKind; this.pendingReleaseKind = null; return kind; }
    public consumeReleaseVelocity(): { x: number; y: number } | null {
        const velocity = this.pendingReleaseVelocity;
        this.pendingReleaseVelocity = null;
        return velocity;
    }
    public setEnabled(enabled: boolean): void {
        if (this.enabled === enabled) return;
        this.enabled = enabled;
        this.clear();
    }
    public getSnapshot(): StickyAttachmentSnapshot {
        return { state: this.state, targetId: this.target?.id ?? null, kind: this.target?.kind ?? null, remainingSeconds: this.remainingSeconds };
    }
    public canAttach(kind: StickyCollisionKind, targetId: string): boolean {
        return this.enabled && this.state !== "attached" && isStickyEligible(kind) &&
            !(this.cooldownSeconds > 0 && this.lastTargetId === targetId);
    }
    public attach(target: StickyAttachmentTarget): boolean {
        const contact = target.getAnchor();
        if (!this.canAttach(target.kind, target.id) || !contact) return false;
        this.target = target;
        this.pendingReleaseVelocity = null;
        this.pendingReleaseKind = null;
        this.state = "attached";
        this.remainingSeconds = target.kind === "static" || target.kind === "conveyor" ? null : STICKY_BALL.temporaryAttachmentSeconds;
        const event: StickyAttachmentEvent = { x: contact.x, y: contact.y, targetId: target.id, kind: target.kind };
        for (const listener of this.attachmentListeners) listener(event);
        return true;
    }
    public getAttachedAnchor(): { x: number; y: number } | null {
        return this.state === "attached" ? this.target?.getAnchor() ?? null : null;
    }
    public update(deltaSeconds: number): void {
        const dt = Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0);
        this.cooldownSeconds = Math.max(0, this.cooldownSeconds - dt);
        if (this.state === "released" && this.cooldownSeconds === 0) this.state = "free";
        if (this.state !== "attached") return;
        this.target?.advance?.(dt);
        if (!this.target?.getAnchor()) { this.release(this.target?.kind === "conveyor"); return; }
        if (this.remainingSeconds !== null) {
            this.remainingSeconds = Math.max(0, this.remainingSeconds - dt);
            if (this.remainingSeconds === 0) this.release(true);
        }
    }
    public release(timedOut = false): void {
        if (this.state !== "attached") return;
        this.pendingReleaseVelocity = timedOut ? this.target?.getReleaseVelocity?.() ?? null : null;
        this.pendingReleaseKind = timedOut ? this.target?.kind ?? null : null;
        const releasedKind = this.target?.kind ?? null;
        this.lastTargetId = this.target?.id ?? null;
        this.target = null;
        this.remainingSeconds = null;
        this.state = "released";
        // Static targets must accept a new inward shot, including the same wall.
        // Launch-time collision checks occur while the ball is stationary, so
        // the incoming-speed gate in Ball prevents immediate recapture.
        this.cooldownSeconds = releasedKind === "static" ? 0 : STICKY_BALL.sameTargetCooldownSeconds;
    }
    public clear(): void {
        this.target = null;
        this.pendingReleaseVelocity = null;
        this.pendingReleaseKind = null;
        this.remainingSeconds = null;
        this.lastTargetId = null;
        this.cooldownSeconds = 0;
        this.state = "free";
    }
}
