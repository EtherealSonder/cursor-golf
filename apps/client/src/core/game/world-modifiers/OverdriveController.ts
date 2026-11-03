import { NORMAL_MECHANISM_PROFILES, OVERDRIVE_MECHANISM_PROFILES } from "./OverdriveConfig";
import type { OverdriveMechanism, OverdriveProfiles } from "./OverdriveDefinition";
/** WM-7A: activation and read-only profile access; does not mutate mechanisms. */
export class OverdriveController {
    private enabled = false;
    public setEnabled(enabled: boolean): void { this.enabled = enabled; }
    public isEnabled(): boolean { return this.enabled; }
    public getProfiles(): Readonly<OverdriveProfiles> {
        return this.enabled ? OVERDRIVE_MECHANISM_PROFILES : NORMAL_MECHANISM_PROFILES;
    }
    public getProfile<K extends OverdriveMechanism>(mechanism: K): OverdriveProfiles[K] {
        return this.getProfiles()[mechanism];
    }
    public reset(): void { this.enabled = false; }
}
