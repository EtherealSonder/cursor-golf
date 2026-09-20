import { Container, Sprite, Texture } from "pixi.js";
import { TOP_DOWN_FIRE_VFX_DEFINITION } from "../config/TopDownFireVfxDefinition";
import type { FireManager } from "../environment/FireManager";
import type { FireCell } from "../environment/FireCell";
import { DirectionalFirePresentationRegion } from "./DirectionalFirePresentationRegion";
import type { TopDownFireVfxTextures } from "./FireVfxTextureFactory";

type GeometryRole = "primary" | "secondary" | "fragment";

interface Element {
    readonly sprite: Sprite;
    active: boolean;
    ownerKey: string;
    role: GeometryRole;
    age: number;
    lifetime: number;
    baseScale: number;
    phase: number;
    breathingAmplitude: number;
    breathingFrequency: number;
}

/**
 * F-6D presentation-only hierarchical top-down Ground Fire geometry.
 *
 * Authoritative Fire remains entirely inside FireManager. This renderer only
 * consumes active Fire cells and composes them into a continuous visual field.
 */
export class TopDownGroundFireRenderer {
    private readonly container = new Container();
    private readonly elements: Element[] = [];

    public constructor(
        private readonly fireManager: FireManager,
        private readonly textures: TopDownFireVfxTextures,
        private readonly directionalRegion: DirectionalFirePresentationRegion,
    ) {}

    public getContainer(): Container {
        return this.container;
    }

    public update(deltaTime: number): void {
        const d = TOP_DOWN_FIRE_VFX_DEFINITION.groundGeometry;

        if (
            !d.enabled ||
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            return;
        }

        const eligibleCells: FireCell[] = [];
        const eligibleOwnerKeys = new Set<string>();
        const activeGridKeys = new Set<string>();

        for (const cell of this.fireManager.getActiveCells()) {
            if (this.directionalRegion.ownsFireCell(cell)) {
                continue;
            }

            const ownerKey =
                DirectionalFirePresentationRegion.getFireCellKey(cell);

            eligibleCells.push(cell);
            eligibleOwnerKeys.add(ownerKey);
            activeGridKeys.add(this.getGridKey(cell.getGridX(), cell.getGridY()));
        }

        // Remove geometry whose authoritative owner is no longer eligible.
        for (const element of this.elements) {
            if (
                element.active &&
                (
                    !eligibleOwnerKeys.has(element.ownerKey) ||
                    this.directionalRegion.ownsFireCellKey(element.ownerKey)
                )
            ) {
                this.deactivate(element);
            }
        }

        // Build visual hierarchy after stale ownership has been cleared.
        for (const cell of eligibleCells) {
            const ownerKey =
                DirectionalFirePresentationRegion.getFireCellKey(cell);

            const neighbourCount =
                this.countOccupiedNeighbours(cell, activeGridKeys);

            const isBoundary =
                neighbourCount <= d.boundaryNeighbourThreshold;

            this.ensurePrimary(cell, ownerKey);

            if (isBoundary) {
                this.ensureSecondary(cell, ownerKey);
                this.ensureBoundaryFragment(cell, ownerKey);
            } else {
                this.removeRoleForOwner(ownerKey, "secondary");
                this.removeRoleForOwner(ownerKey, "fragment");
            }
        }

        for (const element of this.elements) {
            if (!element.active) {
                continue;
            }

            this.updateElement(element, deltaTime);
        }
    }

    public suppressDirectionalOwnership(): number {
        let count = 0;

        for (const element of this.elements) {
            if (
                element.active &&
                this.directionalRegion.ownsFireCellKey(element.ownerKey)
            ) {
                this.deactivate(element);
                count += 1;
            }
        }

        return count;
    }

    public reset(): void {
        for (const element of this.elements) {
            this.deactivate(element);
        }
    }

    public destroy(): void {
        for (const element of this.elements) {
            element.sprite.destroy({ texture: false });
        }

        this.elements.length = 0;
        this.container.destroy({ children: false });
    }

    public getActiveCount(): number {
        let count = 0;

        for (const element of this.elements) {
            if (element.active) {
                count += 1;
            }
        }

        return count;
    }

    private ensurePrimary(cell: FireCell, ownerKey: string): void {
        if (this.countRole(ownerKey, "primary") > 0) {
            return;
        }

        this.spawn(cell, ownerKey, "primary");
    }

    private ensureSecondary(cell: FireCell, ownerKey: string): void {
        const d = TOP_DOWN_FIRE_VFX_DEFINITION.groundGeometry;

        while (
            this.countRole(ownerKey, "secondary") <
            d.secondaryPerBoundaryCell
        ) {
            if (!this.spawn(cell, ownerKey, "secondary")) {
                return;
            }
        }
    }

