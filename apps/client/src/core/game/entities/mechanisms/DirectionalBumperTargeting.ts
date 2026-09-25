import type { DirectionalBumperDefinition } from "../../config/DirectionalBumperDefinition";

export interface DirectionalBumperTargetSnapshot {
    readonly id?: string;
    readonly x: number;
    readonly y: number;
    readonly velocityX: number;
    readonly velocityY: number;
    readonly radius: number;
}

export type DirectionalBumperStrikeSide = "upper" | "lower";
export type DirectionalBumperApproachEpisodeState = "armed" | "serviced" | "stopped" | "outside";

export interface DirectionalBumperTargetingSolution {
    readonly targetAngleRadians: number;
    readonly strikeSide: DirectionalBumperStrikeSide;
    readonly localX: number;
    readonly localY: number;
    readonly localVelocityX: number;
}

export interface DirectionalBumperTargetingDiagnostic {
    readonly valid: boolean;
    readonly reason: "valid" | "outside-forward" | "outside-side" | "not-approaching" | "already-serviced";
    readonly inTrigger: boolean;
    readonly approaching: boolean;
    readonly approachSpeed: number;
    readonly side: DirectionalBumperStrikeSide | "head-on" | "none";
    readonly localX: number;
    readonly localY: number;
    readonly localVelocityX: number;
    readonly ballX: number;
    readonly ballY: number;
    readonly ballVelocityX: number;
    readonly ballVelocityY: number;
    readonly approachVectorX: number;
    readonly approachVectorY: number;
    readonly servicePointX: number;
    readonly servicePointY: number;
    readonly distanceToServiceArm: number;
    readonly episodeState: DirectionalBumperApproachEpisodeState;
    readonly armed: boolean;
}

export interface DirectionalBumperTargetingEvaluation {
    readonly solution: DirectionalBumperTargetingSolution | null;
    readonly diagnostic: DirectionalBumperTargetingDiagnostic;
}

/**
 * DB-2.1 targeting: the trigger is awareness only. A Ball is approaching when
 * its velocity is closing distance to the bumper's service arm, not merely
 * travelling against the bumper's local +X axis.
 */
export class DirectionalBumperTargeting {
    private readonly episodes = new Map<string, { serviced: boolean; stoppedAfterService: boolean }>();
    private lastEvaluatedTargetId = "ball";

    public solve(
        pivotX: number, pivotY: number, idleAngleRadians: number,
        target: DirectionalBumperTargetSnapshot, definition: DirectionalBumperDefinition,
    ): DirectionalBumperTargetingSolution | null {
        return this.evaluate(pivotX, pivotY, idleAngleRadians, target, definition).solution;
    }

    public markApproachServiced(targetId: string = this.lastEvaluatedTargetId): void {
        const episode = this.getEpisode(targetId);
        episode.serviced = true;
        episode.stoppedAfterService = false;
    }

    public reset(): void {
        this.episodes.clear();
        this.lastEvaluatedTargetId = "ball";
    }

