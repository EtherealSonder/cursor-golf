import {
    Text,
} from "pixi.js";

import { Entity } from "../entities/Entity";

/**
 * Runtime data belonging to one temporary
 * shot-feedback message.
 */
interface ActiveShotFeedback {

    /**
     * Pixi text object displayed in the world.
     */
    readonly textObject: Text;

    /**
     * Original world-space vertical position
     * from which the text begins rising.
     */
    readonly startY: number;

    /**
     * Time elapsed since this message spawned.
     */
    elapsedTime: number;
}

/**
 * Displays short positive feedback words when
 * the player releases an accurate shot.
 *
 * ShotFeedback is independent of Ball.
 *
 * It copies the Ball's world position once when
 * spawn() is called, then animates the text from
 * that fixed world-space position.
 */
export class ShotFeedback extends Entity {

    // -------------------------------------------------------
    // Power Thresholds
    // -------------------------------------------------------

    /**
     * Upper boundary of the low-power tier.
     *
     * Range:
     * 0.00 to below 0.33
     */
    private readonly lowPowerThreshold =
        0.33;

    /**
     * Upper boundary of the medium-power tier.
     *
     * Range:
     * 0.33 to below 0.66
     */
    private readonly mediumPowerThreshold =
        0.66;

    // -------------------------------------------------------
    // Feedback Words
    // -------------------------------------------------------

    /**
     * Positive but restrained words for
     * accurately timed low-power shots.
     */
    private readonly lowPowerWords:
        readonly string[] = [
            "Nice!",
            "Good!",
            "Clean!",
            "Smooth!",
        ];

    /**
     * More enthusiastic words for accurately
     * timed medium-power shots.
     */
    private readonly mediumPowerWords:
        readonly string[] = [
            "Great!",
            "Awesome!",
            "Super!",
            "Brilliant!",
        ];

    /**
     * Exaggerated and playful words for
     * accurately timed high-power shots.
     */
    private readonly highPowerWords:
        readonly string[] = [
            "Fantabulous!",
            "Spectacular!",
            "Unstoppable!",
            "Kaboom!",
        ];

    // -------------------------------------------------------
    // Visual Configuration
    // -------------------------------------------------------

    /**
     * Text remains intentionally simple during
     * the placeholder-art phase.
     *
     * No custom font family is supplied, so Pixi
     * uses its normal default text rendering.
     */
    private readonly fontSize = 18;

    /**
     * Temporary feedback colour.
     */
    private readonly textColor = 0x000000;

    /**
     * Vertical offset applied at spawn so the
     * word does not cover the Ball.
     */
    private readonly spawnOffsetY = 20;

    // -------------------------------------------------------
    // Animation Configuration
    // -------------------------------------------------------

    /**
     * Total duration of one feedback message.
     */
    private readonly lifetime = 1.5;

    /**
     * Total vertical distance travelled before
     * the message disappears.
     */
    private readonly riseDistance = 42;

    /**
     * Prevents a large frame delta from making
     * the feedback animation jump excessively.
     */
    private readonly maximumDeltaTime = 0.1;

    // -------------------------------------------------------
    // Runtime State
    // -------------------------------------------------------

    /**
     * All currently active temporary messages.
     *
     * Multiple accurate shots can therefore
     * create independent messages without the
     * latest one deleting an earlier one.
     */
    private readonly activeFeedback:
        ActiveShotFeedback[] = [];

    // -------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------

    protected onInitialize(): void {

        /*
         * ShotFeedback itself has no permanent
         * visual child.
         *
         * Text objects are created only when an
         * accurate shot is released.
         */
    }

    protected onUpdate(
        deltaTime: number,
    ): void {

        const safeDeltaTime =
            Math.max(
                0,
                Math.min(
                    deltaTime,
                    this.maximumDeltaTime,
                ),
            );

        /*
         * Iterate backwards because expired
         * messages are removed from the array
         * during this loop.
         */
        for (
            let index =
                this.activeFeedback.length - 1;

            index >= 0;

            index -= 1
        ) {

            const feedback =
                this.activeFeedback[
                index
                ];

            feedback.elapsedTime +=
                safeDeltaTime;

            const progress =
                this.clampNormalizedValue(
                    feedback.elapsedTime /
                    this.lifetime,
                );

            /*
             * Ease-out movement:
             *
             * The word initially rises quickly,
             * then slows slightly toward the end.
             */
            const riseProgress =
                1 -
                Math.pow(
                    1 - progress,
                    2,
                );

            feedback.textObject.y =
                feedback.startY -
                this.riseDistance *
                riseProgress;

            /*
             * Fade continuously throughout the
             * feedback lifetime.
             */
            feedback.textObject.alpha =
                1 -
                progress;

            if (progress >= 1) {
                this.removeFeedback(
                    index,
                );
            }
        }
    }

