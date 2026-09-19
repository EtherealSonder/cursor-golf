/**
 * Coordinates expensive contour presentation refreshes so standing Water and
 * wet-ground reconstruction do not normally land on the same render frame.
 * Simulation timing is never affected.
 */
export type ContourRefreshChannel = "standingWater" | "wetGround";

export class ContourRefreshScheduler {
    private claimedThisFrame = false;

    public beginFrame(): void {
        this.claimedThisFrame = false;
    }

    public request(_channel: ContourRefreshChannel): boolean {
        if (this.claimedThisFrame) {
            return false;
        }
        this.claimedThisFrame = true;
        return true;
    }
}
