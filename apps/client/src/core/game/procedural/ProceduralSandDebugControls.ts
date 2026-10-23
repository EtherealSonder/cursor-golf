import { Container, Text } from "pixi.js";
import type { ProceduralSandDensity } from "./ProceduralSandConfig";
/** Development-only status: one rolled sand intensity and live marble count. */
export class ProceduralSandDebugControls {
    private readonly root = new Container();
    private readonly sand: Text;
    private readonly marbles: Text;
    private totalMarbles = 0;
    constructor(parent: Container, density: ProceduralSandDensity) {
        this.root.position.set(12, 40);
        this.root.zIndex = 10001;
        parent.addChild(this.root);
        const style = { fontFamily: "monospace", fontSize: 12, fill: 0xffffff, stroke: { color: 0x000000, width: 3 } };
        this.sand = new Text({ text: "", style });
        this.marbles = new Text({ text: "Marbles: 0 / 0", style });
        this.marbles.position.set(0, 21);
        this.root.addChild(this.sand, this.marbles);
        this.setSandIntensity(density);
    }
    public setSandIntensity(density: ProceduralSandDensity): void {
        this.sand.text = `Sand intensity: ${density[0].toUpperCase()}${density.slice(1)}`;
    }
    public updateMarbleDiagnostics(_area: number, _target: number, fire: number, water: number): void {
        this.totalMarbles = fire + water;
        this.updateMarbleRemaining(fire, water);
    }
    public updateMarbleRemaining(fire: number, water: number): void {
        this.marbles.text = `Marbles: ${fire + water} / ${this.totalMarbles}`;
    }
    public destroy(): void { this.root.destroy({ children: true }); }
}
