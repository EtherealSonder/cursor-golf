import { CrateDestructionController } from "./CrateDestructionController";
export function runCrateDestructionRegression():boolean {
 const controller = new CrateDestructionController();
 const getState = () => controller.state;
 if (controller.state !== "active" || !controller.begin("manual") || controller.begin("windNozzle")) return false;
 if (getState() !== "destroying" || controller.cause !== "manual") return false;
 controller.finish(); return getState() === "removed" && !controller.begin("manual");
}

export function runCrateMineDestructionRegression(): boolean {
 const c=new CrateDestructionController();
 return c.begin("mineExplosion") && !c.begin("mineContact") && c.cause==="mineExplosion";
}
