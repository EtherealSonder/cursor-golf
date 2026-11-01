import { useState } from "react";
import { WORLD_MODIFIER_IDS, WORLD_MODIFIER_NAMES, type WorldModifierResolvedState } from "../../core/game/world-modifiers/WorldModifierDefinition";
import { WorldModifierDebugController, type WorldModifierDebugSelection } from "../../core/game/world-modifiers/WorldModifierDebugController";
import "./WorldModifierHud.css";

export function WorldModifierDebugPanel({ state, onApply }: { state: WorldModifierResolvedState | null; onApply: (selection: WorldModifierDebugSelection, seed: number) => void }) {
    const [open, setOpen] = useState(false);
    const [selection, setSelection] = useState<WorldModifierDebugSelection>("random");
    const [seed, setSeed] = useState("");
    const parsed = seed.trim() ? WorldModifierDebugController.parseSeed(seed) : null;
    const invalid = seed.trim().length > 0 && parsed === null;
    if (!open) return <button className="wm2-debug__toggle" onClick={() => setOpen(true)} type="button">WM Debug ▾</button>;
    return <section className="wm2-debug" aria-label="World modifier debug controls">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}><strong>World Modifier Debug</strong><button style={{ flex:"none" }} onClick={() => setOpen(false)} type="button">×</button></div>
        <div>Current: {state?.modifier ? WORLD_MODIFIER_NAMES[state.modifier] : "None"}</div>
        <div>Current seed: {state?.seed ?? "Waiting for World"}</div>
        <label htmlFor="wm2-selection">Selection mode</label>
        <select id="wm2-selection" value={selection} onChange={(e) => setSelection(e.target.value as WorldModifierDebugSelection)}>
            <option value="random">Random (65% activation)</option><option value="none">None (disabled)</option>
            {WORLD_MODIFIER_IDS.map(id => <option key={id} value={id}>Force {WORLD_MODIFIER_NAMES[id]}</option>)}
        </select>
        <label htmlFor="wm2-seed">Optional seed (0 to 4294967295)</label>
        <input id="wm2-seed" value={seed} onChange={e => setSeed(e.target.value)} placeholder="Blank = new random seed" inputMode="numeric" />
        {invalid && <div className="wm2-debug__error">Enter a valid unsigned 32-bit integer.</div>}
        <div className="wm2-debug__actions">
            <button type="button" disabled={!state || invalid} onClick={() => onApply(selection, parsed ?? WorldModifierDebugController.newSeed())}>Apply</button>
            <button type="button" disabled={!state} onClick={() => { const next = WorldModifierDebugController.newSeed(); setSeed(String(next)); onApply(selection, next); }}>Reroll</button>
        </div>
    </section>;
}
