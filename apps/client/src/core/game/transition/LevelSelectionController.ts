import { getAvailableLevels } from "../level/LevelRegistry";
/** Campaign levels are numbered level-01 onward. Development fixtures are excluded. */
export class LevelSelectionController {
    public selectNext(currentLevelId: string): string | null {
        const levels = getAvailableLevels().filter(id => /^level-(?:0*[1-9]\d*)$/.test(id))
            .sort((a,b) => Number(a.slice(6)) - Number(b.slice(6)) || a.localeCompare(b));
        if (!levels.length) return null;
        const current = Number(/^level-(\d+)$/.exec(currentLevelId)?.[1] ?? 0);
        return levels.find(id => Number(id.slice(6)) > current) ?? levels[0];
    }
}
