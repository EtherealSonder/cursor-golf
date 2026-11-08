import type { WorldModifierId } from "../world-modifiers/WorldModifierDefinition";
import wildfireIcon from "../../../assets/sprites/ui/world_modifiers/wild_fire.webp";
import downpourIcon from "../../../assets/sprites/ui/world_modifiers/down_pour.webp";
import galeIcon from "../../../assets/sprites/ui/world_modifiers/gale_force.webp";
import duneIcon from "../../../assets/sprites/ui/world_modifiers/sand_dunes.webp";
import overdriveIcon from "../../../assets/sprites/ui/world_modifiers/over_drive.webp";

import wildfireHolder from "../../../assets/sprites/ui/world_modifiers/world_modifier_wildfire.png";
import downpourHolder from "../../../assets/sprites/ui/world_modifiers/world_modifier_downpour.png";
import galeHolder from "../../../assets/sprites/ui/world_modifiers/world_modifier_gale_force.png";
import duneHolder from "../../../assets/sprites/ui/world_modifiers/world_modifier_dune_surge.png";
import overdriveHolder from "../../../assets/sprites/ui/world_modifiers/world_modifier_overdrive.png";

/** Presentation-only definitions. The underlying modifier rules are unchanged. */
export const WORLD_MODIFIER_HUD_THEMES: Readonly<Record<WorldModifierId, { readonly icon: string; readonly holder: string }>> = {
    "wildfire": { icon: wildfireIcon, holder: wildfireHolder },
    "downpour": { icon: downpourIcon, holder: downpourHolder },
    "gale-force": { icon: galeIcon, holder: galeHolder },
    "dune-surge": { icon: duneIcon, holder: duneHolder },
    "overdrive": { icon: overdriveIcon, holder: overdriveHolder },
};
