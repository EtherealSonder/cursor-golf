import { Container } from "pixi.js";
import {
    DEFAULT_DEBUFF_HUD_DEFINITION,
} from "../config/DebuffHudDefinition";
import type { DebuffHudDefinition } from "../config/DebuffHudDefinition";

interface DebuffEntry {
    readonly id: string;
    readonly container: Container;
    targetX: number;
    removing: boolean;
    animationElapsed: number;
}

/** Generic right-to-left status queue beneath the lives HUD. */
export class DebuffHud {
    private readonly root = new Container();
    private readonly entries: DebuffEntry[] = [];

    constructor(
        private readonly definition: DebuffHudDefinition = DEFAULT_DEBUFF_HUD_DEFINITION,
    ) {
        this.root.label = "DebuffHud";
    }

    public getContainer(): Container { return this.root; }

    public add(id: string, container: Container): void {
        const existing =
            this.entries.find(
                (entry) => entry.id === id,
            );

        if (existing) {
            if (existing.removing) {
                existing.removing = false;
                existing.animationElapsed = 0;
                existing.container.scale.set(1);
                this.recalculateTargets();
            }
            return;
        }

        container.scale.set(0);
        container.alpha = 1;
        this.root.addChild(container);
        this.entries.push({ id, container, targetX: 0, removing: false, animationElapsed: 0 });
        this.recalculateTargets();
    }

    public remove(id: string): void {
        const entry = this.entries.find((candidate) => candidate.id === id);
        if (!entry || entry.removing) return;
        entry.removing = true;
        entry.animationElapsed = 0;
    }

    public has(id: string): boolean {
        return this.entries.some((entry) => entry.id === id && !entry.removing);
    }

    public update(deltaTimeSeconds: number): void {
        const dt = Math.max(0, deltaTimeSeconds);
        let removedAny = false;

        for (const entry of this.entries) {
            entry.animationElapsed += dt;

            if (entry.removing) {
                const t = Math.min(1, entry.animationElapsed / this.definition.popOutSeconds);
                entry.container.scale.set(1 - t);
                if (t >= 1) {
                    this.root.removeChild(entry.container);
                    entry.container.destroy({ children: true });
                    removedAny = true;
                }
                continue;
            }

            const popT = Math.min(1, entry.animationElapsed / this.definition.popInSeconds);
            if (popT < 1) {
                const overshoot = this.definition.popOvershootScale;
                const scale = popT < 0.72
                    ? (popT / 0.72) * overshoot
                    : overshoot + (1 - overshoot) * ((popT - 0.72) / 0.28);
                entry.container.scale.set(scale);
            } else {
                entry.container.scale.set(1);
            }

            const moveAlpha = Math.min(1, dt / Math.max(0.0001, this.definition.reorderSeconds));
            entry.container.x += (entry.targetX - entry.container.x) * moveAlpha;
        }

        if (removedAny) {
            for (let index = this.entries.length - 1; index >= 0; index -= 1) {
                if (this.entries[index].removing && !this.entries[index].container.parent) {
                    this.entries.splice(index, 1);
                }
            }
            this.recalculateTargets();
        }
    }

    private recalculateTargets(): void {
        let slot = 0;
        for (let index = this.entries.length - 1; index >= 0; index -= 1) {
            const entry = this.entries[index];
            if (entry.removing) continue;
            entry.targetX = -slot * (this.definition.entrySize + this.definition.entrySpacing);
            slot += 1;
        }
    }

    public layout(viewportWidth: number): void {
        this.root.position.set(
            viewportWidth - this.definition.rightMargin - this.definition.entrySize * 0.5,
            this.definition.topOffsetFromLives + this.definition.entrySize * 0.5,
        );
    }

    public destroy(): void {
        this.root.destroy({ children: true });
        this.entries.length = 0;
    }
}
