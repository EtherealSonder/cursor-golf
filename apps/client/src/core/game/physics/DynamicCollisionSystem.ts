import { PortalPerformanceDiagnosticController as PortalDiag } from "../debug/PortalPerformanceDiagnosticController";
import { PerformanceInvestigationCounters as PassBCounters } from "../debug/PerformanceInvestigationCounters";
import type {
    DynamicCollidable,
} from "./DynamicCollidable";

import {
    detectDynamicCollidableCollision,
    getCompoundContactPart,
} from "./DynamicCollidableCollision";

import type {
    DynamicCollisionBody,
} from "./DynamicCollisionResponse";

import {
    resolveDynamicCollision,
} from "./DynamicCollisionResponse";

export interface DynamicCollisionSystemDefinition {
    readonly maximumResolutionPasses:
    number;

    readonly positionalCorrectionPercent:
    number;

    readonly positionalCorrectionSlop:
    number;
}

export const DEFAULT_DYNAMIC_COLLISION_SYSTEM_DEFINITION:
    DynamicCollisionSystemDefinition = {

    maximumResolutionPasses:
        3,

    positionalCorrectionPercent:
        0.85,

    positionalCorrectionSlop:
        0.01,
};

/**
 * Pairwise mechanism collision orchestration.
 *
 * World supplies only Fan and FireTube collidables during Phase G. Ball
 * collisions keep using Ball's existing dynamic-collision path.
 *
 * With the planned 5 Fan + 5 FireTube stress test this is at most 45 unique
 * candidate pairs per pass, so a spatial broad phase is intentionally avoided.
 */
export class DynamicCollisionSystem {

    private readonly definition:
        DynamicCollisionSystemDefinition;

    constructor(
        definition:
            DynamicCollisionSystemDefinition =
            DEFAULT_DYNAMIC_COLLISION_SYSTEM_DEFINITION,
    ) {
        this.validateDefinition(
            definition,
        );

        this.definition =
            definition;
    }

    /** C4: prevent two fixed-pivot mechanisms rotating farther into one another.
     * Freely movable objects continue to be handled by the impulse solver. */
    public blocksAnchoredRotation(body: DynamicCollidable, candidates: readonly DynamicCollidable[], nextAngle: number, previousAngle: number, tolerance = 0.025): boolean {
        const diag = PortalDiag.active;
        return diag ? diag.measure("portalRotationDynamic",()=>this.blocksAnchoredRotationCore(body,candidates,nextAngle,previousAngle,tolerance)) : this.blocksAnchoredRotationCore(body,candidates,nextAngle,previousAngle,tolerance);
    }
    private blocksAnchoredRotationCore(
        body: DynamicCollidable,
        candidates: readonly DynamicCollidable[],
        nextAngle: number,
        previousAngle: number,
        tolerance = 0.025,
    ): boolean {
        const proxyAt = (angle: number): DynamicCollidable => ({
            getDefinition: () => body.getDefinition(),
            getX: () => body.getX(), getY: () => body.getY(),
            getRotationRadians: () => angle,
            getCompoundCollisionGeometry: () => body.getCompoundCollisionGeometry?.() ?? [],
            getVelocityX: () => body.getVelocityX(), getVelocityY: () => body.getVelocityY(),
            getAngularVelocity: () => body.getAngularVelocity(),
            getInverseMass: () => body.getInverseMass(),
            getInverseMomentOfInertia: () => body.getInverseMomentOfInertia(),
            applyImpulseAtWorldPoint: (ix,iy,x,y) => body.applyImpulseAtWorldPoint(ix,iy,x,y),
            translate: (dx,dy) => body.translate(dx,dy),
        });
        for (const other of candidates) {
            if (other === body || !other.isFixedPivot?.()) continue;
            const before = detectDynamicCollidableCollision(proxyAt(previousAngle), other)?.penetrationDepth ?? 0;
            const after = detectDynamicCollidableCollision(proxyAt(nextAngle), other)?.penetrationDepth ?? 0;
            if (after > tolerance && after > before + 0.00001) return true;
        }
        return false;
    }

