import {
    ScalarFieldContourBuilder,
} from "./ScalarFieldContourBuilder";
import type {
    ScalarFieldContourBuildOptions,
    ScalarFieldPoint,
} from "./ScalarFieldContourBuilder";

export interface WetGroundContourOptions {
    readonly simplificationTolerance: number;
    readonly smoothingPasses: number;
    readonly smoothingStrength: number;
    readonly cornerPreservation: number;
    readonly minimumArea: number;
    readonly lobeDeformation?: {
        readonly enabled: boolean;
        readonly primaryLobeCount: number;
        readonly primaryAmplitudeWorldUnits: number;
        readonly secondaryAmplitudeWorldUnits: number;
        readonly seedOffset: number;
    };
}

export interface WetGroundContourDeepProfile {
    readonly totalMilliseconds: number;
    readonly scalarMilliseconds: number;
    readonly postProcessMilliseconds: number;
    readonly rawLoops: number;
    readonly acceptedLoops: number;
    readonly rawVertices: number;
    readonly finalVertices: number;
}

export interface WetGroundContour {
    readonly points: readonly ScalarFieldPoint[];
    readonly area: number;
}

export class WetGroundContourBuilder {
    private lastDeepProfile: WetGroundContourDeepProfile = {
        totalMilliseconds: 0,
        scalarMilliseconds: 0,
        postProcessMilliseconds: 0,
        rawLoops: 0,
        acceptedLoops: 0,
        rawVertices: 0,
        finalVertices: 0,
    };

    public getLastDeepProfile(): WetGroundContourDeepProfile {
        return this.lastDeepProfile;
    }

    public build(
        fieldOptions: ScalarFieldContourBuildOptions,
        options: WetGroundContourOptions,
    ): readonly WetGroundContour[] {
        const totalStartedAt = performance.now();
        const scalarStartedAt = totalStartedAt;
        const rawLoops = ScalarFieldContourBuilder.buildLoops({
            ...fieldOptions,
            // 8I-9B.4B: shared builder tightens these caller bounds around
            // samples capable of contributing to the wet iso-contour.
            endpointQuantizationWorldUnits: fieldOptions.cellSize * 0.0025,
        });
        const scalarMilliseconds = performance.now() - scalarStartedAt;
        const postStartedAt = performance.now();
        let rawVertices = 0;
        let finalVertices = 0;
        for (let profileLoopIndex = 0; profileLoopIndex < rawLoops.length; profileLoopIndex += 1) {
            rawVertices += rawLoops[profileLoopIndex].points.length;
        }
        const result: WetGroundContour[] = [];

        for (let i = 0; i < rawLoops.length; i += 1) {
            let points = this.simplify(
                rawLoops[i].points,
                options.simplificationTolerance,
            );
            points = this.smooth(
                points,
                options.smoothingPasses,
                options.smoothingStrength,
                options.cornerPreservation,
            );
            if (options.lobeDeformation?.enabled && points.length >= 4) {
                points = this.deform(points, options.lobeDeformation);
            }
            const area = Math.abs(this.area(points));
            if (points.length >= 3 && area >= options.minimumArea) {
                finalVertices += points.length;
                result.push({ points, area });
            }
        }
        this.lastDeepProfile = {
            totalMilliseconds: performance.now() - totalStartedAt,
            scalarMilliseconds,
            postProcessMilliseconds: performance.now() - postStartedAt,
            rawLoops: rawLoops.length,
            acceptedLoops: result.length,
            rawVertices,
            finalVertices,
        };
        ScalarFieldContourBuilder.recordWetPostProfile(this.lastDeepProfile);
        return result;
    }

    private simplify(
        points: readonly ScalarFieldPoint[],
        tolerance: number,
    ): ScalarFieldPoint[] {
        if (points.length <= 4 || tolerance <= 0) return points.slice();
        const result: ScalarFieldPoint[] = [];
        const toleranceSquared = tolerance * tolerance;
        for (let i = 0; i < points.length; i += 1) {
            if (result.length === 0) {
                result.push(points[i]);
                continue;
            }
            const previous = result[result.length - 1];
            const dx = points[i].x - previous.x;
            const dy = points[i].y - previous.y;
            if (dx * dx + dy * dy >= toleranceSquared) result.push(points[i]);
        }
        return result.length >= 3 ? result : points.slice();
    }

