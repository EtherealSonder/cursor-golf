import { WaterFireGroundAcceptanceValidation } from "./WaterFireGroundAcceptanceValidation";
import { WaterFireDirectionalAcceptanceValidation } from "./WaterFireDirectionalAcceptanceValidation";
import { WaterFireMoistureAcceptanceValidation } from "./WaterFireMoistureAcceptanceValidation";
import { WaterFireTechnicalAcceptanceValidation } from "./WaterFireTechnicalAcceptanceValidation";

export class WaterFireIntegratedAcceptanceValidation {
    public static run(): void {
        console.log("[8F-12] INTEGRATED WATER-FIRE ACCEPTANCE");

        const ground = WaterFireGroundAcceptanceValidation.run();
        const directional = WaterFireDirectionalAcceptanceValidation.run();
        const moisture = WaterFireMoistureAcceptanceValidation.run();
        const technical = WaterFireTechnicalAcceptanceValidation.run();

        const passed =
            ground &&
            directional &&
            moisture &&
            technical;

        console.log(
            `[8F-12] INTEGRATED WATER-FIRE ACCEPTANCE: ${passed ? "PASS" : "FAIL"}`,
        );
    }
}
