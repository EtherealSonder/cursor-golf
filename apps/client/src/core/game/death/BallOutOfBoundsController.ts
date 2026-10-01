import type { GameplayCourseDefinition } from "../config/GameplayCourseDefinition";

export type BallOutOfBoundsState = "inside" | "deathRequested";

export interface BallOutOfBoundsUpdate {
    readonly state: BallOutOfBoundsState;
    readonly fallProgress: number;
    readonly requestDeath: boolean;
}

/**
 * D-5 gameplay OOB detection. The shared death iris now owns death
 * presentation, so leaving the authored course requests death immediately.
 */
export class BallOutOfBoundsController {
    private state: BallOutOfBoundsState = "inside";

    public constructor(
        private readonly definition: GameplayCourseDefinition,
    ) {}

    public update(
        x: number,
        y: number,
        _deltaTime: number,
    ): BallOutOfBoundsUpdate {
        if (
            this.state === "inside" &&
            !this.isInsideGameplayCourse(x, y)
        ) {
            this.state = "deathRequested";

            return {
                state: this.state,
                fallProgress: 0,
                requestDeath: true,
            };
        }

        return {
            state: this.state,
            fallProgress: 0,
            requestDeath: false,
        };
    }

    public isInsideGameplayCourse(x: number, y: number): boolean {
        return (
            x >= this.definition.minimumX &&
            x <= this.definition.maximumX &&
            y >= this.definition.minimumY &&
            y <= this.definition.maximumY
        );
    }

    public reset(): void {
        this.state = "inside";
    }

    public getState(): BallOutOfBoundsState {
        return this.state;
    }
}
