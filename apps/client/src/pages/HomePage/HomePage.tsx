import { useState } from "react";
import { WorldModifierHud } from "../../components/hud/WorldModifierHud";
import { WorldModifierDebugPanel } from "../../components/hud/WorldModifierDebugPanel";
import type { WorldModifierResolvedState } from "../../core/game/world-modifiers/WorldModifierDefinition";
import type { WorldModifierDebugSelection } from "../../core/game/world-modifiers/WorldModifierDebugController";
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
    const gameRef = useRef<Game | null>(null);
    const applyModifier = (selection: WorldModifierDebugSelection, seed: number) => gameRef.current?.debugSetWorldModifier(selection, seed);

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

                unsubscribeModifier();
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
                <WorldModifierHud state={modifierState} />
                {import.meta.env.DEV && <WorldModifierDebugPanel state={modifierState} onApply={applyModifier} />}
            </div>
        </main>
    );
}

export default HomePage;
