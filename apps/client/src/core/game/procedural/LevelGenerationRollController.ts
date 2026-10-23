/** Independent 0–100 rolls on each level load. */
export type GenerationIntensity = "low" | "medium" | "high";
export interface GenerationRoll { readonly value: number; readonly intensity: GenerationIntensity }
export function classifyGenerationRoll(value: number): GenerationIntensity {
    return value <= 32 ? "low" : value <= 66 ? "medium" : "high";
}
export function rollLevelGeneration(random: () => number = Math.random): GenerationRoll {
    const value = Math.max(0, Math.min(100, Math.floor(random() * 101)));
    return { value, intensity: classifyGenerationRoll(value) };
}
