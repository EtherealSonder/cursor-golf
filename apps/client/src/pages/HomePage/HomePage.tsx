import { useEffect, useRef } from "react";
import { Game } from "../../core/game/Game";
import "./HomePage.css";

function HomePage() {
    const gameContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = gameContainerRef.current;

        if (!container) {
            return;
        }

        const game = new Game(container);

        let disposed = false;

        const initializeGame = async () => {
            await game.start();

            if (disposed) {
                game.stop();
            }
        };

        void initializeGame();

        return () => {
            disposed = true;
            game.stop();
        };
    }, []);

    return (
        <main className="home-page">
            <h1>Golf Game</h1>

            <p>Welcome to the Multiplayer Golf Game.</p>

            <div
                ref={gameContainerRef}
                className="game-container"
            />
        </main>
    );
}

export default HomePage;