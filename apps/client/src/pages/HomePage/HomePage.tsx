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

    const [fireSourceDebugVisible, setFireSourceDebugVisible] = useState(false);

    const [localWindDebugVisible, setLocalWindDebugVisible] = useState(false);

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

                    game.setLocalWindDebugVisible(
                        false,
                    );

                };

            void initializeGame();

            return () => {

                disposed =
                    true;

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

    const handleClearActiveFire = (): void => { gameRef.current?.clearActiveFire(); };

    const handleResetFireSourceEnvironment = (): void => {
        const game = gameRef.current;
        if (!game) return;
        game.resetFireSourceTestEnvironment();
    };

    const handleToggleFireSourceDebug = (): void => {
        const game = gameRef.current;
        if (!game) return;
        const next = !fireSourceDebugVisible;
        game.setFireSourceDebugVisible(next);
        setFireSourceDebugVisible(next);
    };

    const handleToggleLocalWindDebug = (): void => {
        const game = gameRef.current;
        if (!game) return;
        const next = !localWindDebugVisible;
        game.setLocalWindDebugVisible(next);
        setLocalWindDebugVisible(next);
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

                            <button
                                type="button"
                                className={localWindDebugVisible ? "hud-action-button hud-action-button--selected" : "hud-action-button"}
                                onClick={handleToggleLocalWindDebug}
                            >
                                {localWindDebugVisible ? "Hide Wind Debug" : "Show Wind Debug"}
                            </button>

                            <span className="hud-test-hint">
                                Wind Debug shows each Fan's authoritative Local Wind volume.
                            </span>

                            <span className="hud-test-hint">
                                Right-click course to ignite
                            </span>

                            <div className="hud-test-divider" />

                            <div className="hud-test-label">
                                Fire Controls
                            </div>

                            <button type="button" className="hud-action-button" onClick={handleClearActiveFire}>Clear Active Fire</button>
                            <button type="button" className="hud-action-button" onClick={handleResetFireSourceEnvironment}>Reset Environment</button>
                            <button type="button" className={fireSourceDebugVisible ? "hud-action-button hud-action-button--selected" : "hud-action-button"} onClick={handleToggleFireSourceDebug}>
                                {fireSourceDebugVisible ? "Hide Source Debug" : "Show Source Debug"}
                            </button>

                            <span className="hud-test-hint">
                                Fire Tubes cycle automatically. Right-click course to ignite.
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
