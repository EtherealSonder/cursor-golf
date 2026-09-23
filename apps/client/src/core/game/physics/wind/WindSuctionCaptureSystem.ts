import {
    DEFAULT_WIND_SUCTION_CAPTURE_DEFINITION,
    type WindSuctionCaptureDefinition,
} from "../../config/LocalWindDefinition";
import type { LocalWindSystem } from "../../environment/LocalWindSystem";
import type { DynamicCollidable } from "../DynamicCollidable";

export interface WindSuctionCaptureTarget {
    readonly id: string;
    readonly body: DynamicCollidable;
    /** Called once at nozzle contact. Must stop gameplay output/collision participation. */
    readonly beginCapture: () => void;
    /** Presentation scale, 1 at contact and 0 at completion. */
    readonly setCaptureScale: (scale: number) => void;
}

interface ActiveCapture {
    readonly target: WindSuctionCaptureTarget;
    elapsedSeconds: number;
}

/**
 * Generic pull-source nozzle capture. Wind influence and capture eligibility are
 * intentionally separate: only explicitly registered targets can be consumed.
 */
export class WindSuctionCaptureSystem {
    private readonly targets = new Map<string, WindSuctionCaptureTarget>();
    private readonly active = new Map<string, ActiveCapture>();
    private readonly completed: WindSuctionCaptureTarget[] = [];

    public constructor(
        private readonly localWindSystem: LocalWindSystem,
        private readonly definition: WindSuctionCaptureDefinition =
            DEFAULT_WIND_SUCTION_CAPTURE_DEFINITION,
    ) {}

    public registerTarget(target: WindSuctionCaptureTarget): void {
        this.targets.set(target.id, target);
    }

    public unregisterTarget(id: string): void {
        this.targets.delete(id);
        this.active.delete(id);
        const completedIndex = this.completed.findIndex((target) => target.id === id);
        if (completedIndex !== -1) this.completed.splice(completedIndex, 1);
    }

    /**
     * Transfers ownership of completed captures back to World. The capture
     * system never destroys World-owned entities itself.
     */
    public consumeCompletedTargets(): readonly WindSuctionCaptureTarget[] {
        if (this.completed.length === 0) return [];
        return this.completed.splice(0, this.completed.length);
    }

    public update(deltaTime: number): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;

        this.beginEligibleCaptures();

        for (const [id, capture] of [...this.active]) {
            capture.elapsedSeconds += deltaTime;
            const duration = Math.max(0.001, this.definition.shrinkDurationSeconds);
            const t = Math.min(1, capture.elapsedSeconds / duration);
            capture.target.setCaptureScale(1 - t);
            if (t < 1) continue;

            this.active.delete(id);
            this.targets.delete(id);
            this.completed.push(capture.target);
        }
    }

    private beginEligibleCaptures(): void {
        const pullSources = this.localWindSystem.getSources().filter(
            (source) => source.enabled && source.flowMode === "pull",
        );
        if (pullSources.length === 0) return;

        for (const target of this.targets.values()) {
            if (this.active.has(target.id) || target.body.getInverseMass() <= 0) continue;

            for (const source of pullSources) {
                const dx = target.body.getX() - source.positionX;
                const dy = target.body.getY() - source.positionY;
                const forwardX = Math.cos(source.directionRadians);
                const forwardY = Math.sin(source.directionRadians);
                const longitudinal = dx * forwardX + dy * forwardY;
                const lateral = Math.abs(-dx * forwardY + dy * forwardX);

                // The pull field extends outward from the nozzle. Capture only at
                // the mouth, never elsewhere along the suction cone.
                if (
                    longitudinal < -this.definition.nozzleCaptureDepth ||
                    longitudinal > this.definition.nozzleCaptureDepth ||
                    lateral > this.definition.nozzleCaptureRadius
                ) {
                    continue;
                }

                target.beginCapture();
                target.setCaptureScale(1);
                this.active.set(target.id, { target, elapsedSeconds: 0 });
                break;
            }
        }
    }
}
