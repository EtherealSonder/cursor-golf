import type { ProximityMineExplosionEvent } from "../config/ProximityMineExplosionDefinition";
import {
    DEFAULT_ROCK_INTERACTION_DEFINITION,
    type RockInteractionDefinition,
} from "../config/RockInteractionDefinition";
import type { Rock } from "../entities/props/Rock";

export class RockInteractionSystem {
    public constructor(
        private readonly definition: RockInteractionDefinition =
            DEFAULT_ROCK_INTERACTION_DEFINITION,
    ) {}

    /** Size-dependent impulse susceptibility for gameplay callers. */
    public getImpactMobility(rock: Rock): number {
        if (!rock.isSmallRock()) return 0;
        return Math.pow(1 / Math.max(0.001, rock.getMass()), this.definition.smallRockImpactMassExponent);
    }

    public shouldRegisterAsRobotTarget(rock: Rock): boolean {
        return rock.isSmallRock()
            ? this.definition.smallRockRobotTargetEnabled
            : this.definition.boulderRobotTargetEnabled;
    }

    public shouldRegisterForSuction(rock: Rock): boolean {
        return rock.isSmallRock() &&
            this.definition.smallRockSuctionEnabled &&
            rock.canBeWindSuctionTarget();
    }

    public shouldRegisterAsFixedBoulder(rock: Rock): boolean {
        return rock.isBoulder() &&
            this.definition.boulderWaterWindImmune;
    }



    public shouldFractureBoulder(
        event: ProximityMineExplosionEvent,
        rock: Rock,
    ): boolean {
        if (!rock.isBoulder()) return false;
        const surfaceDistance = Math.max(
            0,
            Math.hypot(rock.getX() - event.x, rock.getY() - event.y) -
                rock.getRadius(),
        );
        return surfaceDistance <
            event.blastRadius *
                this.definition.boulderExplosionFractureRadiusFraction;
    }

    public shouldPulverizeSmallRock(
        event: ProximityMineExplosionEvent,
        rock: Rock,
    ): boolean {
        if (!rock.isSmallRock() || rock.isSuctionCaptured()) return false;
        const surfaceDistance = Math.max(
            0,
            Math.hypot(rock.getX() - event.x, rock.getY() - event.y) -
                rock.getRadius(),
        );
        return surfaceDistance <
            event.blastRadius *
                this.definition.smallRockExplosionPulverizeRadiusFraction;
    }
}
