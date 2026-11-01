/** Small independent, reproducible 32-bit PRNG. No Math.random() is consumed during rolls. */
export class WorldModifierRandom {
    private state: number;
    public constructor(seed: number) {
        if (!Number.isFinite(seed)) throw new Error("World modifier seed must be finite.");
        this.state = seed >>> 0;
    }
    public next(): number {
        this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
        return this.state / 4294967296;
    }
}
/** Session entropy is used only once per World construction; explicit seeds are reproducible. */
export function createWorldModifierSeed(): number {
    return (Math.floor(Math.random() * 4294967296) >>> 0);
}
