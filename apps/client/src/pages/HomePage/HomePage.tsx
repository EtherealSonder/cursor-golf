import {
    useEffect,
    useRef,
    useState,
} from "react";

import {
    Game,
} from "../../core/game/Game";

import type {
    FireWindTestConfigurationId,
} from "../../core/game/config/FireWindTestDefinition";

import {
    FireSourcePlacementMode,
} from "../../core/game/config/FireSourcePlacementMode";

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

    const [
        fireSourcePlacementMode,
        setFireSourcePlacementMode,
    ] =
        useState<FireSourcePlacementMode>(
            FireSourcePlacementMode.None,
        );

    const [fireSourcesEnabled, setFireSourcesEnabled] = useState(true);
    const [fireSourceDebugVisible, setFireSourceDebugVisible] = useState(false);
    const [activeFireSourceCount, setActiveFireSourceCount] = useState(0);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setActiveFireSourceCount(gameRef.current?.getActiveFireSourceCount() ?? 0);
        }, 250);
        return () => window.clearInterval(intervalId);
    }, []);

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

            let unsubscribeFromFireSourcePlacement:
                (() => void) | null =
                null;

            const initializeGame =
                async (): Promise<void> => {

                    await game.start();

                    if (disposed) {
                        game.stop();

                        return;
                    }

                    game.setFireSourceDebugVisible(
                        false,
                    );

                    unsubscribeFromFireSourcePlacement =
                        game.subscribeToFireSourcePlacementMode(
                            (
                                mode:
                                    FireSourcePlacementMode,
                            ): void => {

                                setFireSourcePlacementMode(
                                    mode,
                                );
                            },
                        );
                };

            void initializeGame();

            return () => {

                disposed =
                    true;

                unsubscribeFromFireSourcePlacement
                    ?.();

                game.stop();

                gameRef.current =
                    null;
            };
        },
        [],
    );

    // -------------------------------------------------------
    // Gameplay Controls
    // -------------------------------------------------------

    const handleResetBall =
        (): void => {

            gameRef.current
                ?.resetBall();
        };

    const handleFireWindConfiguration =
        (
            configurationId:
                FireWindTestConfigurationId,
        ): void => {

            gameRef.current?.applyFireWindTestConfiguration(
                configurationId,
            );
        };

    const handleSelectFireSourcePlacement =
        (
            mode:
                FireSourcePlacementMode,
        ): void => {

            const game =
                gameRef.current;

            if (!game) {
                return;
            }

            const nextMode =
                fireSourcePlacementMode ===
                    mode
                    ? FireSourcePlacementMode.None
                    : mode;

            game.setFireSourcePlacementMode(
                nextMode,
            );
        };

    const handleRemoveFireSources =
        (): void => {

            const game =
                gameRef.current;

            if (!game) {
                return;
            }

            game.clearFireSources();
            game.setFireSourcePlacementMode(FireSourcePlacementMode.None);
            setActiveFireSourceCount(0);
        };

    const handleToggleFireSources = (): void => {
        const game = gameRef.current;
        if (!game) return;
        const next = !fireSourcesEnabled;
        game.setAllFireSourcesEnabled(next);
        setFireSourcesEnabled(next);
    };

    const handleClearActiveFire = (): void => { gameRef.current?.clearActiveFire(); };

    const handleResetFireSourceEnvironment = (): void => {
        const game = gameRef.current;
        if (!game) return;
        game.resetFireSourceTestEnvironment();
        setFireSourcesEnabled(true);
        setActiveFireSourceCount(0);
    };

    const handleToggleFireSourceDebug = (): void => {
        const game = gameRef.current;
        if (!game) return;
        const next = !fireSourceDebugVisible;
        game.setFireSourceDebugVisible(next);
        setFireSourceDebugVisible(next);
    };

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
                        aria-label="Gameplay controls"
                    >

                        <div className="hud-rail__compact-actions">

                            <button
                                type="button"
                                className="hud-action-button"
                                onClick={handleResetBall}
                            >
                                Reset Ball
                            </button>

                            <div className="hud-test-label">
                                Fire / Wind Test
                            </div>

                            <button type="button" className="hud-action-button"
                                onClick={() => handleFireWindConfiguration("no-wind")}>
                                No Wind
                            </button>

                            <button type="button" className="hud-action-button"
                                onClick={() => handleFireWindConfiguration("east-wind")}>
                                East Wind →
                            </button>

                            <button type="button" className="hud-action-button"
                                onClick={() => handleFireWindConfiguration("south-wind")}>
                                South Wind ↓
                            </button>

                            <button type="button" className="hud-action-button"
                                onClick={() => handleFireWindConfiguration("mixed-wind")}>
                                Mixed Wind ↘
                            </button>

                            <span className="hud-test-hint">
                                Right-click course to ignite
                            </span>

                            <div className="hud-test-divider" />

                            <div className="hud-test-label">
                                Fire Jet Test
                            </div>

                            <button
                                type="button"
                                className={
                                    fireSourcePlacementMode ===
                                        FireSourcePlacementMode.Directional
                                        ? "hud-action-button hud-action-button--selected"
                                        : "hud-action-button"
                                }
                                aria-pressed={
                                    fireSourcePlacementMode ===
                                    FireSourcePlacementMode.Directional
                                }
                                onClick={
                                    () =>
                                        handleSelectFireSourcePlacement(
                                            FireSourcePlacementMode.Directional,
                                        )
                                }
                            >
                                Directional Jet
                            </button>

                            <button
                                type="button"
                                className={
                                    fireSourcePlacementMode ===
                                        FireSourcePlacementMode.Sweeping
                                        ? "hud-action-button hud-action-button--selected"
                                        : "hud-action-button"
                                }
                                aria-pressed={
                                    fireSourcePlacementMode ===
                                    FireSourcePlacementMode.Sweeping
                                }
                                onClick={
                                    () =>
                                        handleSelectFireSourcePlacement(
                                            FireSourcePlacementMode.Sweeping,
                                        )
                                }
                            >
                                Sweeping Jet
                            </button>

                            <div className="hud-source-status">Sources: {activeFireSourceCount}</div>

                            <button type="button" className={!fireSourcesEnabled ? "hud-action-button hud-action-button--selected" : "hud-action-button"} onClick={handleToggleFireSources}>
                                {fireSourcesEnabled ? "Disable Sources" : "Enable Sources"}
                            </button>

                            <button
                                type="button"
                                className="hud-action-button"
                                onClick={handleRemoveFireSources}
                            >
                                Remove Sources
                            </button>

                            <button type="button" className="hud-action-button" onClick={handleClearActiveFire}>Clear Active Fire</button>
                            <button type="button" className="hud-action-button" onClick={handleResetFireSourceEnvironment}>Reset Environment</button>
                            <button type="button" className={fireSourceDebugVisible ? "hud-action-button hud-action-button--selected" : "hud-action-button"} onClick={handleToggleFireSourceDebug}>
                                {fireSourceDebugVisible ? "Hide Source Debug" : "Show Source Debug"}
                            </button>

                            <span className="hud-test-hint">
                                {
                                    fireSourcePlacementMode ===
                                        FireSourcePlacementMode.Directional
                                        ? "Directional Jet armed: click-drag-release on the course"
                                        : fireSourcePlacementMode ===
                                            FireSourcePlacementMode.Sweeping
                                            ? "Sweeping Jet armed: click-drag-release on the course"
                                            : "Jet tools are one-shot and automatically disarm after placement"
                                }
                            </span>

                        </div>

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
                                className={
                                    (
                                        fireSourcePlacementMode ===
                                        FireSourcePlacementMode.Directional ||
                                        fireSourcePlacementMode ===
                                        FireSourcePlacementMode.Sweeping
                                    )
                                        ? "game-container game-container--fire-placement"
                                        : "game-container"
                                }
                            />

                        </div>

                    </section>

                </div>

            </div>

        </main>
    );
}

export default HomePage;
