import { Graphics, Sprite, Text } from 'pixi.js';
import { AssetLoader } from '../../../rendering/AssetLoader';
import { PROXIMITY_MINE_EXPLOSION_DEFINITION as EXPLOSION, type ProximityMineExplosionEvent } from '../../config/ProximityMineExplosionDefinition';
import { Entity } from '../Entity';
import { PROXIMITY_MINE_DEFINITION as D } from '../../config/ProximityMineDefinition';
import { advanceArmingProgress, detectProximityMineTarget, type ProximityMineTarget, type ProximityMineZone } from './ProximityMineDetection';
import { ProximityMineWarningVfx } from './ProximityMineWarningVfx';
export type ProximityMineState = 'IDLE' | 'WARNING' | 'DETONATED';
/** PM-1: proximity warning and non-destructive detonation event. Audio and damage are deferred. */
export class ProximityMine extends Entity {
    private body: Sprite | null = null;
    private readonly led = new Graphics();
    private readonly warningVfx = new ProximityMineWarningVfx();
    private readonly debug = new Text({ text: '', style: { fontSize: 11, fill: 0xffffff,
        stroke: { color: 0x202030, width: 3 }, align: 'center' } });
    private targets: readonly ProximityMineTarget[] = [];
    private state: ProximityMineState = 'IDLE';
    private zone: ProximityMineZone = 'NONE';
    /** Normalized accumulated arming progress, not elapsed wall-clock time. */
    private armingProgress = 0;
    private pulseClock = 0;
    private ledSeconds = 0;
    private detected = 'none';
    private surfaceDistance = Infinity;
    private explodedBy = 'none';
    private detonationPending = false;
    constructor(public readonly mineId: string, x: number, y: number) { super(); this.setPosition(x, y); }
    public setTargets(targets: readonly ProximityMineTarget[]): void { this.targets = targets; }
    public getBodyRadius(): number { return D.bodyRadius; }
    /** Single entry point for all authoritative external impacts. */
    public triggerImmediateDetonation(cause: string): boolean {
        if (this.state === "DETONATED") return false;
        this.detonate(cause);
        return true;
    }
    public getState(): ProximityMineState { return this.state; }
    public consumeDetonation(): ProximityMineExplosionEvent | null {
        if (!this.detonationPending) return null;
        this.detonationPending = false;
        return { mineId: this.mineId, target: this.explodedBy, x: this.getX(), y: this.getY(),
            blastRadius: EXPLOSION.blastRadius, maximumImpulse: EXPLOSION.maximumImpulse,
            maximumAddedSpeed: EXPLOSION.maximumAddedSpeed };
    }
    protected onInitialize(): void {
        this.body = new Sprite(AssetLoader.getTexture('proximityMine'));
        this.body.anchor.set(D.visual.spriteAnchorX, D.visual.spriteAnchorY);
        this.body.width = D.visual.spriteWidth;
        this.body.height = D.visual.spriteHeight;
        this.container.addChild(this.warningVfx.container, this.body, this.led);
        this.debug.anchor.set(0.5, 1);
        this.debug.position.set(0, -D.bodyRadius - 11);
        if (D.debugEnabled) this.container.addChild(this.debug);
        this.drawLed(false);
    }
    private drawLed(on: boolean): void {
        this.led.clear().circle(0, 0, D.visual.ledRadius)
            .fill(on ? D.visual.ledAlertColor : D.visual.ledIdleColor);
    }
    private detonate(target: string): void {
        this.state = 'DETONATED';
        this.explodedBy = target;
        this.detonationPending = true;
        this.warningVfx.emit(D.sonarAlertColor);
        this.ledSeconds = 0;
        this.drawLed(true);
    }
    protected onUpdate(dt: number): void {
        // World already uses its own timestep. Do not discard time during slow frames.
        const delta = Math.max(0, dt);
        if (this.state !== 'DETONATED') {
            const result = detectProximityMineTarget(this.getX(), this.getY(), this.targets,
                D.detectionRadius, D.contactRadius, D.armingRadius);
            this.zone = result.zone;
            this.detected = result.target?.label ?? 'none';
            this.surfaceDistance = result.distanceToSurface;
            if (result.contact && result.target) {
                this.detonate(result.target.label);
            } else {
                this.armingProgress = advanceArmingProgress(this.armingProgress, delta, result.zone,
                    result.armingProximity, D.outerArmingSeconds, D.innerArmingSeconds, D.warningDecayPerSecond);
                this.state = result.target ? 'WARNING' : 'IDLE';
                if (this.armingProgress >= 1 && result.zone === 'ARMING' && result.target) {
                    this.detonate(result.target.label);
                } else {
                    const interval = result.zone === 'NONE' ? D.idleBeepIntervalSeconds
                        : result.zone === 'DETECTED'
                            ? D.idleBeepIntervalSeconds + (D.detectionBeepIntervalSeconds - D.idleBeepIntervalSeconds)
                                * result.detectionProximity
                            : D.detectionBeepIntervalSeconds + (D.minimumBeepIntervalSeconds - D.detectionBeepIntervalSeconds)
                                * result.armingProximity;
                    this.pulseClock += delta;
                    if (this.pulseClock >= interval) {
                        this.pulseClock %= interval;
                        this.ledSeconds = 0.11;
                        this.warningVfx.emit(result.target ? D.sonarAlertColor : D.sonarIdleColor);
                    }
                }
            }
        }
        this.ledSeconds = Math.max(0, this.ledSeconds - delta);
        this.drawLed(this.state === 'DETONATED' || this.ledSeconds > 0);
        this.warningVfx.update(delta);
        if (D.debugEnabled) this.debug.text = `${this.mineId} [${this.state}/${this.zone}]\nDetected: ${this.detected}\nSurface: ${Number.isFinite(this.surfaceDistance) ? this.surfaceDistance.toFixed(0) + 'px' : 'none'}\nArming: ${(this.armingProgress * 100).toFixed(0)}%\nExploded object: ${this.explodedBy}`;
    }
    protected onDestroy(): void { this.container.removeChild(this.warningVfx.container); this.warningVfx.destroy(); this.container.destroy({ children: true }); }
}
