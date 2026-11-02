import type { WindState } from "../../core/game/environment/WindManager";
import type { WorldModifierResolvedState } from "../../core/game/world-modifiers/WorldModifierDefinition";
import { WORLD_MODIFIER_NAMES } from "../../core/game/world-modifiers/WorldModifierDefinition";
import "./WorldModifierHud.css";
import sandTexture from "../../assets/textures/terrain/sand-texture.png";

const ICONS = { "dune-surge": "◒", downpour: "☂", wildfire: "♨", overdrive: "⚙" } as const;
export function WorldModifierHud({ state, windState }: { state: WorldModifierResolvedState | null; windState: WindState | null }) {
    // The SVG points along +X at zero degrees, matching WindManager screen-space axes.
    const vector = windState?.normalizedDirection;
    const directionDegrees = vector && Number.isFinite(vector.x) && Number.isFinite(vector.y)
        ? Math.atan2(vector.y, vector.x) * (180 / Math.PI)
        : 0;
    const id = state?.modifier;
    if (!id) return null;
    return <div className={`wm2-hud wm2-hud--${id}`} aria-label={`World modifier: ${WORLD_MODIFIER_NAMES[id]}`}>
        <span className="wm2-hud__badge" aria-hidden="true">{id === "dune-surge" ? <span className="wm3-dune-texture" style={{ backgroundImage: `url(${sandTexture})` }} /> : id === "downpour" ? <span className="wm4-downpour-solid" /> : id === "gale-force" ? <svg className="wm6-gale-arrow" viewBox="0 0 48 48" focusable="false" aria-hidden="true" style={{ transform: `rotate(${directionDegrees}deg)` }}><path d="M9 24 H37 M27 14 L38 24 L27 34" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" /></svg> : ICONS[id]}</span>
        <span className="wm2-hud__tab">{WORLD_MODIFIER_NAMES[id]}</span>
    </div>;
}
