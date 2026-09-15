import type {
    AirborneWaterCollisionHit,
    AirborneWaterObstacleShape,
    CircleAirborneWaterObstacleShape,
    RectangleAirborneWaterObstacleShape,
    OrientedRectangleAirborneWaterObstacleShape,
} from "./AirborneWaterObstacleShape";

/**
 * Continuous swept-collision query layer for airborne Water.
 *
 * Ground Water uses WaterObstacleField's 8 px raster. Airborne Water instead
 * needs continuous segment tests so fast Hose/Sprinkler packets cannot tunnel
 * through thin static obstacles between fixed simulation steps.
 */
export class AirborneWaterCollisionField {
    private readonly shapes:
        AirborneWaterObstacleShape[] = [];

    public clear(): void {
        this.shapes.length = 0;
    }

    public addShape(
        shape: AirborneWaterObstacleShape,
    ): void {
        this.validateShape(shape);
        this.shapes.push(shape);
    }

    public addRectangle(
        centerX: number,
        centerY: number,
        width: number,
        height: number,
        colliderId?: string,
        ownerSourceIds?: readonly string[],
    ): void {
        this.addShape({
            kind: "rectangle",
            centerX,
            centerY,
            width,
            height,
            colliderId,
            ownerSourceIds,
        });
    }

    public addCircle(
        centerX: number,
        centerY: number,
        radius: number,
        colliderId?: string,
        ownerSourceIds?: readonly string[],
    ): void {
        this.addShape({
            kind: "circle",
            centerX,
            centerY,
            radius,
            colliderId,
            ownerSourceIds,
        });
    }

    public getShapeCount(): number {
        return this.shapes.length;
    }

    /**
     * Returns the first obstacle hit by the swept ground-plane segment.
     */
    public sweep(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        ignoredSourceId?: string,
    ): AirborneWaterCollisionHit | null {
        if (
            !Number.isFinite(startX) ||
            !Number.isFinite(startY) ||
            !Number.isFinite(endX) ||
            !Number.isFinite(endY)
        ) {
            return null;
        }

        let nearest:
            AirborneWaterCollisionHit | null =
            null;

        for (const shape of this.shapes) {
            if (
                ignoredSourceId &&
                shape.ownerSourceIds?.includes(ignoredSourceId)
            ) {
                continue;
            }

            let hit: AirborneWaterCollisionHit | null;

            if (shape.kind === "rectangle") {
                hit = this.sweepRectangle(
                    startX, startY, endX, endY, shape,
                );
            } else if (shape.kind === "orientedRectangle") {
                hit = this.sweepOrientedRectangle(
                    startX, startY, endX, endY, shape,
                );
            } else {
                hit = this.sweepCircle(
                    startX, startY, endX, endY, shape,
                );
            }

            if (
                hit &&
                (
                    !nearest ||
                    hit.fraction <
                    nearest.fraction
                )
            ) {
                nearest = hit;
            }
        }

        return nearest;
    }


    /**
     * Returns a point displaced away from the hit surface.
     *
     * Phase 8D-6 uses this to seed standing Water on the approach side of a
     * solid instead of depositing directly on the collision boundary.
     */
    public getExteriorPoint(
        hit: AirborneWaterCollisionHit,
        clearance: number,
    ): {
        readonly x: number;
        readonly y: number;
    } {
        const safeClearance =
            Number.isFinite(clearance)
                ? Math.max(0, clearance)
                : 0;

        return {
            x:
                hit.positionX +
                hit.normalX *
                safeClearance,
            y:
                hit.positionY +
                hit.normalY *
                safeClearance,
        };
    }

    private sweepRectangle(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        rectangle: RectangleAirborneWaterObstacleShape,
    ): AirborneWaterCollisionHit | null {
        const halfWidth =
            rectangle.width * 0.5;
        const halfHeight =
            rectangle.height * 0.5;

        const minimumX =
            rectangle.centerX - halfWidth;
        const maximumX =
            rectangle.centerX + halfWidth;
        const minimumY =
            rectangle.centerY - halfHeight;
        const maximumY =
            rectangle.centerY + halfHeight;

        const dx = endX - startX;
        const dy = endY - startY;

        let entry = 0;
        let exit = 1;
        let normalX = 0;
        let normalY = 0;

        const testAxis = (
            start: number,
            delta: number,
            minimum: number,
            maximum: number,
            nearNormalX: number,
            nearNormalY: number,
        ): boolean => {
            if (Math.abs(delta) < 1e-12) {
                return (
                    start >= minimum &&
                    start <= maximum
                );
            }

            let near =
                (minimum - start) / delta;
            let far =
                (maximum - start) / delta;

            let candidateNormalX =
                nearNormalX;
            let candidateNormalY =
                nearNormalY;

            if (near > far) {
                const temporary = near;
                near = far;
                far = temporary;
                candidateNormalX *= -1;
                candidateNormalY *= -1;
            }

            if (near > entry) {
                entry = near;
                normalX = candidateNormalX;
                normalY = candidateNormalY;
            }

            exit =
                Math.min(
                    exit,
                    far,
                );

            return entry <= exit;
        };

        if (
            !testAxis(
                startX,
                dx,
                minimumX,
                maximumX,
                -1,
                0,
            ) ||
            !testAxis(
                startY,
                dy,
                minimumY,
                maximumY,
                0,
                -1,
            ) ||
            entry < 0 ||
            entry > 1
        ) {
            return null;
        }

        return {
            positionX:
                startX + dx * entry,
            positionY:
                startY + dy * entry,
            normalX,
            normalY,
            fraction: entry,
            colliderId: rectangle.colliderId,
        };
    }

