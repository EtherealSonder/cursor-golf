/**
 * Camera-aware presentation-only visibility query.
 *
 * Gameplay/simulation systems must not depend on this class. Bounds are kept
 * in world space. Invalid/uninitialised camera data deliberately fails open so
 * presentation can never disappear because a visibility snapshot is bad.
 */
export interface PresentationWorldBounds {
    readonly minimumX: number;
    readonly minimumY: number;
    readonly maximumX: number;
    readonly maximumY: number;
}

export class PresentationVisibilityQuery {
    public static readonly DEFAULT_MARGIN_WORLD_UNITS = 220;

    private minimumX = 0;
    private minimumY = 0;
    private maximumX = 0;
    private maximumY = 0;
    private valid = false;

    public constructor(
        private readonly readViewportBounds: () => PresentationWorldBounds,
        private readonly marginWorldUnits =
            PresentationVisibilityQuery.DEFAULT_MARGIN_WORLD_UNITS,
    ) {
        this.refresh();
    }

    /** Refresh after Camera movement and before presentation updates. */
    public refresh(): void {
        const bounds = this.readViewportBounds();
        const values = [
            bounds.minimumX,
            bounds.minimumY,
            bounds.maximumX,
            bounds.maximumY,
        ];

        if (!values.every(Number.isFinite)) {
            this.valid = false;
            return;
        }

        const rawMinimumX = Math.min(bounds.minimumX, bounds.maximumX);
        const rawMaximumX = Math.max(bounds.minimumX, bounds.maximumX);
        const rawMinimumY = Math.min(bounds.minimumY, bounds.maximumY);
        const rawMaximumY = Math.max(bounds.minimumY, bounds.maximumY);

        if (rawMaximumX <= rawMinimumX || rawMaximumY <= rawMinimumY) {
            this.valid = false;
            return;
        }

        const margin = Math.max(0, this.marginWorldUnits);
        this.minimumX = rawMinimumX - margin;
        this.minimumY = rawMinimumY - margin;
        this.maximumX = rawMaximumX + margin;
        this.maximumY = rawMaximumY + margin;
        this.valid = true;
    }

    public hasValidBounds(): boolean {
        return this.valid;
    }

    public getExpandedWorldBounds(extraMargin = 0): PresentationWorldBounds | null {
        if (!this.valid) return null;
        const margin = Math.max(0, extraMargin);
        return {
            minimumX: this.minimumX - margin,
            minimumY: this.minimumY - margin,
            maximumX: this.maximumX + margin,
            maximumY: this.maximumY + margin,
        };
    }

    public isPointNearViewport(x: number, y: number, extraMargin = 0): boolean {
        // Fail open. Visibility must never become simulation/presentation authority.
        if (!this.valid) return true;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return true;
        const margin = Math.max(0, extraMargin);
        return x >= this.minimumX - margin && x <= this.maximumX + margin &&
            y >= this.minimumY - margin && y <= this.maximumY + margin;
    }

    public intersectsExpandedViewport(
        minimumX: number,
        minimumY: number,
        maximumX: number,
        maximumY: number,
        extraMargin = 0,
    ): boolean {
        if (!this.valid) return true;
        const values = [minimumX, minimumY, maximumX, maximumY];
        if (!values.every(Number.isFinite)) return true;

        const objectMinimumX = Math.min(minimumX, maximumX);
        const objectMaximumX = Math.max(minimumX, maximumX);
        const objectMinimumY = Math.min(minimumY, maximumY);
        const objectMaximumY = Math.max(minimumY, maximumY);
        const margin = Math.max(0, extraMargin);

        return objectMaximumX >= this.minimumX - margin &&
            objectMinimumX <= this.maximumX + margin &&
            objectMaximumY >= this.minimumY - margin &&
            objectMinimumY <= this.maximumY + margin;
    }
}
