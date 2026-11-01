import type { WorldModifierResolvedState } from "../../core/game/world-modifiers/WorldModifierDefinition";
import { WORLD_MODIFIER_NAMES } from "../../core/game/world-modifiers/WorldModifierDefinition";
import "./WorldModifierHud.css";
import sandTexture from "../../assets/textures/terrain/sand-texture.png";

const ICONS = { "dune-surge": "◒", downpour: "☂", wildfire: "♨", "gale-force": "➤", overdrive: "⚙" } as const;
export function WorldModifierHud({ state }: { state: WorldModifierResolvedState | null }) {
    const id = state?.modifier;
    if (!id) return null;
    return <div className={`wm2-hud wm2-hud--${id}`} aria-label={`World modifier: ${WORLD_MODIFIER_NAMES[id]}`}>
        <span className="wm2-hud__badge" aria-hidden="true">{id === "dune-surge" ? <span className="wm3-dune-texture" style={{ backgroundImage: `url(${sandTexture})` }} /> : id === "downpour" ? <span className="wm4-downpour-solid" /> : ICONS[id]}</span>
        <span className="wm2-hud__tab">{WORLD_MODIFIER_NAMES[id]}</span>
    </div>;
}
