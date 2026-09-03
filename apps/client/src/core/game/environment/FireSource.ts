import {
    FireSourceType,
    validateFireSourceDefinition,
} from "../config/FireSourceDefinition";

import type {
    FireSourceDefinition,
} from "../config/FireSourceDefinition";

/**
 * Mutable runtime state for one authored Fire source.
 */
export class FireSource {
    private enabled: boolean;
    private positionX: number;
    private positionY: number;
    private directionRadians: number;
    private age = 0;
    private pointEmissionConsumed = false;

    constructor(
        private readonly definition: FireSourceDefinition,
    ) {
        validateFireSourceDefinition(definition);

        this.enabled = definition.enabled;
        this.positionX = definition.positionX;
        this.positionY = definition.positionY;

        this.directionRadians =
            definition.type === FireSourceType.Directional
                ? definition.directionRadians
                : 0;
    }

    public update(deltaTime: number): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) {
            return;
        }

        this.age += deltaTime;
    }

    public getDefinition(): FireSourceDefinition {
        return this.definition;
    }

    public getId(): string {
        return this.definition.id;
    }

    public getType(): FireSourceType {
        return this.definition.type;
    }

    public isEnabled(): boolean {
        return this.enabled;
    }

    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    public getPositionX(): number {
        return this.positionX;
    }

    public getPositionY(): number {
        return this.positionY;
    }

    public setPosition(positionX: number, positionY: number): void {
        if (!Number.isFinite(positionX) || !Number.isFinite(positionY)) {
            return;
        }

        this.positionX = positionX;
        this.positionY = positionY;
    }

    public getDirectionRadians(): number {
        return this.directionRadians;
    }

    public setDirectionRadians(directionRadians: number): void {
        if (!Number.isFinite(directionRadians)) {
            return;
        }

        this.directionRadians = directionRadians;
    }

    public getAge(): number {
        return this.age;
    }

    public hasConsumedPointEmission(): boolean {
        return this.pointEmissionConsumed;
    }

    public markPointEmissionConsumed(): void {
        this.pointEmissionConsumed = true;
    }

    public resetRuntimeState(): void {
        this.enabled = this.definition.enabled;
        this.positionX = this.definition.positionX;
        this.positionY = this.definition.positionY;
        this.directionRadians =
            this.definition.type === FireSourceType.Directional
                ? this.definition.directionRadians
                : 0;

        this.age = 0;
        this.pointEmissionConsumed = false;
    }
}
