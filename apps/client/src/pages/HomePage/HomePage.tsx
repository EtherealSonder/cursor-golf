import { useState } from "react";
import type { WindState } from "../../core/game/environment/WindManager";
import { WorldModifierHud } from "../../components/hud/WorldModifierHud";
import { BallEffectDebugPanel } from "../../components/hud/BallEffectDebugPanel";
import type { BallEffectSnapshot, BallEffectSelection } from "../../core/game/ball-effects/BallEffectDefinition";
import type { WorldModifierResolvedState } from "../../core/game/world-modifiers/WorldModifierDefinition";
import { WorldModifierDebugController, type WorldModifierDebugSelection } from "../../core/game/world-modifiers/WorldModifierDebugController";
import {
    useEffect,
    useRef,
} from "react";

import {
    Game,
} from "../../core/game/Game";

import "./HomePage.css";

function HomePage() {

    const [ballEffect, setBallEffect] = useState<BallEffectSnapshot>({ active: "none", revision: 0 });
    const [showBallEffectDebug, setShowBallEffectDebug] = useState(false);
    const selectBallEffect = (effect: BallEffectSelection) => gameRef.current?.debugSetBallEffect(effect);
    const [modifierState, setModifierState] = useState<WorldModifierResolvedState | null>(null);
    const selectWorldModifier = (selection: WorldModifierDebugSelection) => {
        gameRef.current?.debugSetWorldModifier(selection, WorldModifierDebugController.newSeed());
    };
    const [modifierHudPhase, setModifierHudPhase] = useState<"visible" | "exiting" | "hidden" | "entering">("visible");
    const [modifierHudRevision, setModifierHudRevision] = useState(0);
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
            const unsubscribeCompletion = game.subscribeToLevelCompletion((shrinking) => {
                setModifierHudPhase(shrinking ? "exiting" : "entering");
                if (!shrinking) setModifierHudRevision(revision => revision + 1);
            });
            const unsubscribeModifier = game.subscribeToWorldModifier(setModifierState);
            const unsubscribeBallEffect = game.subscribeToBallEffect(setBallEffect);

            let disposed =
                false;
            let unsubscribeWind: (() => void) | null = null;
            const unsubscribeWorldChanged = game.subscribeToWorldChanged(() => {
                unsubscribeWind?.();
                unsubscribeWind = game.subscribeToWindState(setWindState);
                setShowBallEffectDebug(import.meta.env.DEV && game.getLevelId() === "level-test");
                setModifierHudPhase(phase => phase === "exiting" ? "hidden" : phase);
            });

            const initializeGame =
                async (): Promise<void> => {
                    await game.start();

                    if (disposed) {
                        game.stop();
                        return;
                    }

                    setShowBallEffectDebug(import.meta.env.DEV && game.getLevelId() === "level-test");

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

                unsubscribeCompletion();
                unsubscribeModifier();
                unsubscribeBallEffect();
                unsubscribeWind?.();
                unsubscribeWorldChanged();
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
                className="game-container game-container--club-foreground"
                aria-label="Cursor Golf gameplay"
            >
                <div className="wm2-hud-slot">
                    <WorldModifierHud key={modifierHudRevision} state={modifierState} windState={windState} phase={modifierHudPhase} />
                </div>
                {showBallEffectDebug && <BallEffectDebugPanel snapshot={ballEffect} onSelect={selectBallEffect} modifierState={modifierState} onSelectModifier={selectWorldModifier} />}
            </div>
        </main>
    );
}

export default HomePage;