    private ensureBoundaryFragment(cell: FireCell, ownerKey: string): void {
        if (this.countRole(ownerKey, "fragment") > 0) {
            return;
        }

        const d = TOP_DOWN_FIRE_VFX_DEFINITION.groundGeometry;

        // Stable owner-key hash prevents every frame from rolling a fresh
        // random chance and flooding the boundary with fragments.
        const normalizedHash =
            (this.hashString(ownerKey) & 0xffff) / 0xffff;

        if (normalizedHash <= d.fragmentChancePerBoundaryCell) {
            this.spawn(cell, ownerKey, "fragment");
        }
    }

    private spawn(
        cell: FireCell,
        ownerKey: string,
        role: GeometryRole,
    ): boolean {
        const d = TOP_DOWN_FIRE_VFX_DEFINITION.groundGeometry;

        if (this.getActiveCount() >= d.maximumElements) {
            return false;
        }

        const texture = this.pickTexture(role);

        if (!texture) {
            return false;
        }

        let element =
            this.elements.find(
                (candidate): boolean =>
                    !candidate.active,
            );

        if (!element) {
            if (this.elements.length >= d.maximumElements) {
                return false;
            }

            const sprite = new Sprite(texture);
            sprite.anchor.set(0.5);
            sprite.blendMode = "normal";
            sprite.visible = false;

            this.container.addChild(sprite);

            element = {
                sprite,
                active: false,
                ownerKey: "",
                role: "primary",
                age: 0,
                lifetime: Number.POSITIVE_INFINITY,
                baseScale: 1,
                phase: 0,
                breathingAmplitude: 0,
                breathingFrequency: 0,
            };

            this.elements.push(element);
        }

        const cellSize =
            Math.max(
                1,
                this.fireManager.getDefinition().cellSize,
            );

        const jitterRadius =
            role === "primary"
                ? d.primaryJitterCellRadius
                : role === "secondary"
                    ? d.secondaryJitterCellRadius
                    : d.fragmentJitterCellRadius;

        const angle = Math.random() * Math.PI * 2;
        const radius =
            Math.sqrt(Math.random()) *
            cellSize *
            jitterRadius;

        const baseScale =
            role === "primary"
                ? this.range(
                    d.primaryScaleMinimum,
                    d.primaryScaleMaximum,
                )
                : role === "secondary"
                    ? this.range(
                        d.secondaryScaleMinimum,
                        d.secondaryScaleMaximum,
                    )
                    : this.range(
                        d.fragmentScaleMinimum,
                        d.fragmentScaleMaximum,
                    );

        element.active = true;
        element.ownerKey = ownerKey;
        element.role = role;
        element.age = 0;
        element.baseScale = baseScale;
        element.phase = Math.random() * Math.PI * 2;

        if (role === "primary") {
            element.lifetime = Number.POSITIVE_INFINITY;
            element.breathingAmplitude = d.primaryBreathingAmplitude;
            element.breathingFrequency = this.range(
                d.primaryBreathingFrequencyMinimum,
                d.primaryBreathingFrequencyMaximum,
            );
        } else if (role === "secondary") {
            element.lifetime = this.range(
                d.secondaryLifetimeMinimum,
                d.secondaryLifetimeMaximum,
            );
            element.breathingAmplitude = d.secondaryBreathingAmplitude;
            element.breathingFrequency = this.range(
                d.secondaryBreathingFrequencyMinimum,
                d.secondaryBreathingFrequencyMaximum,
            );
        } else {
            element.lifetime = this.range(
                d.fragmentLifetimeMinimum,
                d.fragmentLifetimeMaximum,
            );
            element.breathingAmplitude = 0;
            element.breathingFrequency = 0;
        }

        element.sprite.texture = texture;
        element.sprite.position.set(
            cell.getWorldCenterX() + Math.cos(angle) * radius,
            cell.getWorldCenterY() + Math.sin(angle) * radius,
        );
        element.sprite.rotation = this.range(
            d.rotationMinimum,
            d.rotationMaximum,
        );
        element.sprite.tint = this.pickTint(role);

        const initialScale =
            role === "primary"
                ? baseScale * d.primarySpawnScaleFraction
                : baseScale * 0.78;

        element.sprite.scale.set(initialScale);
        element.sprite.alpha =
            this.getMaximumAlpha(role) *
            (role === "fragment" ? 0.70 : 0.82);
        element.sprite.visible = true;

        return true;
    }

