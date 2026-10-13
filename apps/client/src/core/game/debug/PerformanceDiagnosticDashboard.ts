import {P0_SCENARIOS} from "./PerformanceBenchmarkScenario";
import type {BenchmarkScenarioId} from "./PerformanceBenchmarkScenario";
import { Container, Graphics, Text } from "pixi.js";
import { DIAGNOSTIC_PRESETS, diagnosticLabel } from "./PerformanceDiagnosticConfiguration";
import type { PerformanceDiagnosticConfiguration, VfxKind } from "./PerformanceDiagnosticConfiguration";
/** PixiJS buttons: only active when ?perfdiag=1. */
export class PerformanceDiagnosticDashboard {
    private readonly root = new Container();
    private readonly heading = new Text({ text: "", style: {fontFamily:"monospace",fontSize:14,fill:0xffffff,fontWeight:"bold"} });
    private readonly buttons: Container[] = [];
    private readonly buttonsBg: Graphics[] = [];
    private selectedScenario: BenchmarkScenarioId = "P0-S5";
    constructor(private readonly change: (next: PerformanceDiagnosticConfiguration) => void, private readonly runAll:()=>void, private readonly runPassB:()=>void=()=>{}, private readonly runP0:()=>void=()=>{}, private readonly selectP0:(id:BenchmarkScenarioId)=>void=()=>{}) {
        this.root.zIndex = 30000;
        this.root.eventMode = "passive";
        this.root.addChild(this.heading);
        DIAGNOSTIC_PRESETS.forEach((preset,i) => this.makeButton(preset.label, i, () => this.change({...preset.value})));
        this.makeButton("TOGGLE FIRE", 8, () => this.toggle("fire"));
        this.makeButton("TOGGLE WATER", 9, () => this.toggle("water"));
        this.makeButton("TOGGLE WIND", 10, () => this.toggle("wind"));
        this.makeButton("RUN ALL TESTS", 11, () => this.runAll());
        this.makeButton("RUN PASS B", 12, () => this.runPassB());
        P0_SCENARIOS.forEach((scenario,i)=>this.makeButton(scenario.id+" "+scenario.label,13+i,()=>{this.selectedScenario=scenario.id;this.selectP0(scenario.id);this.update(this.current, "scenario selected");}));
        this.makeButton("RUN P0 BENCHMARK",18,()=>this.runP0());
        this.layout(1280);
    }
    private current: PerformanceDiagnosticConfiguration = {fire:true,water:true,wind:true};
    private toggle(kind: VfxKind): void { this.change({...this.current, [kind]: !this.current[kind]}); }
    private makeButton(label: string, index: number, click: () => void): void {
        const c = new Container(); const bg = new Graphics();
        const text = new Text({text:label,style:{fontFamily:"monospace",fontSize:10,fill:0xffffff}});
        text.anchor.set(.5);text.position.set(64,12);
        c.addChild(bg,text);c.eventMode="static";c.cursor="pointer";c.on("pointertap",click);
        this.root.addChild(c);this.buttons.push(c);this.buttonsBg.push(bg);
        c.position.set(index*132,28);
    }
    public update(config: PerformanceDiagnosticConfiguration, progress: string): void {
        this.current = config;
        this.heading.text = `PERF: ${diagnosticLabel(config)} | Selected: ${this.selectedScenario} | ${progress}`;
        this.heading.x = -this.heading.width/2;
        this.buttonsBg.forEach((g,i)=>{
            const active = i<8 ? DIAGNOSTIC_PRESETS[i].label===diagnosticLabel(config) : i>=13 && i<=17 ? P0_SCENARIOS[i-13].id===this.selectedScenario : i>=11 ? false : !config[(["fire","water","wind"] as const)[i-8]];
            g.clear().roundRect(0,0,128,24,5).fill({color:active?0x285b7c:0x202b38,alpha:.94});
        });
    }
    public layout(width: number): void {
        this.root.position.set(width/2,8);
        const cols=4;
        this.buttons.forEach((b,i)=>b.position.set((i%cols-1.5)*132-64,30+Math.floor(i/cols)*28));
    }
    public getContainer(): Container { return this.root; }
    public destroy(): void { this.root.destroy({children:true}); }
}
