import { CrateFireController } from "./CrateFireController";
import { CRATE_FIRE } from "./CrateFireDefinition";
export function runCrateFireRegression(): boolean {
    const fire = new CrateFireController();
    const getStatus = () => fire.status;
    const getOpacity = () => fire.opacity;
    const duration = CRATE_FIRE.burnSeconds * 0.5;
    if (getStatus() !== "healthy" || !fire.ignite() || fire.ignite()) return false;
    if (!fire.claimPresentation() || fire.claimPresentation()) return false;
    if (fire.update(duration * 0.5) || getStatus() !== "burning") return false;
    if (!(fire.charProgress > 0) || getOpacity() !== 1) return false;
    if (fire.update(duration * 0.49) || getStatus() !== "burning" || getOpacity() !== 1) return false;
    if (!fire.update(duration * 0.01 + 0.00001) || getStatus() !== "burned") return false;
    return !fire.update(1) && !fire.ignite() && getOpacity() === 1;
}
