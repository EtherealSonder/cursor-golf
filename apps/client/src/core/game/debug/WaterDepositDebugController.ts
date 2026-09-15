import type {
    WaterDebugDefinition,
} from "../config/WaterDebugDefinition";

import type {
    WaterField,
} from "../environment/WaterField";

export interface WaterDepositDebugWorldPosition {
    readonly x: number;
    readonly y: number;
}

export type WaterDepositDebugScreenToWorld =
    (
        screenX: number,
        screenY: number,
    ) => WaterDepositDebugWorldPosition | null;

/**
 * Phase 8C-8A development-only Water deposit tool.
 *
 * When enabled, holding the primary mouse button over the game canvas
 * continuously injects authoritative standing Water at the cursor. Water is
 * injected only into WaterField, so flow, infiltration, moisture, Wet Ground
 * classification and drying all continue through the production systems.
 *
 * Pointer events are consumed while this tool is enabled so the same primary
 * mouse input does not also begin a golf shot.
 */
export class WaterDepositDebugController {

    private pointerHeld =
        false;

    private pointerInside =
        false;

    private screenX =
        0;

    private screenY =
        0;

    private depositAccumulator =
        0;

    private destroyed =
        false;

    private readonly onPointerDownBound =
        (
            event: PointerEvent,
        ): void => {
            this.onPointerDown(event);
        };

    private readonly onPointerMoveBound =
        (
            event: PointerEvent,
        ): void => {
            this.onPointerMove(event);
        };

    private readonly onPointerUpBound =
        (
            event: PointerEvent,
        ): void => {
            this.onPointerUp(event);
        };

    private readonly onPointerEnterBound =
        (): void => {
            this.pointerInside = true;
        };

    private readonly onPointerLeaveBound =
        (): void => {
            this.pointerInside = false;
            this.pointerHeld = false;
            this.depositAccumulator = 0;
        };

    private readonly onContextMenuBound =
        (
            event: MouseEvent,
        ): void => {
            if (
                this.definition
                    .interactiveDepositEnabled
            ) {
                return;
            }

            event.preventDefault();
        };

    public constructor(
        private readonly canvas:
            HTMLCanvasElement,

        private readonly waterField:
            WaterField,

        private readonly screenToWorld:
            WaterDepositDebugScreenToWorld,

        private readonly definition:
            WaterDebugDefinition,
    ) {
        this.canvas.addEventListener(
            "pointerdown",
            this.onPointerDownBound,
            true,
        );

        this.canvas.addEventListener(
            "pointermove",
            this.onPointerMoveBound,
            true,
        );

        window.addEventListener(
            "pointerup",
            this.onPointerUpBound,
            true,
        );

        this.canvas.addEventListener(
            "pointerenter",
            this.onPointerEnterBound,
            true,
        );

        this.canvas.addEventListener(
            "pointerleave",
            this.onPointerLeaveBound,
            true,
        );
    }

    public update(
        deltaTime:
            number,
    ): void {

        if (
            this.destroyed ||
            !this.definition
                .interactiveDepositEnabled ||
            !this.pointerHeld ||
            !this.pointerInside ||
            !Number.isFinite(deltaTime) ||
            deltaTime <= 0
        ) {
            return;
        }

        this.depositAccumulator +=
            Math.min(
                deltaTime,
                this.definition
                    .interactiveDepositMaximumFrameDelta,
            );

        const interval =
            this.definition
                .interactiveDepositIntervalSeconds;

        while (
            this.depositAccumulator >=
            interval
        ) {
            this.depositAccumulator -=
                interval;

            this.depositAtPointer();
        }
    }

    public destroy():
        void {

        if (
            this.destroyed
        ) {
            return;
        }

        this.destroyed =
            true;

        this.canvas.removeEventListener(
            "pointerdown",
            this.onPointerDownBound,
            true,
        );

        this.canvas.removeEventListener(
            "pointermove",
            this.onPointerMoveBound,
            true,
        );

        window.removeEventListener(
            "pointerup",
            this.onPointerUpBound,
            true,
        );

        this.canvas.removeEventListener(
            "pointerenter",
            this.onPointerEnterBound,
            true,
        );

        this.canvas.removeEventListener(
            "pointerleave",
            this.onPointerLeaveBound,
            true,
        );

        this.pointerHeld =
            false;

        this.depositAccumulator =
            0;
    }

    private onPointerDown(
        event:
            PointerEvent,
    ): void {

        if (
            this.destroyed ||
            !this.definition
                .interactiveDepositEnabled ||
            event.button !== 0
        ) {
            return;
        }

        this.updatePointerPosition(
            event,
        );

        this.pointerInside =
            true;

        this.pointerHeld =
            true;

        this.depositAccumulator =
            this.definition
                .interactiveDepositIntervalSeconds;

        /*
         * Debug Water owns primary-pointer input while enabled. Capture-phase
         * cancellation prevents PlayerController/ShotController from also
         * interpreting this gesture as a golf shot.
         */
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    private onPointerMove(
        event:
            PointerEvent,
    ): void {

        if (
            this.destroyed ||
            !this.definition
                .interactiveDepositEnabled
        ) {
            return;
        }

        this.updatePointerPosition(
            event,
        );

        if (
            this.pointerHeld
        ) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        }
    }

    private onPointerUp(
        event:
            PointerEvent,
    ): void {

        if (
            this.destroyed ||
            !this.definition
                .interactiveDepositEnabled ||
            event.button !== 0
        ) {
            return;
        }

        const wasHeld =
            this.pointerHeld;

        this.pointerHeld =
            false;

        this.depositAccumulator =
            0;

        if (
            wasHeld
        ) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        }
    }

    private updatePointerPosition(
        event:
            PointerEvent,
    ): void {

        const bounds =
            this.canvas
                .getBoundingClientRect();

        this.screenX =
            event.clientX -
            bounds.left;

        this.screenY =
            event.clientY -
            bounds.top;
    }

    private depositAtPointer():
        void {

        const worldPosition =
            this.screenToWorld(
                this.screenX,
                this.screenY,
            );

        if (
            !worldPosition
        ) {
            return;
        }

        this.waterField
            .injectWater(
                worldPosition.x,
                worldPosition.y,
                this.definition
                    .interactiveDepositAmountPerPulse,
            );
    }
}
