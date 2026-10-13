/** Diagnostic-only simulation gates. Every preset is a deliberate counterfactual. */
export type SimulationGate = "fireSpread"|"fireSources"|"waterTransport"|"waterEvolution"|"windForces"|"robotUpdates"|"dynamicCollisions";
export interface SimulationPreset {readonly label:string;readonly disabled:readonly SimulationGate[];readonly warning:string;}
export const PASS_B_PRESETS:readonly SimulationPreset[]=[
 {label:"B1 BASELINE",disabled:[],warning:"Normal authoritative simulation"},
 {label:"B2 FIRE SPREAD OFF",disabled:["fireSpread"],warning:"Fire spread frozen; existing heat/contact still active"},
 {label:"B3 FIRE SOURCES OFF",disabled:["fireSources"],warning:"Fire sources frozen; fire manager remains active"},
 {label:"B4 WATER TRANSPORT OFF",disabled:["waterTransport"],warning:"Water source emission and airborne transport frozen; existing packets retained"},
 {label:"B5 WATER EVOLUTION OFF",disabled:["waterEvolution"],warning:"Standing water evolution and ground interaction frozen"},
 {label:"B6 WIND FORCES OFF",disabled:["windForces"],warning:"Wind dynamic forces suspended; wind suction and VFX remain active"},
 {label:"B7 ROBOT UPDATES OFF",disabled:["robotUpdates"],warning:"Entire robot update suspended, including movement: not AI-only isolation"},
 {label:"B8 DYNAMIC COLLISIONS OFF",disabled:["dynamicCollisions"],warning:"Rigid dynamic pair resolution suspended; bumper and Ball interactions still active"},
 {label:"B9 OPTIONAL WORK OFF",disabled:["fireSpread","fireSources","waterTransport","waterEvolution","windForces","robotUpdates","dynamicCollisions"],warning:"Highly non-equivalent gameplay workload"},
 {label:"B10 SPATIAL BASELINE",disabled:[],warning:"Baseline with spatial counters enabled"},
];
