import { Container, Graphics } from "pixi.js";

export type RobotLedState =
    | "WANDERING"
    | "WARNING"
    | "ATTACKING"
    | "COOLDOWN";

export interface RobotLedUpdate {
    readonly state: RobotLedState;
    readonly cooldownElapsedSeconds: number;
    readonly cooldownDurationSeconds: number;
}

/**
 * Shared presentation for the robot's existing circular LED screen.
 *
 * The body sprite already contains the black circular display surface. This
 * class draws only the state graphics inside that surface. It is attached to
 * the robot's rotating visual root, so local +X is always the nozzle/front
 * direction.
 */
export class RobotLedDisplay {
    private readonly container = new Container();
    private readonly graphics = new Graphics();

    private animationSeconds = 0;
    private currentState: RobotLedState = "WANDERING";

    public constructor(
        private readonly screenDiameter: number,
        private readonly color: number,
    ) {
        // The black LED disc in the shared robot body artwork is slightly left of the
        // sprite anchor. Keep the procedural UI centered on the artwork.
        // The Water chassis has a longer nozzle, so its sprite anchor is shifted relative
        // to the circular chassis. Calibrate the overlay back onto the black LED disc.
        // Fire keeps its already-approved offset unchanged.
        const isWaterBlue = this.color === 0x1E99FF;
        this.container.position.set(isWaterBlue ? -11.8 : -7.75, isWaterBlue ? 0.25 : 1.5);
        this.container.addChild(this.graphics);
        this.redraw({
            state: this.currentState,
            cooldownElapsedSeconds: 0,
            cooldownDurationSeconds: 1,
        });
    }

    public getContainer(): Container {
        return this.container;
    }

    public update(deltaTime: number, update: RobotLedUpdate): void {
        if (!Number.isFinite(deltaTime) || deltaTime <= 0) return;

        if (update.state !== this.currentState) {
            this.currentState = update.state;
            this.animationSeconds = 0;
        } else {
            this.animationSeconds += deltaTime;
        }

        this.redraw(update);
    }

    public destroy(): void {
        this.container.destroy({ children: true });
    }

    private redraw(update: RobotLedUpdate): void {
        this.graphics.clear();
        // Keep every LED symbol in Robot-local space. The wandering ellipsis
        // is horizontal relative to the chassis and therefore rotates together
        // with the body instead of being counter-rotated into screen space.
        this.graphics.rotation = 0;

        switch (update.state) {
            case "WANDERING":
                this.drawWanderingDots();
                break;
            case "WARNING":
                this.drawWarning();
                break;
            case "ATTACKING":
                this.drawAttackFill();
                break;
            case "COOLDOWN":
                this.drawCooldown(
                    update.cooldownElapsedSeconds,
                    update.cooldownDurationSeconds,
                );
                break;
        }
    }

    /** Three outlined dots animate left-to-right across the robot face. */
    private drawWanderingDots(): void {
        const dotRadius = Math.max(1.35, this.screenDiameter * 0.065);
        const spacing = this.screenDiameter * 0.255;
        const strokeWidth = Math.max(1.15, this.screenDiameter * 0.045);
        const activeDots = Math.min(
            3,
            Math.floor((this.animationSeconds % 1.0) / 0.22) + 1,
        );

        // The nozzle/front is local +X, so the ellipsis must run along local Y.
        // This keeps the row perpendicular to the nozzle and makes it rotate
        // naturally with the chassis. Negative Y is the robot-local left side.
        const startY = -spacing;
        for (let index = 0; index < 3; index += 1) {
            const y = startY + index * spacing;

            // Every position remains an empty red ring. The animation reveals
            // them from robot-local left to robot-local right.
            this.graphics
                .circle(0, y, dotRadius)
                .stroke({
                    width: strokeWidth,
                    color: this.color,
                    alpha: index < activeDots ? 1 : 0.22,
                });
        }
    }

    /**
     * Warning exclamation is intentionally rotated 90 degrees from a normal
     * upright '!'. The dot sits at local +X, directly toward the nozzle.
     */
    private drawWarning(): void {
        const blinkOn = Math.floor(this.animationSeconds / 0.25) % 2 === 0;
        if (!blinkOn) return;

        const stemLength = this.screenDiameter * 0.48;
        const stemWidth = Math.max(2.2, this.screenDiameter * 0.105);
        const dotRadius = Math.max(1.5, this.screenDiameter * 0.075);
        const dotX = this.screenDiameter * 0.30;
        const stemStartX = -this.screenDiameter * 0.26;
        const stemEndX = this.screenDiameter * 0.12;

        this.graphics
            .roundRect(
                stemStartX,
                -stemWidth / 2,
                stemEndX - stemStartX,
                stemWidth,
                stemWidth / 2,
            )
            .fill({ color: this.color, alpha: 1 });

        // The dot is the rightmost part of the symbol, therefore it faces +X.
        this.graphics
            .circle(dotX, 0, dotRadius)
            .fill({ color: this.color, alpha: 1 });

        // Keep the declared length tied to the screen size while avoiding a
        // second visual element that would make the symbol too large.
        void stemLength;
    }

    private drawAttackFill(): void {
        // Preserve a narrow black rim from the source sprite's circular LED.
        const radius = this.screenDiameter * 0.455;
        this.graphics
            .circle(0, 0, radius)
            .fill({ color: this.color, alpha: 1 });
    }

    private drawCooldown(
        elapsedSeconds: number,
        durationSeconds: number,
    ): void {
        const safeDuration = Math.max(0.0001, durationSeconds);
        const progress = Math.max(
            0,
            Math.min(1, elapsedSeconds / safeDuration),
        );

        const radius = this.screenDiameter * 0.34;
        const width = Math.max(2.6, this.screenDiameter * 0.12);

        // Circular progress only. The unfilled portion remains the existing
        // black LED surface, while every rendered loader element is the same
        // attack red.
        if (progress <= 0) return;

        const startAngle = -Math.PI / 2;
        const sweepAngle = Math.PI * 2 * progress;
        this.drawArc(radius, startAngle, sweepAngle, width);
    }

    private drawArc(
        radius: number,
        startAngle: number,
        sweepAngle: number,
        width: number,
    ): void {
        const segments = Math.max(8, Math.ceil(Math.abs(sweepAngle) * 12));
        const endAngle = startAngle + sweepAngle;

        this.graphics.moveTo(
            Math.cos(startAngle) * radius,
            Math.sin(startAngle) * radius,
        );

        for (let index = 1; index <= segments; index += 1) {
            const t = index / segments;
            const angle = startAngle + sweepAngle * t;
            this.graphics.lineTo(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
            );
        }

        this.graphics.stroke({
            width,
            color: this.color,
            alpha: 1,
            cap: "round",
            join: "round",
        });

        void endAngle;
    }
}
