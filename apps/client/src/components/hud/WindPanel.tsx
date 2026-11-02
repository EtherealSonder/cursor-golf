import type {
    WindState,
} from "../../core/game/environment/WindManager";

import "./WindPanel.css";

interface WindPanelProps {
    readonly windState:
    WindState | null;
}

function getWindIntensityLabel(
    speedKph: number,
): string {

    if (speedKph <= 20) {
        return "Calm";
    }

    if (speedKph <= 45) {
        return "Moderate";
    }

    if (speedKph <= 65) {
        return "High";
    }

    if (speedKph <= 80) {
        return "Very High";
    }

    return "Extreme";
}

function WindPanel({
    windState,
}: WindPanelProps) {

    // The arrow follows the same normalized vector used by wind physics.
    // SVG points right at zero degrees, matching the game's +X axis.
    const windDirection = windState?.normalizedDirection;

    const directionDegrees = windDirection
        ? Math.atan2(windDirection.y, windDirection.x) * (180 / Math.PI)
        : 0;

    const speedKph =
        windState
            ? Math.round(
                windState.strength,
            )
            : null;

    const intensityLabel =
        speedKph === null
            ? "Loading"
            : getWindIntensityLabel(
                speedKph,
            );

    const accessibilityLabel =
        speedKph === null
            ? "Wind information is loading."
            : `Wind speed ${speedKph} kilometres per hour. ${intensityLabel} wind.`;

    return (
        <section
            className="wind-panel"
            aria-label={accessibilityLabel}
        >

            <div className="wind-panel__header">

                <div>

                    <span className="wind-panel__eyebrow">
                        Environment
                    </span>

                    <h2 className="wind-panel__title">
                        Wind
                    </h2>

                </div>

                <span
                    className="wind-panel__status-dot"
                    aria-hidden="true"
                />

            </div>

            <div className="wind-panel__content">

                <div
                    className="wind-panel__direction"
                    aria-hidden="true"
                >

                    <span className="wind-panel__direction-ring">
                        <svg
                            className="wind-panel__arrow"
                            viewBox="0 0 48 48"
                            aria-hidden="true"
                            focusable="false"
                            style={{
                                transform: `rotate(${directionDegrees}deg)`,
                            }}
                        >
                            <path
                                className="wind-panel__arrow-shape"
                                d="M9 24 H37 M27 14 L38 24 L27 34"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </span>

                </div>

                <div className="wind-panel__reading">

                    <div className="wind-panel__speed-row">

                        <span className="wind-panel__speed">
                            {speedKph ?? "--"}
                        </span>

                        <span className="wind-panel__unit">
                            km/h
                        </span>

                    </div>

                    <span className="wind-panel__intensity">
                        {intensityLabel}
                    </span>

                </div>

            </div>

        </section>
    );
}

export default WindPanel;
