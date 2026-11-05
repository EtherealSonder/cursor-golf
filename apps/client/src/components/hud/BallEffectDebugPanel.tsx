import type { BallEffectSelection, BallEffectSnapshot } from "../../core/game/ball-effects/BallEffectDefinition";
import { BALL_EFFECT_OPTIONS } from "../../core/game/ball-effects/BallEffectDefinition";
import "./BallEffectDebugPanel.css";

interface Props {
    snapshot: BallEffectSnapshot;
    onSelect: (effect: BallEffectSelection) => void;
}
/** Debug-only status selector; P-1 High Power is implemented. */
export function BallEffectDebugPanel({ snapshot, onSelect }: Props) {
    return (
        <div className="ball-effect-debug" onPointerDown={event => event.stopPropagation()} onPointerUp={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
            <label htmlFor="ball-effect-debug-select">Ball Effect Debug</label>
            <select id="ball-effect-debug-select" value={snapshot.active} onChange={event => onSelect(event.target.value as BallEffectSelection)}>
                {BALL_EFFECT_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <span className="ball-effect-debug-note">{snapshot.active === "high-power" ? "P-1: High Power active" : "P-1: High Power ready; other effects pending"}</span>
        </div>
    );
}