    private sweepOrientedRectangle(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        rectangle: OrientedRectangleAirborneWaterObstacleShape,
    ): AirborneWaterCollisionHit | null {
        const cosine = Math.cos(rectangle.rotationRadians);
        const sine = Math.sin(rectangle.rotationRadians);

        const toLocal = (x: number, y: number): { x: number; y: number } => {
            const dx = x - rectangle.centerX;
            const dy = y - rectangle.centerY;
            return {
                x: dx * cosine + dy * sine,
                y: -dx * sine + dy * cosine,
            };
        };

        const localStart = toLocal(startX, startY);
        const localEnd = toLocal(endX, endY);
        const localHit = this.sweepRectangle(
            localStart.x,
            localStart.y,
            localEnd.x,
            localEnd.y,
            {
                kind: "rectangle",
                centerX: 0,
                centerY: 0,
                width: rectangle.width,
                height: rectangle.height,
            },
        );

        if (!localHit) {
            return null;
        }

        return {
            positionX:
                rectangle.centerX +
                localHit.positionX * cosine -
                localHit.positionY * sine,
            positionY:
                rectangle.centerY +
                localHit.positionX * sine +
                localHit.positionY * cosine,
            normalX:
                localHit.normalX * cosine -
                localHit.normalY * sine,
            normalY:
                localHit.normalX * sine +
                localHit.normalY * cosine,
            fraction: localHit.fraction,
            colliderId: rectangle.colliderId,
        };
    }

    private sweepCircle(
        startX: number,
        startY: number,
        endX: number,
        endY: number,
        circle: CircleAirborneWaterObstacleShape,
    ): AirborneWaterCollisionHit | null {
        const dx = endX - startX;
        const dy = endY - startY;

        const offsetX =
            startX - circle.centerX;
        const offsetY =
            startY - circle.centerY;

        const a =
            dx * dx +
            dy * dy;

        const radiusSquared =
            circle.radius *
            circle.radius;

        if (
            offsetX * offsetX +
            offsetY * offsetY <=
            radiusSquared
        ) {
            const length =
                Math.hypot(
                    offsetX,
                    offsetY,
                );

            return {
                positionX: startX,
                positionY: startY,
                normalX:
                    length > 1e-12
                        ? offsetX / length
                        : 0,
                normalY:
                    length > 1e-12
                        ? offsetY / length
                        : 0,
                fraction: 0,
                colliderId: circle.colliderId,
            };
        }

        if (a < 1e-12) {
            return null;
        }

        const b =
            2 *
            (
                offsetX * dx +
                offsetY * dy
            );

        const c =
            offsetX * offsetX +
            offsetY * offsetY -
            radiusSquared;

        const discriminant =
            b * b -
            4 * a * c;

        if (discriminant < 0) {
            return null;
        }

        const root =
            Math.sqrt(discriminant);

        const t =
            (
                -b - root
            ) /
            (2 * a);

        if (
            t < 0 ||
            t > 1
        ) {
            return null;
        }

        const positionX =
            startX + dx * t;
        const positionY =
            startY + dy * t;

        const normalLength =
            Math.hypot(
                positionX -
                circle.centerX,
                positionY -
                circle.centerY,
            );

        return {
            positionX,
            positionY,
            normalX:
                normalLength > 1e-12
                    ? (
                        positionX -
                        circle.centerX
                    ) /
                    normalLength
                    : 0,
            normalY:
                normalLength > 1e-12
                    ? (
                        positionY -
                        circle.centerY
                    ) /
                    normalLength
                    : 0,
            fraction: t,
            colliderId: circle.colliderId,
        };
    }

    private validateShape(
        shape: AirborneWaterObstacleShape,
    ): void {
        if (!Number.isFinite(shape.centerX) || !Number.isFinite(shape.centerY)) {
            throw new Error("AirborneWaterCollisionField shape position must be finite.");
        }

        if (shape.kind === "rectangle" || shape.kind === "orientedRectangle") {
            if (
                !Number.isFinite(shape.width) ||
                !Number.isFinite(shape.height) ||
                shape.width <= 0 ||
                shape.height <= 0 ||
                (shape.kind === "orientedRectangle" && !Number.isFinite(shape.rotationRadians))
            ) {
                throw new Error(
                    "AirborneWaterCollisionField rectangle dimensions/rotation must be finite and dimensions positive.",
                );
            }
            return;
        }

        if (!Number.isFinite(shape.radius) || shape.radius <= 0) {
            throw new Error(
                "AirborneWaterCollisionField circle radius must be finite and positive.",
            );
        }
    }
}
