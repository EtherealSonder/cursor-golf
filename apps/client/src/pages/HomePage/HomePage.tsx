import {
    useEffect,
    useRef,
} from "react";

import {
    Game,
} from "../../core/game/Game";

import "./HomePage.css";

function HomePage() {

    const gameContainerRef =
        useRef<HTMLDivElement>(
            null,
        );

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
            };
        },
        [],
    );

    return (
        <main className="home-page">
            <div
                ref={gameContainerRef}
                className="game-container"
                aria-label="Cursor Golf gameplay"
            />
        </main>
    );
}

export default HomePage;
