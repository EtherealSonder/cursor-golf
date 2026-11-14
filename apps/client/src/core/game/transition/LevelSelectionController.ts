import { getAvailableLevels } from "../level/LevelRegistry";

/** Picks authored gameplay courses, excluding sandbox and validation fixtures. */
export class LevelSelectionController {
    public selectNext(currentLevelId: string): string | null {
        const candidates = getAvailableLevels().filter(id =>
            /^level-\d+$/.test(id) && id !== currentLevelId,
        );
        if (candidates.length === 0) return null;
        return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
    }
}
