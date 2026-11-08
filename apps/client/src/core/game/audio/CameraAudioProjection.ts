import type { Camera } from "../camera/Camera";
import type { AudioSpatialResult, AudioWorldPosition } from "./AudioDefinition";
import { AUDIO_CONFIG } from "./AudioConfig";
/** Uses the stable logical camera, not shake offsets or rendered transforms. */
export function projectAudioPosition(camera: Camera, position: AudioWorldPosition): AudioSpatialResult {
    const viewport = camera.worldToViewport(position.x, position.y);
    const halfWidth = Math.max(1, camera.getViewportWidth() * 0.5);
    const halfHeight = Math.max(1, camera.getViewportHeight() * 0.5);
    const nx = (viewport.x - halfWidth) / halfWidth;
    const ny = (viewport.y - halfHeight) / halfHeight;
    const pan = Math.max(-1, Math.min(1, nx * AUDIO_CONFIG.panStrength));
    const distance = Math.hypot(nx, ny);
    const normalized = Math.max(0, 1 - distance / AUDIO_CONFIG.silenceRadius);
    return { pan, gain: normalized * normalized * (3 - 2 * normalized) };
}
