import type { RobotNavigationPoint, RobotNavigationQuery } from "./RobotNavigationQuery";

export interface RobotAvoidanceResult {
    readonly directionX: number;
    readonly directionY: number;
    readonly probePoint: RobotNavigationPoint;
    readonly avoiding: boolean;
    readonly turnDegrees: number;
}

/** R-3 local avoidance with side commitment/hysteresis to suppress jitter. */
export class RobotObstacleAvoidance {
    private committedSide: -1 | 0 | 1 = 0;
    private commitRemainingSeconds = 0;
    private directClearFrames = 0;

    public constructor(private readonly navigationQuery: RobotNavigationQuery) {}

    public update(deltaTime: number): void {
        this.commitRemainingSeconds = Math.max(0, this.commitRemainingSeconds - deltaTime);
    }

    public reset(): void {
        this.committedSide = 0;
        this.commitRemainingSeconds = 0;
        this.directClearFrames = 0;
    }

    public chooseDirection(
        x: number,
        y: number,
        desiredDirectionX: number,
        desiredDirectionY: number,
        clearanceRadius: number,
        probeDistance: number,
        probeStepDegrees: number,
        maximumTurnDegrees: number,
        commitSeconds: number,
        releaseClearFrames: number,
    ): RobotAvoidanceResult | null {
        const desiredAngle = Math.atan2(desiredDirectionY, desiredDirectionX);
        const direct = this.testDirection(x, y, desiredAngle, 0, clearanceRadius, probeDistance);

        if (direct) {
            this.directClearFrames += 1;
            if (this.committedSide === 0 || (this.commitRemainingSeconds <= 0 && this.directClearFrames >= releaseClearFrames)) {
                this.committedSide = 0;
                return direct;
            }
        } else {
            this.directClearFrames = 0;
        }

        const step = Math.max(1, probeStepDegrees);
        const maximum = Math.max(0, maximumTurnDegrees);
        const sides: Array<-1 | 1> = this.committedSide !== 0
            ? [this.committedSide, this.committedSide === 1 ? -1 : 1]
            : [1, -1];

        for (const side of sides) {
            for (let magnitude = step; magnitude <= maximum + 0.001; magnitude += step) {
                const turnDegrees = magnitude * side;
                const candidate = this.testDirection(
                    x, y, desiredAngle, turnDegrees, clearanceRadius, probeDistance,
                );
                if (!candidate) continue;
                if (this.committedSide !== side) {
                    this.committedSide = side;
                    this.commitRemainingSeconds = Math.max(0, commitSeconds);
                }
                return candidate;
            }
        }

        return direct;
    }

    private testDirection(
        x: number,
        y: number,
        desiredAngle: number,
        turnDegrees: number,
        clearanceRadius: number,
        probeDistance: number,
    ): RobotAvoidanceResult | null {
        const angle = desiredAngle + turnDegrees * Math.PI / 180;
        const directionX = Math.cos(angle);
        const directionY = Math.sin(angle);
        const probePoint = {
            x: x + directionX * probeDistance,
            y: y + directionY * probeDistance,
        };
        if (!this.navigationQuery.isPositionClear(probePoint.x, probePoint.y, clearanceRadius)) return null;
        return { directionX, directionY, probePoint, avoiding: turnDegrees !== 0, turnDegrees };
    }
}
