/** P-3: the existing club sine-wave oscillation is enabled only by this debuff. */
export const AIM_SWING = {
    effectId: "aim-swing",
    enabled: true,
    /** Existing ClubDefinition angle/speed/curve settings remain authoritative. */
    preserveClubOscillationParameters: true,
} as const;
