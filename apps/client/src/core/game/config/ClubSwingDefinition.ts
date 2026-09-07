/**
 * Presentation/game-feel tuning for the contact-timed golf Club swing.
 *
 * Shot power and Ball launch physics remain authoritative elsewhere.
 */
export interface ClubSwingDefinition {

    readonly minimumSwingDuration:
    number;

    readonly maximumSwingDuration:
    number;

    readonly followThroughDistance:
    number;

    readonly recoveryDuration:
    number;

    readonly cursorReturnResponseSpeed:
    number;

    readonly cursorReturnSnapDistance:
    number;
}

export const DEFAULT_CLUB_SWING_DEFINITION:
    ClubSwingDefinition = {

    minimumSwingDuration:
        0.065,

    maximumSwingDuration:
        0.135,

    followThroughDistance:
        18,

    recoveryDuration:
        0.085,

    /*
     * Fast smooth catch-up after follow-through, instead of teleporting
     * directly back to the live mouse position.
     */
    cursorReturnResponseSpeed:
        28,

    cursorReturnSnapDistance:
        1.25,
};
