import {
    useEffect,
    useRef,
    useState,
} from "react";

import WindPanel from "../../components/hud/WindPanel";

import {
    Game,
} from "../../core/game/Game";

import type {
    WindTuningState,
} from "../../core/game/debug/WindTuningController";

import type {
    WindValidationState,
} from "../../core/game/debug/WindValidationMetrics";

import type {
    WindState,
} from "../../core/game/environment/WindManager";

import "./HomePage.css";

function HomePage() {

    // -------------------------------------------------------
    // Game References
    // -------------------------------------------------------

    const gameContainerRef =
        useRef<HTMLDivElement>(
            null,
        );

    const gameRef =
        useRef<Game | null>(
            null,
        );

    // -------------------------------------------------------
    // Live Environmental UI State
    // -------------------------------------------------------

    const [
        windState,
        setWindState,
    ] = useState<WindState | null>(
        null,
    );

    const [
        windTuningState,
        setWindTuningState,
    ] = useState<WindTuningState | null>(
        null,
    );

    const [
        windValidationState,
        setWindValidationState,
    ] = useState<WindValidationState | null>(
        null,
    );

    // -------------------------------------------------------
    // Game Lifecycle
    // -------------------------------------------------------

    useEffect(
        () => {

            const container =
                gameContainerRef.current;

            if (!container) {
                return;
            }

            const game =
                new Game(
                    container,
                );

            gameRef.current =
                game;

            let disposed =
                false;

            let unsubscribeFromWind:
                (() => void) | null =
                null;

            let unsubscribeFromWindTuning:
                (() => void) | null =
                null;

            let unsubscribeFromWindValidation:
                (() => void) | null =
                null;

            const initializeGame =
                async (): Promise<void> => {

                    await game.start();

                    if (disposed) {
                        game.stop();
                        return;
                    }

                    unsubscribeFromWind =
                        game.subscribeToWindState(
                            setWindState,
                        );

                    unsubscribeFromWindTuning =
                        game.subscribeToWindTuningState(
                            setWindTuningState,
                        );

                    unsubscribeFromWindValidation =
                        game.subscribeToWindValidationState(
                            setWindValidationState,
                        );
                };

            void initializeGame();

            return () => {

                disposed =
                    true;

                unsubscribeFromWind?.();

                unsubscribeFromWind =
                    null;

                unsubscribeFromWindTuning?.();

                unsubscribeFromWindTuning =
                    null;

                unsubscribeFromWindValidation?.();

                unsubscribeFromWindValidation =
                    null;

                game.stop();

                gameRef.current =
                    null;
            };
        },
        [],
    );

    // -------------------------------------------------------
    // C7 Wind-Tuning Controls
    // -------------------------------------------------------

    const handlePreviousPreset =
        (): void => {

            gameRef.current
                ?.applyPreviousWindPreset();
        };

    const handleNextPreset =
        (): void => {

            gameRef.current
                ?.applyNextWindPreset();
        };

    const handleRandomWind =
        (): void => {

            gameRef.current
                ?.applyRandomWind();
        };

    const handleResetBall =
        (): void => {

            gameRef.current
                ?.resetBall();
        };

    const isRandomMode =
        windTuningState
            ?.mode !==
        "preset";

    const activePreset =
        windTuningState
            ?.activePreset ??
        null;

    const activePresetPosition =
        windTuningState
            ?.activePresetIndex ===
            null ||
            windTuningState
                ?.activePresetIndex ===
            undefined
            ? null
            : (
                windTuningState
                    .activePresetIndex +
                1
            );

    // -------------------------------------------------------
    // Validation Metrics Derived State
    // -------------------------------------------------------

    const isMeasuring =
        windValidationState
            ?.status ===
        "measuring";

    const validationResult =
        windValidationState
            ?.latestResult ??
        null;

    // -------------------------------------------------------
    // Page Structure
    // -------------------------------------------------------

    return (
        <main className="home-page">

            <div className="home-page__shell">

                {/* -----------------------------------------
                    Compact Header
                ----------------------------------------- */}

                <header className="game-header">

                    <div className="game-header__brand">

                        <div className="game-header__wordmark-row">

                            <span
                                className="game-header__mark"
                                aria-hidden="true"
                            >
                                ●
                            </span>

                            <span className="game-header__wordmark">
                                Cursor Golf
                            </span>

                        </div>

                        <span className="game-header__status">
                            Multiplayer Prototype
                        </span>

                    </div>

                    <section
                        className="level-progress"
                        aria-label="Player level progress"
                    >

                        <div className="level-progress__header">

                            <div className="level-progress__identity">

                                <span className="level-progress__eyebrow">
                                    Player Progress
                                </span>

                                <span className="level-progress__level">
                                    Level 1
                                </span>

                            </div>

                            <span className="level-progress__value">
                                0 / 100
                            </span>

                        </div>

                        <div
                            className="level-progress__track"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={0}
                            aria-label="Level progress"
                        >

                            <div
                                className="level-progress__fill"
                                style={{
                                    width: "0%",
                                }}
                            />

                        </div>

                    </section>

                </header>

                {/* -----------------------------------------
                    Main Gameplay Layout
                ----------------------------------------- */}

                <div className="game-layout">

                    {/* -------------------------------------
                        Left HUD Rail
                    ------------------------------------- */}

                    <aside
                        className="hud-rail"
                        aria-label="Gameplay information"
                    >

                        <WindPanel
                            windState={windState}
                        />

                        <button
                            type="button"
                            className="ball-reset-button"
                            onClick={handleResetBall}
                            disabled={!windValidationState}
                        >
                            Reset Ball
                        </button>

                        <section
                            className="wind-tuning-panel"
                            aria-label="Wind validation controls"
                        >

                            <div className="wind-tuning-panel__header">

                                <span className="wind-tuning-panel__eyebrow">
                                    C7 Validation
                                </span>

                                <h2 className="wind-tuning-panel__title">
                                    Wind Preset
                                </h2>

                            </div>

                            <div className="wind-tuning-panel__current">

                                <span className="wind-tuning-panel__mode">

                                    {isRandomMode
                                        ? "Random Session"
                                        : "Deterministic"}

                                </span>

                                <strong className="wind-tuning-panel__name">

                                    {activePreset
                                        ?.name ??
                                        "Random Wind"}

                                </strong>

                                {activePreset && (
                                    <p className="wind-tuning-panel__description">
                                        {activePreset.description}
                                    </p>
                                )}

                                {!activePreset && (
                                    <p className="wind-tuning-panel__description">
                                        Uses the normal weighted wind bands and a randomly generated direction.
                                    </p>
                                )}

                                <div className="wind-tuning-panel__details">

                                    <span>
                                        Direction
                                    </span>

                                    <strong>
                                        {windState
                                            ? `${windState.directionDegrees.toFixed(0)}°`
                                            : "--"}
                                    </strong>

                                    <span>
                                        Speed
                                    </span>

                                    <strong>
                                        {windState
                                            ? `${Math.round(windState.strength)} km/h`
                                            : "--"}
                                    </strong>

                                </div>

                                {activePresetPosition !== null && (
                                    <span className="wind-tuning-panel__position">

                                        Preset {activePresetPosition}
                                        {" / "}
                                        {windTuningState?.presetCount ?? 0}

                                    </span>
                                )}

                            </div>

                            <div className="wind-tuning-panel__current">

                                <span className="wind-tuning-panel__mode">
                                    Shot Metrics
                                </span>

                                <strong className="wind-tuning-panel__name">

                                    {isMeasuring
                                        ? `Measuring Shot ${windValidationState?.activeShotNumber ?? ""}`
                                        : validationResult
                                            ? `Completed Shot ${validationResult.shotNumber}`
                                            : "Awaiting Shot"}

                                </strong>

                                {!validationResult && !isMeasuring && (
                                    <p className="wind-tuning-panel__description">
                                        Select a wind condition, take one shot, and wait for the Ball to reach exact rest.
                                    </p>
                                )}

                                {isMeasuring && (
                                    <p className="wind-tuning-panel__description">
                                        Measurement is active. Wind controls remain locked until the Ball stops.
                                    </p>
                                )}

                                {validationResult && !isMeasuring && (
                                    <div className="wind-tuning-panel__details">

                                        <span>
                                            Test
                                        </span>

                                        <strong>
                                            {validationResult.windPresetName ?? "Random Wind"}
                                        </strong>

                                        <span>
                                            Launch Speed
                                        </span>

                                        <strong>
                                            {validationResult.launchSpeed.toFixed(1)} px/s
                                        </strong>

                                        <span>
                                            Maximum Speed
                                        </span>

                                        <strong>
                                            {validationResult.maximumSpeed.toFixed(1)} px/s
                                        </strong>

                                        <span>
                                            Movement Time
                                        </span>

                                        <strong>
                                            {validationResult.movementTime.toFixed(3)} s
                                        </strong>

                                        <span>
                                            Travel Distance
                                        </span>

                                        <strong>
                                            {validationResult.travelDistance.toFixed(1)} px
                                        </strong>

                                        <span>
                                            Displacement
                                        </span>

                                        <strong>
                                            {validationResult.straightLineDisplacement.toFixed(1)} px
                                        </strong>

                                        <span>
                                            Forward Distance
                                        </span>

                                        <strong>
                                            {validationResult.longitudinalDisplacement.toFixed(1)} px
                                        </strong>

                                        <span>
                                            Maximum Drift
                                        </span>

                                        <strong>
                                            {validationResult.maximumLateralDrift.toFixed(1)} px
                                        </strong>

                                        <span>
                                            Final Drift
                                        </span>

                                        <strong>
                                            {validationResult.finalLateralDrift.toFixed(1)} px
                                        </strong>

                                        <span>
                                            Boundary Hits
                                        </span>

                                        <strong>
                                            {validationResult.boundaryCollisionCount}
                                        </strong>

                                        <span>
                                            Obstacle Hits
                                        </span>

                                        <strong>
                                            {validationResult.obstacleCollisionCount}
                                        </strong>

                                    </div>
                                )}

                            </div>

                            <div className="wind-tuning-panel__controls">

                                <button
                                    type="button"
                                    className="wind-tuning-panel__button"
                                    onClick={handlePreviousPreset}
                                    disabled={
                                        !windTuningState ||
                                        isMeasuring
                                    }
                                >
                                    Previous
                                </button>

                                <button
                                    type="button"
                                    className="wind-tuning-panel__button"
                                    onClick={handleNextPreset}
                                    disabled={
                                        !windTuningState ||
                                        isMeasuring
                                    }
                                >
                                    Next
                                </button>

                                <button
                                    type="button"
                                    className="wind-tuning-panel__button wind-tuning-panel__button--wide"
                                    onClick={handleRandomWind}
                                    disabled={
                                        !windTuningState ||
                                        isMeasuring
                                    }
                                >
                                    Generate Random Wind
                                </button>

                            </div>

                            <p className="wind-tuning-panel__reference">
                                Reference test shot: horizontally toward the right.
                            </p>

                        </section>

                    </aside>

                    {/* -------------------------------------
                        PixiJS Game Viewport
                    ------------------------------------- */}

                    <section
                        className="game-column"
                        aria-label="Cursor Golf gameplay"
                    >

                        <div className="game-frame">

                            <div
                                ref={gameContainerRef}
                                className="game-container"
                            />

                        </div>

                    </section>

                </div>

            </div>

        </main>
    );
}

export default HomePage;