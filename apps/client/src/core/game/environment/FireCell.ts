/**
 * Pure simulation record for one coarse Fire cell.
 *
 * This class contains no PixiJS state. Grid coordinates are
 * the cell identity. World coordinates are derived once by
 * FireManager and used for surface sampling and rendering.
 */
export class FireCell {
    private age = 0;

    private intensity: number;

    private fuelLevel = 1;

    private fuelIntensityMultiplier = 1;

    private nextSpreadAge: number;

    private scorchedSurface = false;

    private spreadAttemptCount = 0;

    constructor(
        private readonly gridX: number,
        private readonly gridY: number,
        private readonly worldCenterX: number,
        private readonly worldCenterY: number,
        private readonly generation: number,
        initialIntensity: number,
        firstSpreadAge: number,
    ) {
        this.intensity = initialIntensity;
        this.nextSpreadAge = firstSpreadAge;
    }

    public advanceAge(deltaTime: number): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
            return;
        }

        this.age += deltaTime;
    }

    public getGridX(): number {
        return this.gridX;
    }

    public getGridY(): number {
        return this.gridY;
    }

    public getWorldCenterX(): number {
        return this.worldCenterX;
    }

    public getWorldCenterY(): number {
        return this.worldCenterY;
    }

    public getGeneration(): number {
        return this.generation;
    }

    public getAge(): number {
        return this.age;
    }

    public getIntensity(): number {
        return this.intensity;
    }

    public setIntensity(intensity: number): void {
        this.intensity = Math.min(
            1,
            Math.max(
                0,
                Number.isFinite(intensity)
                    ? intensity
                    : 0,
            ),
        );
    }

    public getFuelLevel(): number {
        return this.fuelLevel;
    }

    public setFuelLevel(fuelLevel: number): void {
        this.fuelLevel = Math.min(
            1,
            Math.max(
                0,
                Number.isFinite(fuelLevel)
                    ? fuelLevel
                    : 0,
            ),
        );
    }

    public getFuelIntensityMultiplier(): number {
        return this.fuelIntensityMultiplier;
    }

    public setFuelIntensityMultiplier(
        multiplier: number,
    ): void {
        this.fuelIntensityMultiplier = Math.min(
            1,
            Math.max(
                0,
                Number.isFinite(multiplier)
                    ? multiplier
                    : 0,
            ),
        );
    }

    public getNextSpreadAge(): number {
        return this.nextSpreadAge;
    }

    public scheduleNextSpread(spreadInterval: number): void {
        this.nextSpreadAge += spreadInterval;
        this.spreadAttemptCount += 1;
    }

    public getSpreadAttemptCount(): number {
        return this.spreadAttemptCount;
    }

    public hasScorchedSurface(): boolean {
        return this.scorchedSurface;
    }

    public markSurfaceScorched(): void {
        this.scorchedSurface = true;
    }
}