    public resolve(collidables: readonly DynamicCollidable[]): number {
        const diag = PortalDiag.active;
        return diag ? diag.measure("dynamicCollision",()=>this.resolveCore(collidables)) : this.resolveCore(collidables);
    }
    private resolveCore(collidables: readonly DynamicCollidable[]): number {
        PassBCounters.passB("dynamicCollisionPasses");

        if (
            collidables.length <
            2
        ) {
            return 0;
        }

        let resolvedCollisionCount =
            0;

        // Compound portals use the same angular impulse solver as every rigid body.
        // The narrow phase supplies a single deepest contact per pair/pass,
        // avoiding duplicate impulses from adjacent capsule joints.
        const resolutionPasses = collidables.some(body => body.getDefinition().material.marbleBounce)
            ? Math.max(5, this.definition.maximumResolutionPasses)
            : this.definition.maximumResolutionPasses;
        for (let passIndex = 0; passIndex < resolutionPasses; passIndex += 1) {
            let overlapFound =
                false;

            for (
                let firstIndex = 0;
                firstIndex <
                collidables.length - 1;
                firstIndex += 1
            ) {
                const first =
                    collidables[
                    firstIndex
                    ];

                for (
                    let secondIndex =
                        firstIndex + 1;
                    secondIndex <
                    collidables.length;
                    secondIndex += 1
                ) {
                    const second =
                        collidables[
                        secondIndex
                        ];

                    const manifold =
                        detectDynamicCollidableCollision(
                            first,
                            second,
                        );

                    if (!manifold) {
                        continue;
                    }

                    overlapFound =
                        true;

                    const result =
                        resolveDynamicCollision(
                            this.createCollisionBody(
                                first, getCompoundContactPart(manifold, "first"),
                            ),

                            this.createCollisionBody(
                                second, getCompoundContactPart(manifold, "second"),
                            ),

                            manifold,

                            this.definition
                                .positionalCorrectionPercent,

                            this.definition
                                .positionalCorrectionSlop,
                        );

                    if (result.normalImpulseMagnitude > 0) {
                        const severity = { closingNormalSpeed: result.closingNormalSpeed, effectiveMass: result.effectiveMass, normalImpulseMagnitude: result.normalImpulseMagnitude };
                        (first as typeof first & {notifyCollisionSeverity?: (source:"other", severity:{closingNormalSpeed:number; effectiveMass:number; normalImpulseMagnitude:number})=>void}).notifyCollisionSeverity?.("other",severity);
                        (second as typeof second & {notifyCollisionSeverity?: (source:"other", severity:{closingNormalSpeed:number; effectiveMass:number; normalImpulseMagnitude:number})=>void}).notifyCollisionSeverity?.("other",severity);
                    }
                    if (
                        result.resolved
                    ) {
                        resolvedCollisionCount +=
                            1;
                    }
                }
            }

            if (!overlapFound) {
                break;
            }
        }

        return resolvedCollisionCount;
    }

    private createCollisionBody(
        collidable:
            DynamicCollidable,
        partId?: string,
    ): DynamicCollisionBody {

        return {
            positionX:
                collidable.getX(),

            positionY:
                collidable.getY(),

            velocityX:
                collidable
                    .getVelocityX(),

            velocityY:
                collidable
                    .getVelocityY(),

            angularVelocity:
                collidable
                    .getAngularVelocity(),

            inverseMass:
                collidable
                    .getInverseMass(),

            inverseMomentOfInertia:
                collidable.getContactInverseMomentOfInertia?.(partId) ?? collidable.getInverseMomentOfInertia(),

            applyImpulseAtWorldPoint:
                (
                    impulseX:
                        number,

                    impulseY:
                        number,

                    contactPointX:
                        number,

                    contactPointY:
                        number,
                ): void => {

                    if (collidable.applyContactImpulseAtWorldPoint) {
                        collidable.applyContactImpulseAtWorldPoint(impulseX, impulseY, contactPointX, contactPointY, partId);
                    } else {
                        collidable.applyImpulseAtWorldPoint(impulseX, impulseY, contactPointX, contactPointY);
                    }
                },

            translate:
                (
                    deltaX:
                        number,

                    deltaY:
                        number,
                ): void => {

                    collidable.translate(
                        deltaX,
                        deltaY,
                    );
                },
        };
    }

    private validateDefinition(
        definition:
            DynamicCollisionSystemDefinition,
    ): void {

        if (
            !Number.isInteger(
                definition
                    .maximumResolutionPasses,
            ) ||
            definition
                .maximumResolutionPasses <=
            0
        ) {
            throw new Error(
                "DynamicCollisionSystem maximumResolutionPasses must be a positive integer.",
            );
        }

        if (
            !Number.isFinite(
                definition
                    .positionalCorrectionPercent,
            ) ||
            definition
                .positionalCorrectionPercent <
            0 ||
            definition
                .positionalCorrectionPercent >
            1
        ) {
            throw new Error(
                "DynamicCollisionSystem positionalCorrectionPercent must be between 0 and 1.",
            );
        }

        if (
            !Number.isFinite(
                definition
                    .positionalCorrectionSlop,
            ) ||
            definition
                .positionalCorrectionSlop <
            0
        ) {
            throw new Error(
                "DynamicCollisionSystem positionalCorrectionSlop must be a finite non-negative value.",
            );
        }
    }
}
