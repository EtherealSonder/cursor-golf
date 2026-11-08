import type { CSSProperties } from "react";
import type { WindState } from "../../core/game/environment/WindManager";
import type { WorldModifierResolvedState } from "../../core/game/world-modifiers/WorldModifierDefinition";
import { WORLD_MODIFIER_NAMES } from "../../core/game/world-modifiers/WorldModifierDefinition";
import { WORLD_MODIFIER_HUD_THEMES } from "../../core/game/config/WorldModifierHudThemeDefinition";
import "./WorldModifierHud.css";

export function WorldModifierHud({ state, windState }: { state: WorldModifierResolvedState | null; windState: WindState | null }) {
    const id = state?.modifier;
    if (!id) return null;
    const theme = WORLD_MODIFIER_HUD_THEMES[id];
    const vector = windState?.normalizedDirection;
    const directionDegrees = vector && Number.isFinite(vector.x) && Number.isFinite(vector.y)
        ? Math.atan2(vector.y, vector.x) * (180 / Math.PI) : 0;
    const style = { "--wm-holder-image": `url("${theme.holder}")` } as CSSProperties;
    return <div className={`wm2-hud wm2-hud--${id}`} style={style} role="status" aria-live="polite" aria-label={`World modifier: ${WORLD_MODIFIER_NAMES[id]}`}>
        <span className="wm2-hud__badge" aria-hidden="true"><img className="wm2-hud__icon" src={theme.icon} alt="" draggable={false} /></span>
        <span className="wm2-hud__tab"><span className="wm2-hud__label">{WORLD_MODIFIER_NAMES[id]}</span>
            {id === "gale-force" && <svg className="wm2-hud__direction" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ transform: `rotate(${directionDegrees}deg)` }}><path d="M4 12H20M13 5L20 12L13 19" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </span>
    </div>;
}
