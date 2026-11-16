import levelInfoHolder from "../../assets/sprites/ui/level_info_ui.png";
import "./LevelInfoHud.css";

/** Persistent level label, independent of modifier exit/entrance animations. */
export function LevelInfoHud({ levelId }: { levelId: string }) {
    const match = /^level-(\d+)$/i.exec(levelId);
    const label = match ? `Level ${Number(match[1])}` : levelId === "level-test" ? "Level Test" : levelId.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
    return <div className="level-info-hud" role="status" aria-live="polite" aria-label={label}>
        <img src={levelInfoHolder} className="level-info-hud__holder" alt="" draggable={false} />
        <span className="level-info-hud__label">{label}</span>
    </div>;
}
