import { Point } from "pixi.js";

import {
    DEFAULT_GAME_VIEWPORT_DEFINITION,
} from "../game/config/GameViewportDefinition";

import type {
    GameViewportDefinition,
} from "../game/config/GameViewportDefinition";

export class InputManager {

    private readonly mousePosition =
        new Point();

    // -------------------------------------------------------
    // Left Mouse Button
    // -------------------------------------------------------

    private leftMouseDown = false;

    private leftMousePressed = false;

    private leftMouseReleased = false;

    // -------------------------------------------------------
    // Right Mouse Button
    // -------------------------------------------------------

    private rightMouseDown = false;

    private rightMousePressed = false;

    private rightMouseReleased = false;

    // -------------------------------------------------------
    // Target and Coordinate Space
    // -------------------------------------------------------

    private readonly target:
        HTMLElement;

    private readonly viewportDefinition:
        GameViewportDefinition;

    constructor(
        target: HTMLElement,
        viewportDefinition:
            GameViewportDefinition =
            DEFAULT_GAME_VIEWPORT_DEFINITION,
    ) {
        this.target = target;
        this.viewportDefinition =
            viewportDefinition;

        this.target.addEventListener(
            "mousemove",
            this.onMouseMove,
        );

        this.target.addEventListener(
            "mousedown",
            this.onMouseDown,
        );

        this.target.addEventListener(
            "contextmenu",
            this.onContextMenu,
        );

        window.addEventListener(
            "mouseup",
            this.onMouseUp,
        );
    }

    // -------------------------------------------------------
    // Frame Lifecycle
    // -------------------------------------------------------

    /**
     * Clears one-frame input flags.
     *
     * Continuous button states remain active until
     * the corresponding mouse button is released.
     */
    public update(): void {

        this.leftMousePressed = false;
        this.leftMouseReleased = false;

        this.rightMousePressed = false;
        this.rightMouseReleased = false;
    }

    public destroy(
        target: HTMLElement,
    ): void {

        target.removeEventListener(
            "mousemove",
            this.onMouseMove,
        );

        target.removeEventListener(
            "mousedown",
            this.onMouseDown,
        );

        target.removeEventListener(
            "contextmenu",
            this.onContextMenu,
        );

        window.removeEventListener(
            "mouseup",
            this.onMouseUp,
        );
    }

    // -------------------------------------------------------
    // Mouse Position
    // -------------------------------------------------------

    public getMousePosition():
        Point {

        return this.mousePosition;
    }

    public getMouseX(): number {
        return this.mousePosition.x;
    }

    public getMouseY(): number {
        return this.mousePosition.y;
    }

    // -------------------------------------------------------
    // Left Mouse Queries
    // -------------------------------------------------------

    public isLeftMouseDown(): boolean {
        return this.leftMouseDown;
    }

    public wasLeftMousePressed(): boolean {
        return this.leftMousePressed;
    }

    public wasLeftMouseReleased(): boolean {
        return this.leftMouseReleased;
    }

    // -------------------------------------------------------
    // Right Mouse Queries
    // -------------------------------------------------------

    public isRightMouseDown(): boolean {
        return this.rightMouseDown;
    }

    public wasRightMousePressed(): boolean {
        return this.rightMousePressed;
    }

    public wasRightMouseReleased(): boolean {
        return this.rightMouseReleased;
    }

    // -------------------------------------------------------
    // Temporary Compatibility Methods
    // -------------------------------------------------------

    /**
     * Compatibility method for systems that still
     * expect the original generic mouse API.
     *
     * Generic shot input now refers only to the
     * primary left mouse button.
     */
    public isMouseDown(): boolean {
        return this.isLeftMouseDown();
    }

    public wasMousePressed(): boolean {
        return this.wasLeftMousePressed();
    }

    public wasMouseReleased(): boolean {
        return this.wasLeftMouseReleased();
    }

    // -------------------------------------------------------
    // Browser Events
    // -------------------------------------------------------

    private onMouseMove = (
        event: MouseEvent,
    ): void => {

        this.updateMousePositionFromEvent(
            event,
        );
    };

    private onMouseDown = (
        event: MouseEvent,
    ): void => {

        this.updateMousePositionFromEvent(
            event,
        );

        switch (event.button) {

            /*
             * Primary left mouse button.
             */
            case 0:
                if (!this.leftMouseDown) {
                    this.leftMousePressed =
                        true;
                }

                this.leftMouseDown =
                    true;

                break;

            /*
             * Secondary right mouse button.
             */
            case 2:
                event.preventDefault();

                if (!this.rightMouseDown) {
                    this.rightMousePressed =
                        true;
                }

                this.rightMouseDown =
                    true;

                break;
        }
    };

    private onMouseUp = (
        event: MouseEvent,
    ): void => {

        switch (event.button) {

            case 0:
                if (this.leftMouseDown) {
                    this.leftMouseReleased =
                        true;
                }

                this.leftMouseDown =
                    false;

                break;

            case 2:
                event.preventDefault();

                if (this.rightMouseDown) {
                    this.rightMouseReleased =
                        true;
                }

                this.rightMouseDown =
                    false;

                break;
        }
    };

    /**
     * Prevents the browser context menu from
     * opening over the game canvas.
     */
    private onContextMenu = (
        event: MouseEvent,
    ): void => {

        event.preventDefault();
    };

    /**
     * Converts browser CSS coordinates into the
     * shared logical 1200 × 720 gameplay space.
     *
     * The Pixi canvas can be displayed at any CSS
     * size while gameplay input remains aligned
     * with world positions.
     */
    private updateMousePositionFromEvent(
        event: MouseEvent,
    ): void {

        const coordinateElement =
            this.getCoordinateElement();

        const rect =
            coordinateElement
                .getBoundingClientRect();

        if (
            rect.width <= 0 ||
            rect.height <= 0
        ) {
            return;
        }

        const displayedX =
            event.clientX -
            rect.left;

        const displayedY =
            event.clientY -
            rect.top;

        const logicalX =
            displayedX *
            (
                this.viewportDefinition
                    .width /
                rect.width
            );

        const logicalY =
            displayedY *
            (
                this.viewportDefinition
                    .height /
                rect.height
            );

        this.mousePosition.set(
            Math.max(
                0,
                Math.min(
                    logicalX,
                    this.viewportDefinition
                        .width,
                ),
            ),

            Math.max(
                0,
                Math.min(
                    logicalY,
                    this.viewportDefinition
                        .height,
                ),
            ),
        );
    }

    /**
     * Uses the actual canvas rectangle whenever it
     * exists. Falling back to the host element keeps
     * initialization safe before Renderer appends
     * the canvas.
     */
    private getCoordinateElement():
        HTMLElement {

        const canvas =
            this.target.querySelector(
                "canvas",
            );

        return canvas ?? this.target;
    }
}
