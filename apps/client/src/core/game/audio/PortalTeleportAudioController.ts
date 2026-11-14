import type { World } from "../world/World";
import type { SpatialAudioManager } from "./SpatialAudioManager";

/** One one-shot per committed portal event. Ball teleport is deliberately unattenuated. */
export class PortalTeleportAudioController {
    private readonly unsubscribe: () => void;
    constructor(world: World, audio: SpatialAudioManager) {
        void audio.preload("portal-teleport");
        this.unsubscribe = world.subscribeObjectAudio(event => {
            if (event.sound !== "portal-teleport") return;
            // Portal:ball fires once per successful teleport, not once per overlap frame.
            // Avoid a camera-relative zero-gain result during teleport camera relocation.
            const options = event.key === "portal:ball" ? {} : { position: { x: event.x, y: event.y } };
            audio.playWhenReady("portal-teleport", options);
        });
    }
    dispose(): void { this.unsubscribe(); }
}
