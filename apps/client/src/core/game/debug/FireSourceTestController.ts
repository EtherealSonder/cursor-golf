import { FireSourceSystem } from "../environment/FireSourceSystem";
import { DEFAULT_SWEEPING_FIRE_SOURCE_DEFINITION } from "../config/SweepingFireSourceDefinition";

interface SweepingSourceState {
    readonly sourceId: string;
    readonly centerAngleRadians: number;
    directionSign: 1 | -1;
}

/** Development-only controller for automated source transform tests. */
export class FireSourceTestController {
    private readonly sweepingSources =
        new Map<string, SweepingSourceState>();

    public constructor(
        private readonly fireSourceSystem: FireSourceSystem,
    ) { }

    public registerSweepingSource(
        sourceId: string,
        centerAngleRadians: number,
    ): void {
        this.sweepingSources.set(
            sourceId,
            {
                sourceId,
                centerAngleRadians,
                directionSign: 1,
            },
        );
    }

    public clear(): void {
        this.sweepingSources.clear();
    }

    public update(
        deltaTime: number,
    ): void {
        if (
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            return;
        }

        const tuning =
            DEFAULT_SWEEPING_FIRE_SOURCE_DEFINITION;

        const halfArc =
            tuning.sweepArcRadians / 2;

        this.sweepingSources.forEach(
            (
                state:
                    SweepingSourceState,
            ) => {
                const source =
                    this.fireSourceSystem
                        .getSourceById(
                            state.sourceId,
                        );

                if (!source) {
                    this.sweepingSources.delete(
                        state.sourceId,
                    );

                    return;
                }

                const min =
                    state.centerAngleRadians -
                    halfArc;

                const max =
                    state.centerAngleRadians +
                    halfArc;

                let next =
                    source.getDirectionRadians() +
                    tuning.angularSpeedRadiansPerSecond *
                    state.directionSign *
                    deltaTime;

                if (next >= max) {
                    next = max;

                    state.directionSign =
                        -1;
                } else if (next <= min) {
                    next = min;

                    state.directionSign =
                        1;
                }

                source.setDirectionRadians(
                    next,
                );
            },
        );
    }
}