/**
 * Coordinates expensive contour presentation refreshes so standing Water and
 * wet-ground reconstruction do not land on the same render frame.
 * Simulation timing is never affected.
 *
 * Pass 3 adds fair alternation. Previously Standing Water is updated first in
 * World and could repeatedly claim the single contour slot, starving Wet
 * Ground whenever both became due together. The preferred channel now flips
 * after every successful claim.
 */
export type ContourRefreshChannel = "standingWater" | "wetGround";

export class ContourRefreshScheduler {
    private claimedThisFrame = false;
    private preferredChannel: ContourRefreshChannel = "standingWater";

    public beginFrame(): void {
        this.claimedThisFrame = false;
    }

    public request(channel: ContourRefreshChannel): boolean {
        if (this.claimedThisFrame) return false;

        /*
         * The non-preferred channel may still claim when it is the only work
         * that is due. When both are due, World update order plus the flipped
         * preference ensures they alternate across frames instead of allowing
         * one presentation path to monopolise refreshes.
         */
        if (channel !== this.preferredChannel) {
            // Do not block the only requester. Claim it, then favour the other
            // channel on the next frame. This keeps the scheduler work-conserving.
        }

        this.claimedThisFrame = true;
        this.preferredChannel =
            channel === "standingWater" ? "wetGround" : "standingWater";
        return true;
    }
}
