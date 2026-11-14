import type { BallEffectSelection, BallEffectSnapshot } from "../../core/game/ball-effects/BallEffectDefinition";
import { BALL_EFFECT_OPTIONS } from "../../core/game/ball-effects/BallEffectDefinition";
import { WORLD_MODIFIER_IDS, WORLD_MODIFIER_NAMES, type WorldModifierResolvedState } from "../../core/game/world-modifiers/WorldModifierDefinition";
import type { WorldModifierDebugSelection } from "../../core/game/world-modifiers/WorldModifierDebugController";
import "./BallEffectDebugPanel.css";

interface Props {
    snapshot: BallEffectSnapshot;
    onSelect: (effect: BallEffectSelection) => void;
    modifierState: WorldModifierResolvedState | null;
    onSelectModifier: (selection: WorldModifierDebugSelection) => void;
}
/** Level-test selectors for ball effects and world modifiers. */
export function BallEffectDebugPanel({ snapshot, onSelect, modifierState, onSelectModifier }: Props) {
    const modifierSelection: WorldModifierDebugSelection = !modifierState || modifierState.mode === "random"
        ? "random"
        : modifierState.mode === "disabled" ? "none" : modifierState.modifier ?? "none";
    return (
        <div className="ball-effect-debug" onPointerDown={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
            <label htmlFor="ball-effect-debug-select">Ball Effect Debug</label>
            <select id="ball-effect-debug-select" value={snapshot.active} onChange={event => onSelect(event.target.value as BallEffectSelection)}>
                {BALL_EFFECT_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <label htmlFor="world-modifier-debug-select">World Modifier</label>
            <select id="world-modifier-debug-select" value={modifierSelection} disabled={!modifierState} onChange={event => onSelectModifier(event.target.value as WorldModifierDebugSelection)}>
                <option value="none">None</option>
                <option value="random">Random</option>
                {WORLD_MODIFIER_IDS.map(id => <option key={id} value={id}>{WORLD_MODIFIER_NAMES[id]}</option>)}
            </select>
        </div>
    );
}
