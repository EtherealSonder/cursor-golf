import { Container, Graphics } from "pixi.js";
import type { WildfireWarningReservation } from "./WildfireController";
import { WILDFIRE_CONFIG } from "./WildfireConfig";
import { WILDFIRE_WARNING_VFX as VFX } from "./WildfireWarningVfxConfig";

export interface WildfireWarningViewport {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

interface Marker {
    readonly root: Container;
    readonly glow: Graphics;
    readonly ring: Graphics;
    readonly center: Graphics;
    readonly innerRing: Graphics;
    warningId: number | null;
}

/** Fixed-pool, world-space, presentation-only warning markers. */
export class WildfireWarningRenderer {
    private readonly markers: Marker[] = [];

    public constructor(parent: Container) {
        for (let i = 0; i < VFX.poolSize; i++) {
            const root = new Container();
            root.label = `WildfireWarning:${i}`;
            root.visible = false;
            // GroundState is a dedicated semantic layer. Stay above its ground-state textures.
            root.zIndex = 1000;
            const glow = new Graphics();
            const ring = new Graphics();
            const center = new Graphics();
            // One reusable gradient-like center. Recolor and fade without redraws.
            for (let step = 12; step >= 1; step--) {
                const f = step / 12;
                // Stronger central fill with feathered edges. Geometry is constructed once.
                center.circle(0, 0, VFX.radius * VFX.centerRadiusFraction * f)
                    .fill({ color: 0xffffff, alpha: 0.025 + 0.20 * (1 - f) });
            }
            const innerRing = new Graphics();

            // Draw once. Layered translucent disks approximate a smooth radial falloff
            // without allocating canvas textures or redrawing per frame.
            const rings = 16;
            for (let step = rings; step >= 1; step--) {
                const fraction = step / rings;
                const opacity = 0.012 + 0.022 * (1 - fraction);
                glow.circle(0, 0, VFX.radius * fraction).fill({ color: VFX.glowColor, alpha: opacity });
            }
            const segmentAngle = (Math.PI * 2) / VFX.ringSegments;
            const arcSpan = segmentAngle * VFX.ringFillRatio;
            const ringRadius = VFX.radius * VFX.ringRadiusFraction;
            for (let segment = 0; segment < VFX.ringSegments; segment++) {
                const start = segment * segmentAngle;
                ring.arc(0, 0, ringRadius, start, start + arcSpan)
                    .stroke({ color: VFX.ringColor, width: VFX.ringThickness, cap: "round" });
            }
            innerRing.circle(0, 0, VFX.radius * 0.56)
                .stroke({ color: VFX.innerRingColor, alpha: 0.45, width: 1.25 });
            root.addChild(glow, center, innerRing, ring);
            parent.addChild(root);
            this.markers.push({ root, glow, center, ring, innerRing, warningId: null });
        }
    }

    public update(warnings: readonly WildfireWarningReservation[], viewport: WildfireWarningViewport): void {
        // Release expired reservations before assigning newly scheduled ones.
        for (const marker of this.markers) {
            if (marker.warningId !== null && !warnings.some(w => w.id === marker.warningId)) {
                marker.warningId = null;
                marker.root.visible = false;
            }
        }
        for (const warning of warnings) {
            let marker = this.markers.find(m => m.warningId === warning.id);
            if (!marker) {
                marker = this.markers.find(m => m.warningId === null);
                if (!marker) continue;
                marker.warningId = warning.id;
            }
            const duration = WILDFIRE_CONFIG.warningDurationSeconds;
            const age = Math.max(0, Math.min(duration, warning.ageSeconds));
            const progress = duration > 0 ? age / duration : 1;
            // Fast, smooth growth from zero. Animation uses transforms only; no redraws.
            const growT = Math.max(0, Math.min(1, age / VFX.growInSeconds));
            const scale = VFX.initialScale + (1 - VFX.initialScale) * (1 - (1 - growT) ** 3);
            const radius = VFX.radius * scale + VFX.cullPadding;
            const visible = warning.x + radius >= viewport.x && warning.x - radius <= viewport.x + viewport.width
                && warning.y + radius >= viewport.y && warning.y - radius <= viewport.y + viewport.height;
            marker.root.visible = visible;
            if (!visible) continue;
            marker.root.position.set(warning.x, warning.y);
            marker.root.scale.set(scale);
            // Fade the whole marker during the final half-second, including both rings.
            const fadeT = Math.max(0, Math.min(1, (duration - age) / VFX.fadeOutSeconds));
            const fade = fadeT * fadeT * (3 - 2 * fadeT);
            const pulseProgress = Math.max(0, (progress - VFX.pulseStartFraction) / (1 - VFX.pulseStartFraction));
            const pulse = pulseProgress > 0 ? Math.sin(pulseProgress * Math.PI * 3) ** 2 : 0;
            marker.glow.alpha = fade * Math.min(1, (0.40 + 0.60 * progress + pulse * 0.25) * VFX.maxGlowAlpha / 0.34);
            marker.ring.alpha = fade * Math.min(1, 0.50 + 0.42 * progress + pulse * 0.08) * VFX.maxRingAlpha;
            marker.innerRing.alpha = fade * (0.30 + 0.55 * progress + 0.15 * pulse);
            const darken = progress * progress * (3 - 2 * progress);
            const from = VFX.centerInitialColor;
            const to = VFX.centerFinalColor;
            const channel = (shift: number) => Math.round(((from >> shift) & 255) * (1 - darken) + ((to >> shift) & 255) * darken);
            marker.center.tint = (channel(16) << 16) | (channel(8) << 8) | channel(0);
            marker.center.alpha = fade * (VFX.centerInitialAlpha + (VFX.centerFinalAlpha - VFX.centerInitialAlpha) * darken);
            marker.ring.rotation = warning.ageSeconds * VFX.rotationRadiansPerSecond;
        }
    }

    public clear(): void {
        for (const marker of this.markers) {
            marker.warningId = null;
            marker.root.visible = false;
        }
    }

    public destroy(): void {
        for (const marker of this.markers) {
            marker.root.removeFromParent();
            marker.root.destroy({ children: true });
        }
        this.markers.length = 0;
    }
}
