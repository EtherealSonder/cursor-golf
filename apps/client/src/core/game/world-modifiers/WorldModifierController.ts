import { WORLD_MODIFIER_DEVELOPMENT_OVERRIDE } from "./WorldModifierDevelopmentConfig";
import { DEFAULT_WORLD_MODIFIER_CONFIG } from "./WorldModifierConfig";
import { WORLD_MODIFIER_NAMES, type WorldModifierConfiguration, type WorldModifierResolvedState } from "./WorldModifierDefinition";
import { createWorldModifierSeed } from "./WorldModifierRandom";
import { rollWorldModifier } from "./WorldModifierRollController";
/** One controller per World. The selection is resolved exactly once. */
export class WorldModifierController {
    private resolved: WorldModifierResolvedState;
    private configuration: WorldModifierConfiguration;
    private runtimeSelectionActive = false;
    public constructor(config: WorldModifierConfiguration = DEFAULT_WORLD_MODIFIER_CONFIG, seed: number = createWorldModifierSeed()) {
        this.configuration = config;
        this.resolved = rollWorldModifier(seed, config);
    }
    /** Resolve once for the loaded level, before World.initialize creates modifier systems. */
    public configureForLevel(config: WorldModifierConfiguration, seed: number = createWorldModifierSeed()): void {
        this.configuration = config;
        this.resolved = rollWorldModifier(seed, config);
        this.runtimeSelectionActive = false;
    }
    public getRolledState(): WorldModifierResolvedState { return this.resolved; }
    public isOverdriveActive(): boolean { return this.getState().modifier === "overdrive"; }
    public getState(): WorldModifierResolvedState {
        if (!import.meta.env.DEV || this.runtimeSelectionActive || WORLD_MODIFIER_DEVELOPMENT_OVERRIDE === null) return this.resolved;
        return Object.freeze({ ...this.resolved, modifier: WORLD_MODIFIER_DEVELOPMENT_OVERRIDE });
    }

    /** Explicit development command. Normal gameplay never invokes this method. */
    public debugResolve(config: WorldModifierConfiguration, seed: number, levelId: string): WorldModifierResolvedState {
        if (!import.meta.env.DEV) return this.resolved;
        const next = rollWorldModifier(seed, config);
        this.configuration = config;
        this.resolved = next;
        this.runtimeSelectionActive = true;
        this.logRollDiagnostics(levelId);
        return this.getState();
    }


    /** Development-only report. Never rerolls or consumes PRNG state. */
    public logRollDiagnostics(levelId: string): void {
        const state = this.resolved;
        const config = this.configuration;
        const eligible = [...new Set(config.eligible)];
        const totalWeight = eligible.reduce((sum, id) => sum + (config.weights[id] ?? 0), 0);
        const percentage = (fraction: number) => `${(fraction * 100).toFixed(2)}%`;
        const label = state.modifier === null ? "NONE" : WORLD_MODIFIER_NAMES[state.modifier].toUpperCase();
        console.groupCollapsed(`[WM-1] WORLD MODIFIER ROLL | ${levelId} | ${label}`);
        try {
            console.info("Level:", levelId, "| Seed:", state.seed, "| Mode:", state.mode.toUpperCase());
            console.info("STAGE 1: ACTIVATION");
            if (state.mode !== "random") {
                console.info(`Activation roll bypassed (${state.mode} mode).`);
            } else {
                const roll = state.activationRoll;
                const activated = roll !== null && roll < config.activationChance;
                console.info("Activation probability:", percentage(config.activationChance));
                console.info("Random roll:", roll === null ? "N/A" : `${roll.toFixed(6)} (${percentage(roll)})`);
                console.info("Condition:", roll === null ? "N/A" : `${percentage(roll)} < ${percentage(config.activationChance)}`);
                console.info("Activation result:", activated ? "ACTIVATED" : "NOT ACTIVATED");
            }
            console.info("STAGE 2: WEIGHTED SELECTION");
            console.info("Eligible modifiers:", eligible.length, "| Total selection weight:", totalWeight);
            console.table(eligible.map((id) => {
                const weight = config.weights[id] ?? 0;
                const conditional = totalWeight > 0 ? weight / totalWeight : 0;
                return {
                    Modifier: WORLD_MODIFIER_NAMES[id],
                    Weight: weight,
                    "Conditional chance": percentage(conditional),
                    "Overall chance": percentage(config.mode === "random" ? config.activationChance * conditional : config.mode === "forced" ? Number(state.modifier === id) : 0),
                };
            }));
            if (state.selectionRoll !== null) {
                console.info("Selection roll:", state.selectionRoll.toFixed(6));
                console.info("Weighted position:", `${(state.selectionRoll * totalWeight).toFixed(6)} / ${totalWeight}`);
            } else {
                console.info("Selection roll: NOT PERFORMED", state.mode === "random" ? "(activation failed or no positive eligible weights)" : "(mode bypass)");
            }
            console.info("FINAL ROLLED RESULT:", label);
            if (import.meta.env.DEV && WORLD_MODIFIER_DEVELOPMENT_OVERRIDE !== null) {
                console.info("[WM-3] DEVELOPMENT OVERRIDE", { rolled: label, effective: WORLD_MODIFIER_NAMES[WORLD_MODIFIER_DEVELOPMENT_OVERRIDE], overrideEnabled: true });
            }
            if (state.mode === "random") {
                const weight = state.modifier === null ? 0 : config.weights[state.modifier] ?? 0;
                console.info("Theoretical result probability:", percentage(state.modifier === null
                    ? 1 - config.activationChance + (totalWeight <= 0 ? config.activationChance : 0)
                    : totalWeight > 0 ? config.activationChance * weight / totalWeight : 0));
            }
        } finally {
            console.groupEnd();
        }
    }
}