    public evaluate(
        pivotX: number, pivotY: number, idleAngleRadians: number,
        target: DirectionalBumperTargetSnapshot, definition: DirectionalBumperDefinition,
    ): DirectionalBumperTargetingEvaluation {
        const targetId = target.id ?? "ball";
        this.lastEvaluatedTargetId = targetId;
        const episode = this.getEpisode(targetId);
        const cos = Math.cos(idleAngleRadians);
        const sin = Math.sin(idleAngleRadians);
        const dx = target.x - pivotX;
        const dy = target.y - pivotY;
        const localX = dx * cos + dy * sin;
        const localY = -dx * sin + dy * cos;
        const localVelocityX = target.velocityX * cos + target.velocityY * sin;
        const radius = Math.max(0, target.radius);
        const insideForward = localX >= -radius && localX <= definition.forwardTriggerLength + radius;
        const insideSide = Math.abs(localY) <= definition.forwardTriggerWidth * 0.5 + radius;
        const inTrigger = insideForward && insideSide;

        // Closest point on the idle service arm segment, from pivot to arm tip.
        const armProjection = clamp(localX, 0, definition.armLength);
        const servicePointX = pivotX + cos * armProjection;
        const servicePointY = pivotY + sin * armProjection;
        const toServiceX = servicePointX - target.x;
        const toServiceY = servicePointY - target.y;
        const distanceToServiceArm = Math.hypot(toServiceX, toServiceY);
        const speed = Math.hypot(target.velocityX, target.velocityY);
        const approachVectorX = distanceToServiceArm > 1e-6 ? toServiceX / distanceToServiceArm : 0;
        const approachVectorY = distanceToServiceArm > 1e-6 ? toServiceY / distanceToServiceArm : 0;
        const approachSpeed = target.velocityX * approachVectorX + target.velocityY * approachVectorY;
        const approaching = speed >= definition.minimumApproachSpeed
            && approachSpeed >= definition.minimumApproachSpeed;
        const movingAway = speed >= definition.minimumApproachSpeed
            && approachSpeed <= -definition.minimumApproachSpeed;
        const stopped = speed < definition.minimumApproachSpeed;

        // Re-arm rules are episode-based, not trigger-entry based.
        if (!inTrigger) {
            episode.serviced = false;
            episode.stoppedAfterService = false;
        } else if (episode.serviced && movingAway) {
            episode.serviced = false;
            episode.stoppedAfterService = false;
        } else if (episode.serviced && stopped) {
            episode.stoppedAfterService = true;
        } else if (episode.serviced && episode.stoppedAfterService && approaching) {
            episode.serviced = false;
            episode.stoppedAfterService = false;
        }

        let side: DirectionalBumperStrikeSide | "head-on" | "none" = "none";
        if (inTrigger) {
            side = localY < -definition.headOnSideEpsilon ? "upper"
                : localY > definition.headOnSideEpsilon ? "lower" : "head-on";
        }

        const episodeState: DirectionalBumperApproachEpisodeState = !inTrigger ? "outside"
            : episode.serviced ? (episode.stoppedAfterService ? "stopped" : "serviced") : "armed";
        const base = {
            inTrigger, approaching, approachSpeed, side, localX, localY, localVelocityX,
            ballX: target.x, ballY: target.y,
            ballVelocityX: target.velocityX, ballVelocityY: target.velocityY,
            approachVectorX, approachVectorY,
            servicePointX, servicePointY, distanceToServiceArm,
            episodeState, armed: !episode.serviced,
        } as const;

        if (!insideForward) return { solution: null, diagnostic: { ...base, valid: false, reason: "outside-forward" } };
        if (!insideSide) return { solution: null, diagnostic: { ...base, valid: false, reason: "outside-side" } };
        if (!approaching) return { solution: null, diagnostic: { ...base, valid: false, reason: "not-approaching" } };
        if (episode.serviced) return { solution: null, diagnostic: { ...base, valid: false, reason: "already-serviced" } };

        const strikeSide: DirectionalBumperStrikeSide = side === "upper" ? "upper"
            : side === "lower" ? "lower"
            : definition.headOnFallback === "clockwise" ? "lower" : "upper";
        const relativeStrike = strikeSide === "upper" ? definition.upperStrikeAngleRadians : definition.lowerStrikeAngleRadians;
        const solution = {
            targetAngleRadians: idleAngleRadians + relativeStrike,
            strikeSide, localX, localY, localVelocityX,
        };
        return { solution, diagnostic: { ...base, valid: true, reason: "valid" } };
    }

    private getEpisode(targetId: string): { serviced: boolean; stoppedAfterService: boolean } {
        let episode = this.episodes.get(targetId);
        if (!episode) {
            episode = { serviced: false, stoppedAfterService: false };
            this.episodes.set(targetId, episode);
        }
        return episode;
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
