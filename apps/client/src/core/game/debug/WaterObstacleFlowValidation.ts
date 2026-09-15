import type { WaterField } from "../environment/WaterField";
import type { WaterObstacleField } from "../environment/WaterObstacleField";

/** Phase 8D-3 controlled validation for obstacle-aware standing-Water flow. */
export class WaterObstacleFlowValidation {
    public constructor(
        private readonly waterField: WaterField,
        private readonly obstacleField: WaterObstacleField,
    ) {}

    public run(): void {
        const definition = this.waterField.getDefinition();
        const cellSize = definition.cellSize;
        const originX = this.waterField.getMinimumWorldX();
        const originY = this.waterField.getMinimumWorldY();
        const center = (gridX: number, gridY: number) => ({
            x: originX + (gridX + 0.5) * cellSize,
            y: originY + (gridY + 0.5) * cellSize,
        });
        const step = (count: number) => {
            for (let i = 0; i < count; i += 1) {
                this.waterField.update(definition.simulationStepSeconds);
            }
        };

        this.reset();
        const openSource = center(20, 20);
        const openDestination = center(21, 20);
        this.waterField.injectWater(openSource.x, openSource.y, 1);
        step(8);
        this.assertPass(
            "Open Neighbor Flow",
            this.waterField.getDepthAt(openDestination.x, openDestination.y) > 0,
        );

        this.reset();
        const blockedSource = center(30, 30);
        const blockedDestination = center(31, 30);
        this.obstacleField.rasterizeRectangle(
            blockedDestination.x, blockedDestination.y, cellSize * 0.75, cellSize * 0.75,
        );
        this.waterField.injectWater(blockedSource.x, blockedSource.y, 1);
        step(12);
        this.assertPass(
            "Blocked Destination Flow",
            this.waterField.getDepthAt(blockedDestination.x, blockedDestination.y) === 0,
        );

        this.reset();
        const wallX = 45;
        const wallY = 40;
        const wallCenter = center(wallX, wallY);
        this.obstacleField.rasterizeRectangle(
            wallCenter.x, wallCenter.y, cellSize * 0.75, cellSize * 9,
        );
        const wallSource = center(wallX - 1, wallY);
        this.waterField.injectWaterWithMomentum(wallSource.x, wallSource.y, 2, 400, 0);
        const totalBefore = this.waterField.getTotalWaterAmount();
        step(24);
        let crossed = false;
        for (let y = wallY - 3; y <= wallY + 3; y += 1) {
            for (let x = wallX + 1; x <= wallX + 3; x += 1) {
                const p = center(x, y);
                if (this.waterField.getDepthAt(p.x, p.y) > 0.000001) crossed = true;
            }
        }
        this.assertPass("Solid Wall Containment", !crossed);
        this.assertPass(
            "Obstacle Flow Conservation",
            Math.abs(this.waterField.getTotalWaterAmount() - totalBefore) < 0.00001,
        );

        this.reset();
        const routeWall = center(60, 60);
        this.obstacleField.rasterizeRectangle(
            routeWall.x, routeWall.y, cellSize * 0.75, cellSize * 3,
        );
        const routeSource = center(59, 58);
        this.waterField.injectWaterWithMomentum(routeSource.x, routeSource.y, 3, 320, 160);
        step(180);
        let reachedFarSide = false;
        for (let y = 57; y <= 63; y += 1) {
            for (let x = 61; x <= 65; x += 1) {
                const p = center(x, y);
                if (this.waterField.getDepthAt(p.x, p.y) > 0.000001) reachedFarSide = true;
            }
        }
        this.assertPass("Available Route Flow", reachedFarSide);

        this.reset();
        console.info("[8D-3] Obstacle-Aware Neighbor Flow: PASS");
    }

    private reset(): void {
        this.waterField.reset();
        this.obstacleField.clear();
    }

    private assertPass(name: string, condition: boolean): void {
        if (!condition) throw new Error(`[8D-3] ${name}: FAIL`);
        console.info(`[8D-3] ${name}: PASS`);
    }
}
