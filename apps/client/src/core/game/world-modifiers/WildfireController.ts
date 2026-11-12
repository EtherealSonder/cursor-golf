import type { GeneratedCourseGeometry } from "../level/LevelRuntimeDefinition";
import { WildfirePlacementValidator } from "./WildfirePlacementValidator";
import type { SurfaceSystem } from "../surface/SurfaceSystem";
import type { FireManager } from "../environment/FireManager";
import type { FireSourceSystem } from "../environment/FireSourceSystem";
import { FireSourceType } from "../config/FireSourceDefinition";
import { WorldModifierRandom } from "./WorldModifierRandom";
import { WILDFIRE_CONFIG } from "./WildfireConfig";

export interface WildfireWarningReservation {
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly ageSeconds: number;
}

type Point = { readonly x: number; readonly y: number };

/** WM-5A: seeded scheduling and course/hole/spawn placement only. Never emits fire. */
export class WildfireController {
    private static nextInstanceId = 1;
    private readonly random: WorldModifierRandom;
    private readonly validator: WildfirePlacementValidator;
    private readonly warnings: WildfireWarningReservation[] = [];
    private readonly ownedSourceIds = new Set<string>();
    private readonly sourcePrefix: string;
    private ballPosition: Point = { x: 0, y: 0 };
    private spawnRadius = 0;
    private elapsedSeconds = 0;
    private nextId = 1;
    private nextWarningAtSeconds = WILDFIRE_CONFIG.ignitionIntervalSeconds - WILDFIRE_CONFIG.warningDurationSeconds;

    public constructor(
        seed: number,
        geometry: GeneratedCourseGeometry,
        hole: Point,
        spawn: Point,
        surfaces: SurfaceSystem,
        fire: FireManager,
        private readonly fireSources: FireSourceSystem,
    ) {
        // Separate stream from modifier selection; do not consume the modifier roller's PRNG.
        this.sourcePrefix = `wildfire-${WildfireController.nextInstanceId++}-`;
        this.random = new WorldModifierRandom((seed ^ 0x57494c44) >>> 0);
        this.validator = new WildfirePlacementValidator(geometry, hole, spawn, surfaces, fire);
    }

    public getWarnings(): readonly WildfireWarningReservation[] { return this.warnings; }

    /** Refresh immediately before scheduling, using the current ball and camera zoom. */
    public setSpawnRegion(ballX: number, ballY: number, visibleWidth: number, visibleHeight: number): void {
        if (![ballX, ballY, visibleWidth, visibleHeight].every(Number.isFinite)) return;
        if (visibleWidth <= 0 || visibleHeight <= 0) return;
        this.ballPosition = { x: ballX, y: ballY };
        this.spawnRadius = Math.hypot(visibleWidth, visibleHeight) * 0.5 * WILDFIRE_CONFIG.ballCenteredSpawnRadiusMultiplier;
    }

    public update(deltaSeconds: number): void {
        if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
        // Advance and retire reservations before scheduling new ones.
        for (let i = this.warnings.length - 1; i >= 0; i--) {
            const warning = this.warnings[i];
            const ageSeconds = warning.ageSeconds + deltaSeconds;
            if (ageSeconds >= WILDFIRE_CONFIG.warningDurationSeconds) {
                this.warnings.splice(i, 1);
                // Recheck the authoritative fire rules after the full telegraph.
                if (this.validator.isValid({ x: warning.x, y: warning.y }, this.warnings)) {
                    const id = `${this.sourcePrefix}${warning.id}`;
                    this.fireSources.addSource({
                        id, type: FireSourceType.Point, enabled: true,
                        positionX: warning.x, positionY: warning.y,
                        radius: Math.max(WILDFIRE_CONFIG.pointFireRadius, WILDFIRE_CONFIG.warningRadius),
                        heatAmount: WILDFIRE_CONFIG.pointFireHeatAmount,
                    });
                    this.ownedSourceIds.add(id);
                }
            }
            else this.warnings[i] = { ...warning, ageSeconds };
        }
        this.elapsedSeconds += deltaSeconds;
        // One scheduled event per configured ignition interval. Avoid unbounded catch-up on large frame deltas.
        let processed = 0;
        while (this.elapsedSeconds >= this.nextWarningAtSeconds && processed < 4) {
            this.scheduleWarning();
            this.nextWarningAtSeconds += WILDFIRE_CONFIG.ignitionIntervalSeconds;
            processed++;
        }
        if (this.elapsedSeconds >= this.nextWarningAtSeconds) {
            const skipped = Math.floor((this.elapsedSeconds - this.nextWarningAtSeconds) / WILDFIRE_CONFIG.ignitionIntervalSeconds) + 1;
            this.nextWarningAtSeconds += skipped * WILDFIRE_CONFIG.ignitionIntervalSeconds;
        }
    }

    /** Call after FireSourceSystem.update so one-shot heat is deposited before removal. */
    public cleanupConsumedSources(): void {
        for (const id of this.ownedSourceIds) {
            const source = this.fireSources.getSourceById(id);
            if (!source || source.hasConsumedPointEmission()) {
                if (source) this.fireSources.removeSource(id);
                this.ownedSourceIds.delete(id);
            }
        }
    }

    /** Stop future warnings; previously registered sources remain until emitted. */
    public stop(): void {
        this.warnings.length = 0;
    }

    private scheduleWarning(): void {
        if (this.warnings.length >= WILDFIRE_CONFIG.maximumActiveWarnings) return;
        if (this.spawnRadius <= 0) return;
        for (let attempt = 0; attempt < WILDFIRE_CONFIG.maximumPlacementAttempts; attempt++) {
            // sqrt(U) samples area uniformly, avoiding clustering near the ball.
            const angle = this.random.next() * Math.PI * 2;
            const distance = Math.sqrt(this.random.next()) * this.spawnRadius;
            const x = this.ballPosition.x + Math.cos(angle) * distance;
            const y = this.ballPosition.y + Math.sin(angle) * distance;
            const candidate = { x, y };
            if (!this.validator.isValid(candidate, this.warnings)) continue;
            this.warnings.push({ id: this.nextId++, x, y, ageSeconds: 0 });
            return;
        }
        // No valid candidate in the bounded budget: skip the event safely.
    }
}
