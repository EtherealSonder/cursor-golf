import type { ProximityMineExplosionEvent } from "../config/ProximityMineExplosionDefinition";
import {
    DEFAULT_BOULDER_FRACTURE_DEFINITION,
    type BoulderFractureDefinition,
} from "../config/BoulderFractureDefinition";
import type { Rock } from "../entities/props/Rock";

export interface BoulderFragmentSpawnDescriptor {
    readonly x: number;
    readonly y: number;
    readonly radius: number;
    readonly seed: number;
    readonly impulseX: number;
    readonly impulseY: number;
    readonly contactPointX: number;
    readonly contactPointY: number;
}

function hashString(value: string): number {
    let hash = 2166136261 >>> 0;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function nextRandom(state: { value: number }): number {
    state.value = (Math.imul(state.value, 1664525) + 1013904223) >>> 0;
    return state.value / 0x100000000;
}

export class BoulderFractureSystem {
    public constructor(
        private readonly definition: BoulderFractureDefinition =
            DEFAULT_BOULDER_FRACTURE_DEFINITION,
    ) {}

    public createFragments(
        boulder: Rock,
        event: ProximityMineExplosionEvent,
    ): readonly BoulderFragmentSpawnDescriptor[] {
        if (!boulder.isBoulder()) return [];

        const randomState = {
            value: (boulder.getSeed() ^ hashString(event.mineId)) >>> 0,
        };
        const countRange =
            this.definition.maximumFragmentCount -
            this.definition.minimumFragmentCount + 1;
        const count =
            this.definition.minimumFragmentCount +
            Math.floor(nextRandom(randomState) * countRange);

        const descriptors: BoulderFragmentSpawnDescriptor[] = [];
        const baseAngle = nextRandom(randomState) * Math.PI * 2;

        for (let index = 0; index < count; index += 1) {
            const radius =
                this.definition.minimumFragmentRadius +
                Math.floor(
                    nextRandom(randomState) *
                    (this.definition.maximumFragmentRadius -
                        this.definition.minimumFragmentRadius + 1),
                );
            const angle =
                baseAngle +
                (index / count) * Math.PI * 2 +
                (nextRandom(randomState) * 2 - 1) *
                    this.definition.angularJitterRadians;
            const radialX = Math.cos(angle);
            const radialY = Math.sin(angle);
            const tangentX = -radialY;
            const tangentY = radialX;

            const spawnDistance =
                boulder.getRadius() +
                radius +
                this.definition.spawnClearance;
            const radialImpulse =
                this.definition.minimumRadialImpulse +
                nextRandom(randomState) *
                (this.definition.maximumRadialImpulse -
                    this.definition.minimumRadialImpulse);
            const tangentialImpulse =
                radialImpulse *
                this.definition.maximumTangentialImpulseFraction *
                (nextRandom(randomState) * 2 - 1);

            const impulseX =
                radialX * radialImpulse +
                tangentX * tangentialImpulse;
            const impulseY =
                radialY * radialImpulse +
                tangentY * tangentialImpulse;

            // Offset the application point perpendicular to the outward ray so
            // the ordinary Small Rock rigid body receives visible angular motion.
            const leverArm =
                radius * this.definition.impulseLeverArmFraction;
            const leverSign = nextRandom(randomState) < 0.5 ? -1 : 1;

            descriptors.push({
                x: boulder.getX() + radialX * spawnDistance,
                y: boulder.getY() + radialY * spawnDistance,
                radius,
                seed:
                    (boulder.getSeed() +
                        1009 * (index + 1) +
                        hashString(event.mineId)) >>> 0,
                impulseX,
                impulseY,
                contactPointX:
                    boulder.getX() + radialX * spawnDistance +
                    tangentX * leverArm * leverSign,
                contactPointY:
                    boulder.getY() + radialY * spawnDistance +
                    tangentY * leverArm * leverSign,
            });
        }

        return descriptors;
    }
}
