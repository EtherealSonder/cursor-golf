import { Point } from "pixi.js";

export class InputManager {
    private readonly mousePosition = new Point();

    private mouseDown = false;
    private mousePressed = false;
    private mouseReleased = false;

    constructor(target: HTMLElement) {
        target.addEventListener("mousemove", this.onMouseMove);
        target.addEventListener("mousedown", this.onMouseDown);
        window.addEventListener("mouseup", this.onMouseUp);
    }

    public update(): void {
        this.mousePressed = false;
        this.mouseReleased = false;
    }

    public destroy(target: HTMLElement): void {
        target.removeEventListener("mousemove", this.onMouseMove);
        target.removeEventListener("mousedown", this.onMouseDown);
        window.removeEventListener("mouseup", this.onMouseUp);
    }

    public getMousePosition(): Point {
        return this.mousePosition;
    }

    public getMouseX(): number {
        return this.mousePosition.x;
    }

    public getMouseY(): number {
        return this.mousePosition.y;
    }

    public isMouseDown(): boolean {
        return this.mouseDown;
    }

    public wasMousePressed(): boolean {
        return this.mousePressed;
    }

    public wasMouseReleased(): boolean {
        return this.mouseReleased;
    }

    private onMouseMove = (event: MouseEvent): void => {
        const target = event.currentTarget as HTMLElement;

        const rect = target.getBoundingClientRect();

        this.mousePosition.set(
            event.clientX - rect.left,
            event.clientY - rect.top,
        );

        console.log(this.getMouseX(), this.getMouseY());
    };

    private onMouseDown = (): void => {
        if (!this.mouseDown) {
            this.mousePressed = true;
        }
        console.log("Mouse Down");
        this.mouseDown = true;
    };

    private onMouseUp = (): void => {
        if (this.mouseDown) {
            this.mouseReleased = true;
        }

        this.mouseDown = false;
    };
}