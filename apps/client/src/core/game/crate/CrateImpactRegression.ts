import { evaluateCrateImpact } from "./CrateImpactEvaluator";
export function runCrateImpactRegression():boolean {
 const impact=(speed:number,impulse:number)=>({closingNormalSpeed:speed,normalImpulseMagnitude:impulse,effectiveMass:1});
 return evaluateCrateImpact("ball",impact(299,1000))===null && evaluateCrateImpact("ball",impact(300,100))==="ballImpact" && evaluateCrateImpact("wall",impact(10,1000))===null && evaluateCrateImpact("other",impact(180,130))==="objectImpact"
  && evaluateCrateImpact("other",impact(179,500))===null
  && evaluateCrateImpact("other",impact(500,129))===null
  && evaluateCrateImpact("wall",impact(180,130))==="wallImpact";
}
