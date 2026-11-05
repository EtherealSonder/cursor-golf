import { Container, Text, TextStyle } from "pixi.js";
export class CrateRewardFloatingText {
  private readonly active: Array<{ text: Text; elapsed: number; startY: number }> = [];
  constructor(private readonly layer: Container) {}
  public spawn(x: number, y: number, lines: string[]): void {
    const text = new Text({ text: lines.join("\n"), style: new TextStyle({ fontFamily: "Arial", fontSize: 23, fontWeight: "bold", fill: 0xffffff, stroke: { color: 0x242033, width: 4 }, align: "center" }) });
    text.anchor.set(0.5, 1);
    text.position.set(x, y - 20);
    this.layer.addChild(text);
    this.active.push({ text, elapsed: 0, startY: y - 20 });
  }
  public update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const entry = this.active[i]; entry.elapsed += Math.max(0, dt);
      entry.text.y = entry.startY - 75 * Math.min(1, entry.elapsed / 1.5);
      entry.text.alpha = Math.max(0, 1 - Math.max(0, entry.elapsed - 0.55) / 0.95);
      if (entry.elapsed >= 1.5) { entry.text.destroy(); this.active.splice(i, 1); }
    }
  }
  public destroy(): void { for (const entry of this.active) entry.text.destroy(); this.active.length = 0; }
}
