/**
 * Read-only EnvironmentField query sample.
 *
 * EnvironmentField stores values in typed arrays rather than allocating
 * one class instance per field cell.
 */
export interface EnvironmentFieldCell {
    readonly gridX: number;
    readonly gridY: number;
    readonly index: number;

    readonly worldCenterX: number;
    readonly worldCenterY: number;

    readonly fuel: number;
    readonly heat: number;
    readonly burnAmount: number;
    readonly moisture: number;
    readonly waterAmount: number;
}
