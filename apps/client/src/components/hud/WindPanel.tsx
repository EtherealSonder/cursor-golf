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

    const directionDegrees =
        windState
            ?.directionDegrees ??
        0;

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

                    <span
                        className="wind-panel__arrow"
                        style={{
                            transform:
                                `rotate(${directionDegrees}deg)`,
                        }}
                    >
                        ➜
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
