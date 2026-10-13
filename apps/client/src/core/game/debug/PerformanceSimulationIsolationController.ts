import type {SimulationGate,SimulationPreset} from "./PerformanceSimulationDiagnosticConfiguration";
/** Opt-in only. World consults this gate at safe, explicit orchestration boundaries. */
export class PerformanceSimulationIsolationController {
 private preset:SimulationPreset|null=null;
 setPreset(preset:SimulationPreset|null):void{this.preset=preset;}
 isEnabled(gate:SimulationGate):boolean{return !this.preset?.disabled.includes(gate);}
 getLabel():string{return this.preset?.label??"NORMAL";}
 getWarning():string{return this.preset?.warning??"";}
 restore():void{this.preset=null;}
}
