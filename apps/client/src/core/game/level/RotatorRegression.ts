import { ROTATOR_DEFINITION, isRotatorDirection } from "../config/RotatorDefinition";
/** Pure configuration checks; does not create textures or game entities. */
export function assertRotatorRegression(): void {
    if (ROTATOR_DEFINITION.diameter !== 200) throw new Error("[R1] Rotator must occupy 200x200 world units");
    if (ROTATOR_DEFINITION.hubDiameter !== 65 || ROTATOR_DEFINITION.hubDiameter >= ROTATOR_DEFINITION.diameter) throw new Error("[R1] Rotator hub must be 65 units and smaller than the arms");
    if (!isRotatorDirection("clockwise") || !isRotatorDirection("counterClockwise") || isRotatorDirection("reverse")) {
        throw new Error("[R1] Invalid rotator direction contract");
    }
    if (new Set<string>([ROTATOR_DEFINITION.armsTextureKey, ROTATOR_DEFINITION.hubTextureKey]).size !== 2) {
        throw new Error("[R1] Rotator sprites must have separate texture keys");
    }
}
