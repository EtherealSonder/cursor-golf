import type { AudioAssetDefinition, AudioSoundId } from "./AudioDefinition";
const files = import.meta.glob("../../../assets/audio/sfx/golf_ball/*.mp3", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const environmentFiles = import.meta.glob("../../../assets/audio/sfx/environment/*.mp3", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
function environmentAsset(filename: string): string {
    const url = environmentFiles[`../../../assets/audio/sfx/environment/${filename}.mp3`];
    if (!url) throw new Error(`Missing environment audio asset: ${filename}`);
    return url;
}
function asset(filename: string): string {
    const url = files[`../../../assets/audio/sfx/golf_ball/${filename}.mp3`];
    if (!url) throw new Error(`Missing golf audio asset: ${filename}`);
    return url;
}
export const AUDIO_ASSETS: Record<AudioSoundId, AudioAssetDefinition> = {
    "golf-ball-hit": { url: asset("golf_ball_hit"), gain: 0.85, maxVoices: 3 },
    "golf-ball-wall-impact": { url: asset("golf_ball_wall_impact"), gain: 0.8, maxVoices: 5 },
    "golf-ball-metal-hit": { url: asset("golf_ball_metal_hit"), gain: 0.8, maxVoices: 5 },
    "golf-ball-robot-hit": { url: asset("golf_ball_robot_hit"), gain: 0.8, maxVoices: 4 },
    "golf-ball-sticky-impact": { url: asset("golf_ball_sticky_impact"), gain: 0.8, maxVoices: 4 },
    "golf-ball-water-splash-1": { url: asset("golf_ball_water_splash_1"), gain: 0.65, maxVoices: 3 },
    "golf-ball-water-splash-2": { url: asset("golf_ball_water_splash_2"), gain: 0.65, maxVoices: 3 },
    "golf-ball-water-splash-3": { url: asset("golf_ball_water_splash_3"), gain: 0.65, maxVoices: 3 },
    "golf-ball-sand": { url: asset("golf_ball_sand"), gain: 0.55, maxVoices: 2 },
    "golf-ball-bumper": { url: asset("golf_ball_bumper"), gain: 0.8, maxVoices: 3 },
    "golf-ball-bush": { url: asset("golf_ball_bush"), gain: 0.7, maxVoices: 3 },
    "golf-ball-roll": { url: asset("golf_ball_roll"), gain: 0.55, maxVoices: 1 },
    "crate-destroy": { url: environmentAsset("crate_destroy"), gain: 0.8, maxVoices: 5 },
    "golf-crate-powerup": { url: asset("golf_crate_powerup"), gain: 0.9, maxVoices: 4 },
    "golf-ball-holed": { url: asset("golf_ball_holed"), gain: 0.85, maxVoices: 2 },
};