    protected onDestroy(): void {

        for (
            const feedback
            of this.activeFeedback
        ) {
            feedback.textObject.destroy();
        }

        this.activeFeedback.length = 0;

        this.container.destroy({
            children: true,
        });
    }

    // -------------------------------------------------------
    // Feedback Creation
    // -------------------------------------------------------

    /**
     * Creates one feedback word at the supplied
     * world-space position.
     *
     * This method should be called only after
     * ShotController confirms that the released
     * shot is inside the optimal accuracy range.
     */
    public spawn(
        worldX: number,
        worldY: number,
        normalizedPower: number,
    ): void {

        if (
            !Number.isFinite(
                worldX,
            ) ||
            !Number.isFinite(
                worldY,
            )
        ) {
            throw new Error(
                "ShotFeedback requires finite world coordinates.",
            );
        }

        const power =
            this.clampNormalizedValue(
                normalizedPower,
            );

        const word =
            this.selectFeedbackWord(
                power,
            );

        const textObject =
            new Text({
                text:
                    word,

                style: {
                    fill:
                        this.textColor,

                    fontSize:
                        this.fontSize,

                    fontWeight:
                        "bold",

                    align:
                        "center",
                },
            });

        /*
         * Centre the word around its world-space
         * spawn position.
         */
        textObject.anchor.set(
            0.5,
        );

        const startY =
            worldY -
            this.spawnOffsetY;

        textObject.position.set(
            worldX,
            startY,
        );

        textObject.alpha = 1;

        this.container.addChild(
            textObject,
        );

        this.activeFeedback.push({
            textObject,
            startY,
            elapsedTime: 0,
        });
    }

    // -------------------------------------------------------
    // Word Selection
    // -------------------------------------------------------

    /**
     * Selects the appropriate word collection
     * according to normalized power.
     */
    private selectFeedbackWord(
        normalizedPower: number,
    ): string {

        if (
            normalizedPower <
            this.lowPowerThreshold
        ) {
            return this.selectRandomWord(
                this.lowPowerWords,
            );
        }

        if (
            normalizedPower <
            this.mediumPowerThreshold
        ) {
            return this.selectRandomWord(
                this.mediumPowerWords,
            );
        }

        return this.selectRandomWord(
            this.highPowerWords,
        );
    }

    /**
     * Selects one random word from a non-empty
     * feedback collection.
     */
    private selectRandomWord(
        words: readonly string[],
    ): string {

        if (words.length === 0) {
            throw new Error(
                "ShotFeedback cannot select from an empty word collection.",
            );
        }

        const randomIndex =
            Math.floor(
                Math.random() *
                words.length,
            );

        return words[
            randomIndex
        ];
    }

    // -------------------------------------------------------
    // Feedback Removal
    // -------------------------------------------------------

    /**
     * Removes and destroys one expired message.
     */
    private removeFeedback(
        index: number,
    ): void {

        const feedback =
            this.activeFeedback[
            index
            ];

        if (!feedback) {
            return;
        }

        this.container.removeChild(
            feedback.textObject,
        );

        feedback.textObject.destroy();

        this.activeFeedback.splice(
            index,
            1,
        );
    }

    // -------------------------------------------------------
    // Utilities
    // -------------------------------------------------------

    private clampNormalizedValue(
        value: number,
    ): number {

        return Math.max(
            0,
            Math.min(
                value,
                1,
            ),
        );
    }

    // -------------------------------------------------------
    // Debug
    // -------------------------------------------------------

    /**
     * Returns the number of feedback words
     * currently active in the world.
     */
    public getActiveFeedbackCount(): number {

        return this.activeFeedback.length;
    }
}