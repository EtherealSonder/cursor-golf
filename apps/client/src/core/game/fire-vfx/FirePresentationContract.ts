import { FIRE_ART_DIRECTION } from "../config/FireArtDirectionDefinition";
import type { FireArtDirectionDefinition } from "../config/FireArtDirectionDefinition";

/**
 * Phase F-1 Fire presentation ownership contract.
 *
 * These values describe presentation responsibility only. They intentionally
 * expose no mutation path into Fire simulation, heat, spread, scorch, or
 * Water-Fire gameplay interaction.
 */
export enum FirePresentationKind {
    Ground = "ground-fire",
    Directional = "directional-fire",
}

export interface FirePresentationContract {
    readonly kind: FirePresentationKind;
    readonly artDirection: FireArtDirectionDefinition;
    readonly readsAuthoritativeState: true;
    readonly ownsHeat: false;
    readonly ownsIgnition: false;
    readonly ownsSpread: false;
    readonly ownsLifetime: false;
    readonly ownsGeneration: false;
    readonly ownsScorch: false;
    readonly ownsWaterFireInteraction: false;
    readonly presentationPriority: number;
}

const createPresentationContract = (
    kind: FirePresentationKind,
    presentationPriority: number,
): FirePresentationContract => ({
    kind,
    artDirection: FIRE_ART_DIRECTION,
    readsAuthoritativeState: true,
    ownsHeat: false,
    ownsIgnition: false,
    ownsSpread: false,
    ownsLifetime: false,
    ownsGeneration: false,
    ownsScorch: false,
    ownsWaterFireInteraction: false,
    presentationPriority,
});

export const GROUND_FIRE_PRESENTATION_CONTRACT =
    Object.freeze(
        createPresentationContract(
            FirePresentationKind.Ground,
            0,
        ),
    );

export const DIRECTIONAL_FIRE_PRESENTATION_CONTRACT =
    Object.freeze(
        createPresentationContract(
            FirePresentationKind.Directional,
            1,
        ),
    );

/** Directional presentation wins only where its current spatial footprint overlaps Ground Fire. */
export const DIRECTIONAL_FIRE_PRESENTATION_OVERRIDES_GROUND =
    DIRECTIONAL_FIRE_PRESENTATION_CONTRACT.presentationPriority >
    GROUND_FIRE_PRESENTATION_CONTRACT.presentationPriority;
