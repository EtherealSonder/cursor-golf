import type { AudioAssetDefinition, AudioSoundId } from "./AudioDefinition";
const files = import.meta.glob("../../../assets/audio/sfx/golf_ball/*.mp3", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const environmentFiles = import.meta.glob("../../../assets/audio/sfx/environment/*.mp3", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const modifierFiles = import.meta.glob("../../../assets/audio/sfx/world_modifiers/*.mp3", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
function modifierAsset(filename: string): string { const url = modifierFiles[`../../../assets/audio/sfx/world_modifiers/${filename}.mp3`]; if (!url) throw new Error(`Missing modifier audio: ${filename}`); return url; }
const robotFiles = import.meta.glob("../../../assets/audio/sfx/robots/*.mp3", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
function robotAsset(filename: string): string { const url = robotFiles[`../../../assets/audio/sfx/robots/${filename}.mp3`]; if (!url) throw new Error(`Missing robot audio: ${filename}`); return url; }
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
    "portal-teleport": { url: environmentAsset("portal_teleport"), gain: 0.75, maxVoices: 5 },
    "marble-hit": { url: environmentAsset("marble_hit"), gain: 0.65, maxVoices: 8 },
    "rock-hit": { url: environmentAsset("rock_hit"), gain: 0.75, maxVoices: 8 },
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
    "mine-beep": { url: environmentAsset("mine_beep"), gain: 0.48, maxVoices: 8 },
    "mine-explosion": { url: environmentAsset("mine_explosion"), gain: 0.85, maxVoices: 5 },
    "robot-walk": { url: robotAsset("robot_walk"), gain: 0.34, maxVoices: 6 },
    "robot-detected": { url: robotAsset("robot_detected"), gain: 0.68, maxVoices: 6 },
    "fan-wind": { url: environmentAsset("fan_wind"), gain: 0.16, maxVoices: 12 },
    "ground-fire": { url: environmentAsset("ground_fire"), gain: 0.30, maxVoices: 6 },
    "robot-fire-attack": { url: robotAsset("robot_fire_attack"), gain: 0.65, maxVoices: 2 },
    "water-sprinkler": { url: environmentAsset("water_sprinkler"), gain: 0.30, maxVoices: 12 },
    "robot-water-attack": { url: robotAsset("robot_water_attack"), gain: 0.68, maxVoices: 2 },
    "robot-wind-attack": { url: robotAsset("robot_wind_attack"), gain: 0.62, maxVoices: 2 },
    "water-filling-ground": { url: environmentAsset("water_filling_ground"), gain: 0.16, maxVoices: 2 },
    "world-modifier-downpour": { url: modifierAsset("world_modifier_downpour"), gain: 1, maxVoices: 1 },
    "world-modifier-galewind": { url: modifierAsset("world_modifier_galewind"), gain: 1, maxVoices: 1 },
    "golf-ball-holed": { url: asset("golf_ball_holed"), gain: 0.85, maxVoices: 2 },
};
