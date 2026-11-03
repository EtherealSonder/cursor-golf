import { WORLD_MODIFIER_IDS, type WorldModifierConfiguration, type WorldModifierId } from "./WorldModifierDefinition";

/** WM-8: validated, versioned per-level authoring contract. */
export interface WorldModifierLevelConfig {
    readonly version: 1;
    readonly worldModifier: WorldModifierConfiguration;
}

const known = new Set<string>(WORLD_MODIFIER_IDS);
const record = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value);

export function parseWorldModifierLevelConfig(input: unknown, source = "level-config.json"): WorldModifierLevelConfig {
    const fail = (reason: string): never => {
        throw new Error(`[WM-8] ${source}: ${reason}`);
    };

    // Explicit guard blocks allow TypeScript to narrow values from JSON safely.
    if (!record(input)) {
        return fail("expected a configuration object");
    }
    if (input.version !== 1 || !record(input.worldModifier)) {
        return fail("expected version: 1 and a worldModifier object");
    }
    const wm = input.worldModifier;

    if (wm.mode !== "random" && wm.mode !== "forced" && wm.mode !== "disabled") {
        return fail("worldModifier.mode must be random, forced or disabled");
    }
    const mode = wm.mode;

    const chanceInput: unknown = wm.activationChance === undefined && mode !== "random" ? 0 : wm.activationChance;
    if (typeof chanceInput !== "number" || !Number.isFinite(chanceInput) || chanceInput < 0 || chanceInput > 1) {
        return fail("activationChance must be a number between 0 and 1");
    }
    const chance = chanceInput;

    const eligibleInput: unknown = wm.eligible === undefined && mode !== "random" ? [] : wm.eligible;
    if (!Array.isArray(eligibleInput)) {
        return fail("eligible must be an array of known modifier IDs");
    }
    if (eligibleInput.some((id: unknown) => typeof id !== "string" || !known.has(id))) {
        return fail("eligible must be an array of known modifier IDs");
    }
    if (new Set(eligibleInput).size !== eligibleInput.length) {
        return fail("eligible contains duplicate modifier IDs");
    }
    const eligible = eligibleInput as WorldModifierId[];

    const weightsInput: unknown = wm.weights === undefined && mode !== "random" ? {} : wm.weights;
    if (!record(weightsInput)) {
        return fail("weights must be an object");
    }
    const weights: Partial<Record<WorldModifierId, number>> = {};
    for (const [id, weight] of Object.entries(weightsInput)) {
        if (!known.has(id) || typeof weight !== "number" || !Number.isFinite(weight) || weight < 0) {
            return fail(`invalid weight for ${id}`);
        }
        weights[id as WorldModifierId] = weight;
    }

    const forced = wm.forcedModifier;
    if (mode === "forced" && (typeof forced !== "string" || !known.has(forced))) {
        return fail("forced mode requires a valid forcedModifier");
    }
    if (forced !== undefined && (typeof forced !== "string" || !known.has(forced))) {
        return fail("invalid forcedModifier");
    }
    if (mode === "random" && chance > 0 && !eligible.some(id => (weights[id] ?? 0) > 0)) {
        return fail("random mode needs a positive weight for at least one eligible modifier");
    }

    return {
        version: 1,
        worldModifier: {
            mode,
            activationChance: chance,
            eligible,
            weights,
            ...(forced !== undefined ? { forcedModifier: forced as WorldModifierId } : {}),
        },
    };
}
