export type AudioSoundId = "golf-ball-hit" | "golf-ball-wall-impact" | "golf-ball-metal-hit" | "golf-ball-robot-hit" | "golf-ball-sticky-impact" | "golf-ball-water-splash-1" | "golf-ball-water-splash-2" | "golf-ball-water-splash-3" | "golf-ball-sand" | "golf-ball-holed" | "golf-ball-bumper" | "golf-ball-bush" | "golf-ball-roll" | "crate-destroy" | "golf-crate-powerup";
export interface AudioWorldPosition { readonly x: number; readonly y: number; }
export interface AudioAssetDefinition { readonly url: string; readonly gain: number; readonly maxVoices: number; }
export interface AudioPlaybackOptions { readonly position?: AudioWorldPosition; readonly gain?: number; readonly playbackRate?: number; }
export interface AudioSpatialResult { readonly pan: number; readonly gain: number; }
