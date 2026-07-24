import { Container, Point } from "pixi.js";

export abstract class Entity {
    private static nextId = 0;

    public readonly id: number;

    protected readonly container: Container;

    private initialized = false;
    private destroyed = false;

    constructor() {
        this.id = Entity.nextId++;

        this.container = new Container();
    }

    public getContainer(): Container {
        return this.container;
    }

    // -------------------------------------------------------------------------
    // Transform
    // -------------------------------------------------------------------------

    public setPosition(x: number, y: number): void {
        this.container.position.set(x, y);
    }

    public getPosition(): Point {
        return this.container.position;
    }

    public getX(): number {
        return this.container.position.x;
    }

    public getY(): number {
        return this.container.position.y;
    }

    public setX(x: number): void {
        this.container.position.x = x;
    }

    public setY(y: number): void {
        this.container.position.y = y;
    }

    public translate(deltaX: number, deltaY: number): void {
        this.container.position.x += deltaX;
        this.container.position.y += deltaY;
    }

    public setVisible(visible: boolean): void {
        this.container.visible = visible;
    }

    public isVisible(): boolean {
        return this.container.visible;
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    public isInitialized(): boolean {
        return this.initialized;
    }

    public isDestroyed(): boolean {
        return this.destroyed;
    }

    public initialize(): void {
        if (this.initialized) {
            return;
        }

        this.onInitialize();

        this.initialized = true;
    }

    public update(deltaTime: number): void {
        if (!this.initialized || this.destroyed) {
            return;
        }

        this.onUpdate(deltaTime);
    }

    public destroy(): void {
        if (this.destroyed) {
            return;
        }

        this.onDestroy();

        this.destroyed = true;
    }

    protected abstract onInitialize(): void;

    protected abstract onUpdate(deltaTime: number): void;

    protected abstract onDestroy(): void;
}