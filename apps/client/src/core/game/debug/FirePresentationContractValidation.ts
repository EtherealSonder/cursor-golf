import {
    DIRECTIONAL_FIRE_PRESENTATION_CONTRACT,
    FirePresentationKind,
    GROUND_FIRE_PRESENTATION_CONTRACT,
} from "../fire-vfx/FirePresentationContract";

export class FirePresentationContractValidation {

    private static hasRun = false;

    public static run(): void {
        if (this.hasRun) {
            return;
        }

        this.hasRun = true;

        const ground =
            GROUND_FIRE_PRESENTATION_CONTRACT;

        const directional =
            DIRECTIONAL_FIRE_PRESENTATION_CONTRACT;

        const presentationOnly =
            (contract: typeof ground): boolean =>
                contract.readsAuthoritativeState === true &&
                contract.ownsHeat === false &&
                contract.ownsIgnition === false &&
                contract.ownsSpread === false &&
                contract.ownsLifetime === false &&
                contract.ownsGeneration === false &&
                contract.ownsScorch === false &&
                contract.ownsWaterFireInteraction === false;

        const groundIdentityPass =
            ground.kind === FirePresentationKind.Ground;

        const directionalIdentityPass =
            directional.kind === FirePresentationKind.Directional;

        const separationPass =
            ground.kind !== directional.kind;

        const ownershipPass =
            presentationOnly(ground) &&
            presentationOnly(directional);

        const passed =
            groundIdentityPass &&
            directionalIdentityPass &&
            separationPass &&
            ownershipPass;

        console.log("[F-1] FIRE PRESENTATION CONTRACT");
        console.log(`[F-1] Ground identity: ${groundIdentityPass ? "PASS" : "FAIL"}`);
        console.log(`[F-1] Directional identity: ${directionalIdentityPass ? "PASS" : "FAIL"}`);
        console.log(`[F-1] Presentation separation: ${separationPass ? "PASS" : "FAIL"}`);
        console.log(`[F-1] Presentation-only ownership: ${ownershipPass ? "PASS" : "FAIL"}`);
        console.log(`[F-1] RESULT: ${passed ? "PASS" : "FAIL"}`);

        if (!passed) {
            throw new Error(
                "[F-1] Fire presentation contract validation failed.",
            );
        }
    }
}