    private updateElement(element: Element, deltaTime: number): void {
        const d = TOP_DOWN_FIRE_VFX_DEFINITION.groundGeometry;

        element.age += deltaTime;

        if (
            Number.isFinite(element.lifetime) &&
            element.age >= element.lifetime
        ) {
            this.deactivate(element);
            return;
        }

        if (element.role === "primary") {
            const settle =
                this.smooth(
                    Math.min(
                        1,
                        element.age / d.primarySettleSeconds,
                    ),
                );

            const settledScale =
                element.baseScale *
                (
                    d.primarySpawnScaleFraction +
                    (1 - d.primarySpawnScaleFraction) * settle
                );

            const breathing =
                1 +
                Math.sin(
                    element.phase +
                    element.age *
                    element.breathingFrequency *
                    Math.PI *
                    2,
                ) *
                element.breathingAmplitude;

            element.sprite.scale.set(
                settledScale * breathing,
            );

            element.sprite.alpha =
                d.primaryMaximumAlpha *
                (0.82 + 0.18 * settle);

            return;
        }

        const normalizedAge =
            Math.max(
                0,
                Math.min(
                    1,
                    element.age / element.lifetime,
                ),
            );

        const emergence =
            this.smooth(
                Math.min(
                    1,
                    normalizedAge / 0.12,
                ),
            );

        const fade =
            normalizedAge <= 0.78
                ? 1
                : 1 -
                    this.smooth(
                        (normalizedAge - 0.78) / 0.22,
                    );

        const breathing =
            element.role === "secondary"
                ? 1 +
                    Math.sin(
                        element.phase +
                        element.age *
                        element.breathingFrequency *
                        Math.PI *
                        2,
                    ) *
                    element.breathingAmplitude
                : 1;

        const emergenceScale =
            0.78 + 0.22 * emergence;

        element.sprite.scale.set(
            element.baseScale *
            emergenceScale *
            breathing,
        );

        element.sprite.alpha =
            this.getMaximumAlpha(element.role) *
            (0.70 + 0.30 * emergence) *
            fade;

        // No continuous whole-sprite rotation and no translation.
        // Random initial orientation supplies local variation without making
        // the top-down combustion field read as swirling leaves.
    }

    private countOccupiedNeighbours(
        cell: FireCell,
        activeGridKeys: ReadonlySet<string>,
    ): number {
        let count = 0;

        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
            for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
                if (offsetX === 0 && offsetY === 0) {
                    continue;
                }

                if (
                    activeGridKeys.has(
                        this.getGridKey(
                            cell.getGridX() + offsetX,
                            cell.getGridY() + offsetY,
                        ),
                    )
                ) {
                    count += 1;
                }
            }
        }

        return count;
    }

    private countRole(
        ownerKey: string,
        role: GeometryRole,
    ): number {
        let count = 0;

        for (const element of this.elements) {
            if (
                element.active &&
                element.ownerKey === ownerKey &&
                element.role === role
            ) {
                count += 1;
            }
        }

        return count;
    }

    private removeRoleForOwner(
        ownerKey: string,
        role: GeometryRole,
    ): void {
        for (const element of this.elements) {
            if (
                element.active &&
                element.ownerKey === ownerKey &&
                element.role === role
            ) {
                this.deactivate(element);
            }
        }
    }

    private deactivate(element: Element): void {
        element.active = false;
        element.ownerKey = "";
        element.age = 0;
        element.sprite.visible = false;
        element.sprite.alpha = 0;
        element.sprite.scale.set(0.001);
    }

    private pickTexture(role: GeometryRole): Texture | null {
        const pool =
            role === "primary"
                ? this.textures.lobes
                : role === "secondary"
                    ? [...this.textures.lobes, ...this.textures.curls]
                    : this.textures.fragments;

        if (pool.length === 0) {
            return null;
        }

        return pool[
            Math.floor(
                Math.random() * pool.length,
            )
        ] ?? null;
    }

    private pickTint(role: GeometryRole): number {
        const d = TOP_DOWN_FIRE_VFX_DEFINITION.groundGeometry;

        const palette =
            role === "primary"
                ? d.primaryPrototypeTints
                : role === "secondary"
                    ? d.secondaryPrototypeTints
                    : d.fragmentPrototypeTints;

        return palette[
            Math.floor(
                Math.random() * palette.length,
            )
        ];
    }

    private getMaximumAlpha(role: GeometryRole): number {
        const d = TOP_DOWN_FIRE_VFX_DEFINITION.groundGeometry;

        if (role === "primary") {
            return d.primaryMaximumAlpha;
        }

        if (role === "secondary") {
            return d.secondaryMaximumAlpha;
        }

        return d.fragmentMaximumAlpha;
    }

    private getGridKey(gridX: number, gridY: number): string {
        return `${gridX}:${gridY}`;
    }

    private hashString(value: string): number {
        let hash = 2166136261;

        for (let index = 0; index < value.length; index += 1) {
            hash ^= value.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }

        return hash >>> 0;
    }

    private range(minimum: number, maximum: number): number {
        return maximum <= minimum
            ? minimum
            : minimum + Math.random() * (maximum - minimum);
    }

    private smooth(value: number): number {
        const t = Math.max(0, Math.min(1, value));
        return t * t * (3 - 2 * t);
    }
}
