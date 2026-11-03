import { useState } from "react";
import type { WindState } from "../../core/game/environment/WindManager";
import { WorldModifierHud } from "../../components/hud/WorldModifierHud";
import type { WorldModifierResolvedState } from "../../core/game/world-modifiers/WorldModifierDefinition";
import {
    useEffect,
    useRef,
} from "react";

import {
    Game,
} from "../../core/game/Game";

import "./HomePage.css";

function HomePage() {

    const [modifierState, setModifierState] = useState<WorldModifierResolvedState | null>(null);
    const [windState, setWindState] = useState<WindState | null>(null);
    const gameRef = useRef<Game | null>(null);

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

            gameRef.current = game;
            const unsubscribeModifier = game.subscribeToWorldModifier(setModifierState);

            let disposed =
                false;
            let unsubscribeWind: (() => void) | null = null;

            const initializeGame =
                async (): Promise<void> => {
                    await game.start();

                    if (disposed) {
                        game.stop();
                        return;
                    }

                    // World exists after start(). Subscribe to the authoritative wind state.
                    unsubscribeWind = game.subscribeToWindState(setWindState);

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

                unsubscribeModifier();
                unsubscribeWind?.();
                if (gameRef.current === game) gameRef.current = null;
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
            >
                <WorldModifierHud state={modifierState} windState={windState} />
            </div>
        </main>
    );
}

export default HomePage;
