import { WORLD_MODIFIER_IDS, type WorldModifierConfiguration, type WorldModifierId, type WorldModifierResolvedState } from "./WorldModifierDefinition";
import { WorldModifierRandom } from "./WorldModifierRandom";
const VALID_IDS: ReadonlySet<string> = new Set(WORLD_MODIFIER_IDS);
export function rollWorldModifier(seed: number, config: WorldModifierConfiguration): WorldModifierResolvedState {
    if (!Number.isFinite(seed)) throw new Error("World modifier seed must be finite.");
    if (!Number.isFinite(config.activationChance) || config.activationChance < 0 || config.activationChance > 1) {
        throw new Error("World modifier activationChance must be between 0 and 1.");
    }
    if (config.mode !== "random" && config.mode !== "disabled" && config.mode !== "forced") {
        throw new Error("Invalid world modifier mode.");
    }
    const eligible: WorldModifierId[] = [];
    const seen = new Set<WorldModifierId>();
    for (const id of config.eligible) {
        if (!VALID_IDS.has(id)) throw new Error(`Unknown world modifier: ${id}`);
        if (!seen.has(id)) { eligible.push(id); seen.add(id); }
    }
    for (const id of WORLD_MODIFIER_IDS) {
        const weight = config.weights[id] ?? 0;
        if (!Number.isFinite(weight) || weight < 0) throw new Error(`Invalid weight for ${id}`);
    }
    const result = (modifier: WorldModifierId | null, activationRoll: number | null, selectionRoll: number | null): WorldModifierResolvedState =>
        Object.freeze({ seed: seed >>> 0, modifier, activationRoll, selectionRoll, mode: config.mode });
    if (config.mode === "disabled") return result(null, null, null);
    if (config.mode === "forced") {
        if (!config.forcedModifier || !VALID_IDS.has(config.forcedModifier)) throw new Error("Forced mode requires a valid forcedModifier.");
        return result(config.forcedModifier, null, null);
    }
    const random = new WorldModifierRandom(seed);
    const activationRoll = random.next();
    if (activationRoll >= config.activationChance) return result(null, activationRoll, null);
    const total = eligible.reduce((sum, id) => sum + (config.weights[id] ?? 0), 0);
    if (total <= 0) return result(null, activationRoll, null);
    const selectionRoll = random.next();
    let cursor = selectionRoll * total;
    for (const id of eligible) {
        const weight = config.weights[id] ?? 0;
        if (weight <= 0) continue;
        if (cursor < weight) return result(id, activationRoll, selectionRoll);
        cursor -= weight;
    }
    return result(eligible.filter(id => (config.weights[id] ?? 0) > 0).slice(-1)[0] ?? null, activationRoll, selectionRoll);
}
