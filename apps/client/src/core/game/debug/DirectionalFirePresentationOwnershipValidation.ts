import {
    DirectionalFirePresentationRegion,
} from "../fire-vfx/DirectionalFirePresentationRegion";

import type {
    DirectionalFirePresentationFootprint,
} from "../fire-vfx/DirectionalFirePresentationRegion";

export class DirectionalFirePresentationOwnershipValidation {

    public static run():
        void {

        const footprint:
            DirectionalFirePresentationFootprint = {
                sourceId:
                    "f2-validation",

                originX:
                    100,

                originY:
                    100,

                directionX:
                    1,

                directionY:
                    0,

                effectiveLength:
                    120,

                halfWidth:
                    20,
            };

        const inside =
            DirectionalFirePresentationRegion
                .containsPointInFootprint(
                    160,
                    100,
                    footprint,
                );

        const outsideHalfWidth =
            !DirectionalFirePresentationRegion
                .containsPointInFootprint(
                    160,
                    121,
                    footprint,
                );

        const behind =
            !DirectionalFirePresentationRegion
                .containsPointInFootprint(
                    99,
                    100,
                    footprint,
                );

        const beyond =
            !DirectionalFirePresentationRegion
                .containsPointInFootprint(
                    221,
                    100,
                    footprint,
                );

        const shortened:
            DirectionalFirePresentationFootprint = {
                ...footprint,
                effectiveLength:
                    40,
            };

        const effectiveLengthCutoff =
            !DirectionalFirePresentationRegion
                .containsPointInFootprint(
                    160,
                    100,
                    shortened,
                );

        const rotated:
            DirectionalFirePresentationFootprint = {
                ...footprint,
                directionX:
                    0,

                directionY:
                    1,
            };

        const rotation =
            DirectionalFirePresentationRegion
                .containsPointInFootprint(
                    100,
                    160,
                    rotated,
                ) &&
            !DirectionalFirePresentationRegion
                .containsPointInFootprint(
                    160,
                    100,
                    rotated,
                );

        /*
         * Runtime ownership semantics.
         *
         * The real runtime pass operates on FireVfxParticle instances in
         * FireVfxPool. This deterministic model verifies the rule itself:
         * Ground particles inside Directional ownership are suppressed,
         * Directional particles are preserved, and Ground particles outside
         * ownership are preserved.
         */
        const runtimeParticles = [
            {
                origin:
                    "ground" as const,

                x:
                    160,

                y:
                    100,

                active:
                    true,
            },
            {
                origin:
                    "ground" as const,

                x:
                    160,

                y:
                    130,

                active:
                    true,
            },
            {
                origin:
                    "directional" as const,

                x:
                    160,

                y:
                    100,

                active:
                    true,
            },
        ];

        for (const particle of runtimeParticles) {
            if (
                particle.active &&
                particle.origin ===
                    "ground" &&
                DirectionalFirePresentationRegion
                    .containsPointInFootprint(
                        particle.x,
                        particle.y,
                        footprint,
                    )
            ) {
                particle.active =
                    false;
            }
        }

        const runtimeGroundSuppression =
            runtimeParticles[0]
                .active ===
                false;

        const outsideGroundPreserved =
            runtimeParticles[1]
                .active ===
                true;

        const directionalParticlePreserved =
            runtimeParticles[2]
                .active ===
                true;

        const passed =
            inside &&
            outsideHalfWidth &&
            behind &&
            beyond &&
            effectiveLengthCutoff &&
            rotation &&
            runtimeGroundSuppression &&
            outsideGroundPreserved &&
            directionalParticlePreserved;

        console.log(
            "[F-2] DIRECTIONAL FIRE PRESENTATION OWNERSHIP",
        );

        console.log(
            `[F-2] Inside active footprint: ${inside ? "PASS" : "FAIL"}`,
        );

        console.log(
            `[F-2] Outside half-width preserved: ${outsideHalfWidth ? "PASS" : "FAIL"}`,
        );

        console.log(
            `[F-2] Behind source excluded: ${behind ? "PASS" : "FAIL"}`,
        );

        console.log(
            `[F-2] Beyond source excluded: ${beyond ? "PASS" : "FAIL"}`,
        );

        console.log(
            `[F-2] Effective-length cutoff respected: ${effectiveLengthCutoff ? "PASS" : "FAIL"}`,
        );

        console.log(
            `[F-2] Direction rotation respected: ${rotation ? "PASS" : "FAIL"}`,
        );

        console.log(
            `[F-2] Existing Ground particle suppression: ${runtimeGroundSuppression ? "PASS" : "FAIL"}`,
        );

        console.log(
            `[F-2] Outside Ground particle preserved: ${outsideGroundPreserved ? "PASS" : "FAIL"}`,
        );

        console.log(
            `[F-2] Directional particle preserved: ${directionalParticlePreserved ? "PASS" : "FAIL"}`,
        );

        console.log(
            `[F-2] RESULT: ${passed ? "PASS" : "FAIL"}`,
        );

        if (!passed) {
            throw new Error(
                "[F-2] Directional Fire presentation ownership validation failed.",
            );
        }
    }
}
