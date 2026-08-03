import {
    Point,
} from "pixi.js";

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

    private leftMouseDown =
        false;

    private leftMousePressed =
        false;

    private leftMouseReleased =
        false;

    // -------------------------------------------------------
    // Right Mouse Button
    // -------------------------------------------------------

    private rightMouseDown =
        false;

    private rightMousePressed =
        false;

    private rightMouseReleased =
        false;

    // -------------------------------------------------------
    // Target and Logical Coordinate Space
    // -------------------------------------------------------

    private readonly target:
        HTMLElement;

    /**
     * Stable logical viewport dimensions.
     *
     * Browser and CSS canvas dimensions may change,
     * but input is always converted back into this
     * coordinate space.
     */
    private viewportWidth:
        number;

    private viewportHeight:
        number;

    private pointerInsideTarget =
        false;

    constructor(
        target:
            HTMLElement,

        viewportDefinition:
            GameViewportDefinition =
            DEFAULT_GAME_VIEWPORT_DEFINITION,
    ) {

        this.target =
            target;

        this.viewportWidth =
            viewportDefinition
                .width;

        this.viewportHeight =
            viewportDefinition
                .height;

        this.validateViewportSize(
            this.viewportWidth,
            this.viewportHeight,
        );

        this.target.addEventListener(
            "mousemove",
            this.onMouseMove,
        );

        this.target.addEventListener(
            "mouseenter",
            this.onMouseEnter,
        );

        this.target.addEventListener(
            "mouseleave",
            this.onMouseLeave,
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
    // Logical Viewport
    // -------------------------------------------------------

    /**
     * Retained for compatibility with the current
     * Game initialization.
     *
     * In fixed-resolution mode this normally receives
     * the same 1200 × 720 values once during startup.
     */
    public setViewportSize(
        viewportWidth:
            number,

        viewportHeight:
            number,
    ): void {

        this.validateViewportSize(
            viewportWidth,
            viewportHeight,
        );

        this.viewportWidth =
            viewportWidth;

        this.viewportHeight =
            viewportHeight;

        this.mousePosition.set(
            this.clamp(
                this.mousePosition.x,
                0,
                this.viewportWidth,
            ),

            this.clamp(
                this.mousePosition.y,
                0,
                this.viewportHeight,
            ),
        );
    }

    public getViewportWidth():
        number {

        return this.viewportWidth;
    }

    public getViewportHeight():
        number {

        return this.viewportHeight;
    }

    // -------------------------------------------------------
    // Frame Lifecycle
    // -------------------------------------------------------

    /**
     * Clears one-frame button flags.
     *
     * Continuous button state remains active until
     * the corresponding mouse button is released.
     */
    public update(): void {

        this.leftMousePressed =
            false;

        this.leftMouseReleased =
            false;

        this.rightMousePressed =
            false;

        this.rightMouseReleased =
            false;
    }

    public destroy(
        target:
            HTMLElement,
    ): void {

        target.removeEventListener(
            "mousemove",
            this.onMouseMove,
        );

        target.removeEventListener(
            "mouseenter",
            this.onMouseEnter,
        );

        target.removeEventListener(
            "mouseleave",
            this.onMouseLeave,
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

        this.pointerInsideTarget =
            false;

        this.leftMouseDown =
            false;

        this.leftMousePressed =
            false;

        this.leftMouseReleased =
            false;

        this.rightMouseDown =
            false;

        this.rightMousePressed =
            false;

        this.rightMouseReleased =
            false;
    }

    // -------------------------------------------------------
    // Mouse Position
    // -------------------------------------------------------

    public getMousePosition():
        Point {

        return this.mousePosition;
    }

    public getMouseX():
        number {

        return this.mousePosition.x;
    }

    public getMouseY():
        number {

        return this.mousePosition.y;
    }

    public isPointerInsideTarget():
        boolean {

        return this.pointerInsideTarget;
    }

    // -------------------------------------------------------
    // Left Mouse Queries
    // -------------------------------------------------------

    public isLeftMouseDown():
        boolean {

        return this.leftMouseDown;
    }

    public wasLeftMousePressed():
        boolean {

        return this.leftMousePressed;
    }

    public wasLeftMouseReleased():
        boolean {

        return this.leftMouseReleased;
    }

    // -------------------------------------------------------
    // Right Mouse Queries
    // -------------------------------------------------------

    public isRightMouseDown():
        boolean {

        return this.rightMouseDown;
    }

    public wasRightMousePressed():
        boolean {

        return this.rightMousePressed;
    }

    public wasRightMouseReleased():
        boolean {

        return this.rightMouseReleased;
    }

    // -------------------------------------------------------
    // Compatibility Queries
    // -------------------------------------------------------

    public isMouseDown():
        boolean {

        return this.isLeftMouseDown();
    }

    public wasMousePressed():
        boolean {

        return this.wasLeftMousePressed();
    }

    public wasMouseReleased():
        boolean {

        return this.wasLeftMouseReleased();
    }

    // -------------------------------------------------------
    // Browser Events
    // -------------------------------------------------------

    private onMouseEnter = (
        event:
            MouseEvent,
    ): void => {

        this.pointerInsideTarget =
            true;

        this.updateMousePositionFromEvent(
            event,
        );
    };

    private onMouseLeave = ():
        void => {

        this.pointerInsideTarget =
            false;
    };

    private onMouseMove = (
        event:
            MouseEvent,
    ): void => {

        this.updateMousePositionFromEvent(
            event,
        );
    };

    private onMouseDown = (
        event:
            MouseEvent,
    ): void => {

        this.updateMousePositionFromEvent(
            event,
        );

        switch (
        event.button
        ) {

            case 0:

                if (
                    !this.leftMouseDown
                ) {
                    this.leftMousePressed =
                        true;
                }

                this.leftMouseDown =
                    true;

                break;

            case 2:

                event.preventDefault();

                if (
                    !this.rightMouseDown
                ) {
                    this.rightMousePressed =
                        true;
                }

                this.rightMouseDown =
                    true;

                break;
        }
    };

    private onMouseUp = (
        event:
            MouseEvent,
    ): void => {

        /*
         * Update the logical release position when the
         * browser releases over or near the game.
         *
         * The coordinate calculation safely clamps to
         * the logical viewport.
         */
        this.updateMousePositionFromEvent(
            event,
        );

        switch (
        event.button
        ) {

            case 0:

                if (
                    this.leftMouseDown
                ) {
                    this.leftMouseReleased =
                        true;
                }

                this.leftMouseDown =
                    false;

                break;

            case 2:

                event.preventDefault();

                if (
                    this.rightMouseDown
                ) {
                    this.rightMouseReleased =
                        true;
                }

                this.rightMouseDown =
                    false;

                break;
        }
    };

    private onContextMenu = (
        event:
            MouseEvent,
    ): void => {

        event.preventDefault();
    };

    // -------------------------------------------------------
    // Browser-to-Logical Coordinate Conversion
    // -------------------------------------------------------

    /**
     * Converts the current CSS-displayed canvas
     * position into the stable logical game space.
     *
     * Example:
     *
     * Displayed canvas:
     * 1500 × 650
     *
     * Logical viewport:
     * 1200 × 720
     *
     * Browser X and Y are scaled independently back
     * into the fixed logical coordinate system.
     */
    private updateMousePositionFromEvent(
        event:
            MouseEvent,
    ): void {

        const coordinateElement =
            this.getCoordinateElement();

        const rect =
            coordinateElement
                .getBoundingClientRect();

        if (
            rect.width <=
            0 ||
            rect.height <=
            0
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
                this.viewportWidth /
                rect.width
            );

        const logicalY =
            displayedY *
            (
                this.viewportHeight /
                rect.height
            );

        this.mousePosition.set(
            this.clamp(
                logicalX,
                0,
                this.viewportWidth,
            ),

            this.clamp(
                logicalY,
                0,
                this.viewportHeight,
            ),
        );
    }

    /**
     * Uses the actual Pixi canvas whenever it exists.
     *
     * Before Renderer initialization, the host game
     * element provides a safe fallback rectangle.
     */
    private getCoordinateElement():
        HTMLElement {

        const canvas =
            this.target.querySelector(
                "canvas",
            );

        return (
            canvas ??
            this.target
        );
    }

    // -------------------------------------------------------
    // Validation and Utilities
    // -------------------------------------------------------

    private validateViewportSize(
        viewportWidth:
            number,

        viewportHeight:
            number,
    ): void {

        if (
            !Number.isFinite(
                viewportWidth,
            ) ||
            !Number.isFinite(
                viewportHeight,
            ) ||
            viewportWidth <=
            0 ||
            viewportHeight <=
            0
        ) {
            throw new Error(
                "InputManager viewport dimensions must be finite values greater than zero.",
            );
        }
    }

    private clamp(
        value:
            number,

        minimum:
            number,

        maximum:
            number,
    ): number {

        return Math.max(
            minimum,
            Math.min(
                value,
                maximum,
            ),
        );
    }
}