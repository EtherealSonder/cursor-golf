import { Container, Graphics, Text } from "pixi.js";
import type { ProceduralSandDensity } from "./ProceduralSandConfig";

/** Screen-space, development-only controls; no DOM or gameplay state ownership. */
export class ProceduralSandDebugControls {
    private readonly root = new Container();
    private readonly buttons: { density: ProceduralSandDensity; background: Graphics }[] = [];
    private readonly details: Text;
    private density: ProceduralSandDensity;

    constructor(parent: Container, initialDensity: ProceduralSandDensity,
        private readonly onRegenerate: (density: ProceduralSandDensity) => void) {
        this.density = initialDensity;
        this.root.position.set(12, 40);
        this.root.zIndex = 10001;
        parent.addChild(this.root);

        const title = new Text({ text: "Procedural Sand", style: { fontFamily: "monospace", fontSize: 13, fill: 0xffffff,
            stroke: { color: 0x000000, width: 3 } } });
        this.root.addChild(title);

        const labels: { name: string; density: ProceduralSandDensity }[] = [
            { name: "Low", density: "low" }, { name: "Medium", density: "medium" }, { name: "High", density: "high" },
        ];
        let x = 0;
        for (const { name, density } of labels) {
            const width = name === "Medium" ? 76 : 57;
            const background = new Graphics();
            background.position.set(x, 23);
            background.eventMode = "static";
            background.cursor = "pointer";
            background.hitArea = { contains: (px: number, py: number) => px >= 0 && py >= 0 && px <= width && py <= 27 };
            background.on("pointertap", () => {
                if (this.density === density) return;
                this.density = density;
                this.refreshButtons();
                this.onRegenerate(density);
            });
            const text = new Text({ text: name, style: { fontFamily: "monospace", fontSize: 12, fill: 0xffffff } });
            text.position.set((width - text.width) / 2, 6);
            background.addChild(text);
            this.root.addChild(background);
            this.buttons.push({ density, background });
            x += width + 4;
        }
        this.refreshButtons();

        const regenerate = new Graphics();
        regenerate.roundRect(0, 0, 202, 28, 5).fill(0x374756).stroke({ color: 0xc3d6df, width: 1 });
        regenerate.position.set(0, 58);
        regenerate.eventMode = "static";
        regenerate.cursor = "pointer";
        regenerate.on("pointertap", () => this.onRegenerate(this.density));
        const regenerateLabel = new Text({ text: "Regenerate Sand", style: { fontFamily: "monospace", fontSize: 12, fill: 0xffffff } });
        regenerateLabel.position.set((202 - regenerateLabel.width) / 2, 6);
        regenerate.addChild(regenerateLabel);
        this.root.addChild(regenerate);

        this.details = new Text({ text: "", style: { fontFamily: "monospace", fontSize: 10, fill: 0xe3e3e3,
            stroke: { color: 0x000000, width: 2 } } });
        this.details.position.set(0, 92);
        this.root.addChild(this.details);
    }

    public updateDiagnostics(generation: number, seed: number, patchCount: number, coveragePercent: number): void {
        this.details.text = `Generation #${generation} | ${patchCount} patches\nSeed ${seed} | ${coveragePercent.toFixed(2)}% coverage`;
    }

    private refreshButtons(): void {
        for (const { density, background } of this.buttons) {
            background.clear();
            background.roundRect(0, 0, density === "medium" ? 76 : 57, 27, 5)
                .fill(density === this.density ? 0x477e62 : 0x303a45)
                .stroke({ color: density === this.density ? 0xb1e5c2 : 0x7c8793, width: 1 });
        }
    }

    public destroy(): void { this.root.destroy({ children: true }); }
}