    private smooth(
        points: readonly ScalarFieldPoint[],
        passes: number,
        strength: number,
        cornerPreservation: number,
    ): ScalarFieldPoint[] {
        if (points.length < 4 || passes <= 0 || strength <= 0) {
            return points.slice();
        }

        let current = points.slice();
        const clampedStrength = Math.max(0, Math.min(0.5, strength));
        const clampedCornerPreservation =
            Math.max(0, Math.min(1, cornerPreservation));

        for (let pass = 0; pass < passes; pass += 1) {
            const next: ScalarFieldPoint[] = new Array(current.length);
            for (let i = 0; i < current.length; i += 1) {
                const previous = current[(i - 1 + current.length) % current.length];
                const point = current[i];
                const following = current[(i + 1) % current.length];
                const ax = point.x - previous.x;
                const ay = point.y - previous.y;
                const bx = following.x - point.x;
                const by = following.y - point.y;
                const aLength = Math.sqrt(ax * ax + ay * ay);
                const bLength = Math.sqrt(bx * bx + by * by);
                let turn = 0;
                if (aLength > 0.000001 && bLength > 0.000001) {
                    const dot = Math.max(-1, Math.min(1,
                        (ax * bx + ay * by) / (aLength * bLength)));
                    turn = (1 - dot) * 0.5;
                }
                const localStrength =
                    clampedStrength *
                    (1 - turn * clampedCornerPreservation);
                next[i] = {
                    x: point.x + (((previous.x + following.x) * 0.5) - point.x) * localStrength,
                    y: point.y + (((previous.y + following.y) * 0.5) - point.y) * localStrength,
                };
            }
            current = next;
        }
        return current;
    }

    private deform(
        points: readonly ScalarFieldPoint[],
        options: NonNullable<WetGroundContourOptions["lobeDeformation"]>,
    ): ScalarFieldPoint[] {
        let cx = 0;
        let cy = 0;
        for (let i = 0; i < points.length; i += 1) {
            cx += points[i].x;
            cy += points[i].y;
        }
        cx /= points.length;
        cy /= points.length;

        let averageRadius = 0;
        for (let i = 0; i < points.length; i += 1) {
            averageRadius += Math.hypot(points[i].x - cx, points[i].y - cy);
        }
        averageRadius /= points.length;
        if (averageRadius <= 0.000001) return points.slice();

        const sizeScale = Math.max(0.10, Math.min(1, averageRadius / 64));
        const primaryAmplitude = Math.min(
            options.primaryAmplitudeWorldUnits * sizeScale,
            averageRadius * 0.075,
        );
        const secondaryAmplitude = Math.min(
            options.secondaryAmplitudeWorldUnits * sizeScale,
            averageRadius * 0.025,
        );
        const lobes = Math.max(3, Math.min(7, Math.round(options.primaryLobeCount)));
        const phase = cx * 0.011 + cy * 0.008 + options.seedOffset;
        const secondaryPhase = cx * 0.006 - cy * 0.009 + options.seedOffset * 1.61;
        const result: ScalarFieldPoint[] = new Array(points.length);

        for (let i = 0; i < points.length; i += 1) {
            const dx = points[i].x - cx;
            const dy = points[i].y - cy;
            const radius = Math.hypot(dx, dy);
            if (radius <= 0.000001) {
                result[i] = points[i];
                continue;
            }
            const angle = Math.atan2(dy, dx);
            const displacement =
                Math.sin(angle * lobes + phase) * primaryAmplitude +
                Math.sin(angle * Math.max(2, lobes - 1) + secondaryPhase) *
                    secondaryAmplitude;
            result[i] = {
                x: points[i].x + dx / radius * displacement,
                y: points[i].y + dy / radius * displacement,
            };
        }
        return result;
    }

    private area(points: readonly ScalarFieldPoint[]): number {
        if (points.length < 3) return 0;
        let result = 0;
        for (let i = 0; i < points.length; i += 1) {
            const next = (i + 1) % points.length;
            result += points[i].x * points[next].y -
                points[next].x * points[i].y;
        }
        return result * 0.5;
    }
}
