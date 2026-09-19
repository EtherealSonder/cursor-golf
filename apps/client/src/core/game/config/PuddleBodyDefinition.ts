/**
 * Phase 8I-8B.5/6 definition for connected standing-Water body queries.
 *
 * This is deliberately separate from BallWaterInteractionDefinition:
 * local Ball resistance and connected-body topology are different concerns.
 */
export interface PuddleBodyDefinition {
    /**
     * A cell must meet this authoritative depth to participate in a connected
     * puddle body. This prevents microscopic Water films from acting as bridges.
     */
    readonly minimumConnectedDepth: number;

    /**
     * Hard safety guard for one connected-body query. The query never scans
     * the entire WaterField by design; this additionally bounds pathological
     * connected regions.
     */
    readonly maximumVisitedCells: number;
}

export const DEFAULT_PUDDLE_BODY_DEFINITION:
    PuddleBodyDefinition = {
    minimumConnectedDepth: 0.012,
    maximumVisitedCells: 65536,
};

export function validatePuddleBodyDefinition(
    definition: PuddleBodyDefinition,
): void {
    if (
        !Number.isFinite(definition.minimumConnectedDepth) ||
        definition.minimumConnectedDepth <= 0
    ) {
        throw new Error(
            "PuddleBody minimumConnectedDepth must be a finite number greater than zero.",
        );
    }

    if (
        !Number.isInteger(definition.maximumVisitedCells) ||
        definition.maximumVisitedCells <= 0
    ) {
        throw new Error(
            "PuddleBody maximumVisitedCells must be a positive integer.",
        );
    }
}
