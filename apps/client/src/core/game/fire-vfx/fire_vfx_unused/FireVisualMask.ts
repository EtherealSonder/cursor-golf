/**
 * Read-only presentation sample used to reconstruct the Fire mask.
 *
 * This is not simulation state. It only describes how one visual influence
 * contributes to the current rendered Fire surface.
 */
export interface FireVisualMaskSample {
    readonly id: string;

    readonly x: number;
    readonly y: number;

    readonly radius: number;
    readonly strength: number;

    /**
     * 1 = newly ignited / energetic front
     * 0 = old interior / dying Fire
     */
    readonly frontEnergy: number;

    readonly seed: number;
}

/**
 * Lightweight reusable visual mask.
 *
 * Ground Fire fills it from FireCells today. Directional and sweeping Fire
 * streams can later fill the same representation from sampled source paths.
 */
export class FireVisualMask {
    private samples:
        FireVisualMaskSample[] =
        [];

    public setSamples(
        samples:
            readonly FireVisualMaskSample[],
    ): void {

        this.samples =
            samples.slice();
    }

    public getSamples():
        readonly FireVisualMaskSample[] {

        return this.samples;
    }

    public clear():
        void {

        this.samples =
            [];
    }

    public getSampleCount():
        number {

        return this.samples.length;
    }
}
