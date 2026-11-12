import type { Camera } from "../camera/Camera";
import { AUDIO_ASSETS } from "./AudioAssetRegistry";
import { AUDIO_CONFIG } from "./AudioConfig";
import { projectAudioPosition } from "./CameraAudioProjection";
import type { AudioPlaybackOptions, AudioSoundId, AudioVoiceHandle } from "./AudioDefinition";
interface Voice { readonly id: AudioSoundId; readonly source: AudioBufferSourceNode; readonly gain: GainNode; readonly pan: StereoPannerNode; }
/** One audio context per Game; no physics-side dependency or per-play MP3 decoding. */
export class SpatialAudioManager {
    private context: AudioContext | null = null;
    private master: GainNode | null = null;
    private readonly buffers = new Map<AudioSoundId, AudioBuffer>();
    private readonly loading = new Map<AudioSoundId, Promise<AudioBuffer | null>>();
    private readonly voices = new Set<Voice>();
    private volume = AUDIO_CONFIG.masterVolume;
    private muted = false;
    private disposed = false;
    private camera: Camera | null = null;

    public setCamera(camera: Camera | null): void { this.camera = camera; }
    public setMasterVolume(value: number): void {
        this.volume = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
        this.applyMasterGain();
    }
    public getMasterVolume(): number { return this.volume; }
    public setMuted(value: boolean): void { this.muted = value; this.applyMasterGain(); }
    public isMuted(): boolean { return this.muted; }
    private applyMasterGain(): void {
        if (this.context && this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.context.currentTime, 0.015);
    }
    /** Must be called during a browser user gesture, e.g. pointerdown. */
    public unlock(): void {
        if (this.disposed) return;
        try {
            if (!this.context) {
                this.context = new AudioContext();
                this.master = this.context.createGain();
                this.master.gain.value = this.muted ? 0 : this.volume;
                this.master.connect(this.context.destination);
            }
            if (this.context.state === "suspended") void this.context.resume().catch(() => {});
        } catch { /* Browser has no usable audio output. Gameplay continues. */ }
    }
    public preload(id: AudioSoundId): Promise<AudioBuffer | null> {
        if (this.disposed) return Promise.resolve(null);
        const existing = this.buffers.get(id);
        if (existing) return Promise.resolve(existing);
        const pending = this.loading.get(id);
        if (pending) return pending;
        const task = (async () => {
            try {
                const response = await fetch(AUDIO_ASSETS[id].url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const bytes = await response.arrayBuffer();
                if (this.disposed) return null;
                this.unlock();
                if (!this.context) return null;
                const decoded = await this.context.decodeAudioData(bytes);
                if (this.disposed) return null;
                this.buffers.set(id, decoded);
                return decoded;
            } catch (error) {
                if (import.meta.env.DEV) console.warn(`[Audio] Failed to load ${id}`, error);
                return null;
            } finally { this.loading.delete(id); }
        })();
        this.loading.set(id, task);
        return task;
    }
    /** Plays a fixed-position one-shot. Future looping voices may update their position. */
    public play(id: AudioSoundId, options: AudioPlaybackOptions = {}): void {
        if (this.disposed) return;
        const buffer = this.buffers.get(id);
        if (!buffer) { void this.preload(id); return; }
        this.unlock();
        const context = this.context;
        if (!context || !this.master || context.state !== "running") return;
        if (this.voices.size >= AUDIO_CONFIG.maximumVoices) return;
        const definition = AUDIO_ASSETS[id];
        if ([...this.voices].filter(voice => voice.id === id).length >= definition.maxVoices) return;
        const spatial = options.position && this.camera ? projectAudioPosition(this.camera, options.position) : { pan: 0, gain: 1 };
        if (spatial.gain <= 0) return;
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = Math.max(0.1, Math.min(4, options.playbackRate ?? 1));
        const gain = context.createGain();
        gain.gain.value = definition.gain * Math.max(0, options.gain ?? 1) * spatial.gain;
        const pan = context.createStereoPanner();
        pan.pan.value = spatial.pan;
        source.connect(gain); gain.connect(pan); pan.connect(this.master);
        const voice: Voice = { id, source, gain, pan };
        this.voices.add(voice);
        source.onended = () => { this.voices.delete(voice); source.disconnect(); gain.disconnect(); pan.disconnect(); };
        try { source.start(); } catch { this.voices.delete(voice); source.disconnect(); gain.disconnect(); pan.disconnect(); }
    }
    /** A controllable one-shot, used for explosions that enter death slow-motion after triggering. */
    public playControlled(id: AudioSoundId, options: AudioPlaybackOptions = {}): AudioVoiceHandle | null {
        if (this.disposed || !this.buffers.has(id)) { void this.preload(id); return null; }
        this.unlock();
        const context = this.context;
        if (!context || !this.master || context.state !== "running" || this.voices.size >= AUDIO_CONFIG.maximumVoices) return null;
        const definition = AUDIO_ASSETS[id];
        if ([...this.voices].filter(v => v.id === id).length >= definition.maxVoices) return null;
        const source = context.createBufferSource(); source.buffer = this.buffers.get(id)!;
        const gain = context.createGain(); const pan = context.createStereoPanner();
        source.connect(gain); gain.connect(pan); pan.connect(this.master);
        const voice: Voice = { id, source, gain, pan }; this.voices.add(voice);
        let ended = false; let multiplier = options.gain ?? 1;
        const cleanup = () => { ended = true; this.voices.delete(voice); source.disconnect(); gain.disconnect(); pan.disconnect(); };
        source.onended = cleanup;
        const update = () => {
            if (ended || !this.context) return;
            const spatial = options.position && this.camera ? projectAudioPosition(this.camera, options.position) : { pan: 0, gain: 1 };
            gain.gain.setTargetAtTime(definition.gain * multiplier * spatial.gain, context.currentTime, 0.025);
            pan.pan.setTargetAtTime(spatial.pan, context.currentTime, 0.025);
        };
        const handle: AudioVoiceHandle = {
            update,
            setPlaybackRate: rate => { if (!ended) source.playbackRate.setTargetAtTime(Math.max(0.1, Math.min(4, rate)), context.currentTime, 0.025); },
            setGain: value => { multiplier = Math.max(0, value); update(); },
            stop: () => { if (!ended) { try { source.stop(); } catch { /* already stopped */ } } },
        };
        source.playbackRate.value = Math.max(0.1, Math.min(4, options.playbackRate ?? 1));
        try { source.start(); update(); } catch { cleanup(); return null; }
        return handle;
    }
    /** A persistent source with an explicit stop handle and camera-following position. */
    public playLoop(id: AudioSoundId, position: () => { x: number; y: number } | null, gainMultiplier = 1): AudioVoiceHandle | null {
        if (this.disposed || !this.buffers.has(id)) { void this.preload(id); return null; }
        this.unlock();
        const context = this.context;
        if (!context || !this.master || context.state !== "running" || this.voices.size >= AUDIO_CONFIG.maximumVoices) return null;
        const definition = AUDIO_ASSETS[id];
        if ([...this.voices].filter(voice => voice.id === id).length >= definition.maxVoices) return null;
        const source = context.createBufferSource();
        source.buffer = this.buffers.get(id)!;
        source.loop = true;
        const gain = context.createGain();
        gain.gain.value = 0;
        const pan = context.createStereoPanner();
        source.connect(gain); gain.connect(pan); pan.connect(this.master);
        const voice: Voice = { id, source, gain, pan };
        this.voices.add(voice);
        let stopped = false;
        let level = gainMultiplier;
        const cleanup = () => { this.voices.delete(voice); source.disconnect(); gain.disconnect(); pan.disconnect(); };
        source.onended = cleanup;
        const update = () => {
            if (stopped || !this.context) return;
            const point = position();
            const spatial = point && this.camera ? projectAudioPosition(this.camera, point) : { pan: 0, gain: point ? 1 : 0 };
            const now = this.context.currentTime;
            gain.gain.setTargetAtTime(definition.gain * level * spatial.gain, now, 0.045);
            pan.pan.setTargetAtTime(spatial.pan, now, 0.045);
        };
        const stop = () => {
            if (stopped) return;
            stopped = true;
            const now = context.currentTime;
            gain.gain.setTargetAtTime(0, now, 0.035);
            try { source.stop(now + 0.16); } catch { cleanup(); }
        };
        try { source.start(); update(); } catch { cleanup(); return null; }
        return { update, stop, setPlaybackRate: rate => { if (!stopped) source.playbackRate.setTargetAtTime(Math.max(0.1, Math.min(4, rate)), context.currentTime, 0.035); }, setGain: value => { level = Math.max(0, value); update(); } };
    }
    /** Non-spatial, centred stereo loop. Does not depend on camera or world coordinates. */
    public playGlobalLoop(id: AudioSoundId, gainMultiplier = 1): AudioVoiceHandle | null {
        if (this.disposed || !this.buffers.has(id)) { void this.preload(id); return null; }
        this.unlock();
        const context = this.context;
        if (!context || !this.master || context.state !== "running" || this.voices.size >= AUDIO_CONFIG.maximumVoices) return null;
        const definition = AUDIO_ASSETS[id];
        if ([...this.voices].filter(v => v.id === id).length >= definition.maxVoices) return null;
        const source = context.createBufferSource(); source.buffer = this.buffers.get(id)!; source.loop = true;
        const gain = context.createGain(); gain.gain.value = 0;
        const pan = context.createStereoPanner(); pan.pan.value = 0;
        source.connect(gain); gain.connect(pan); pan.connect(this.master);
        const voice: Voice = { id, source, gain, pan }; this.voices.add(voice);
        let stopped = false; let level = Math.max(0, gainMultiplier);
        const cleanup = () => { this.voices.delete(voice); source.disconnect(); gain.disconnect(); pan.disconnect(); };
        source.onended = cleanup;
        const update = () => { if (!stopped) gain.gain.setTargetAtTime(definition.gain * level, context.currentTime, 0.06); };
        try { source.start(); update(); } catch { cleanup(); return null; }
        return {
            update,
            setGain: value => { level = Math.max(0, value); update(); },
            setPlaybackRate: rate => { if (!stopped) source.playbackRate.setTargetAtTime(Math.max(0.1, Math.min(4, rate)), context.currentTime, 0.04); },
            stop: () => { if (stopped) return; stopped = true; const now = context.currentTime; gain.gain.setTargetAtTime(0, now, 0.03); try { source.stop(now + 0.15); } catch { cleanup(); } },
        };
    }
    public getActiveVoiceCountExcluding(excluded: readonly AudioSoundId[]): number {
        let count = 0; for (const voice of this.voices) if (!excluded.includes(voice.id)) count++;
        return count;
    }
    public getActiveVoiceCount(): number { return this.voices.size; }
    public dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        for (const voice of this.voices) { try { voice.source.stop(); } catch { /* Already ended. */ } voice.source.disconnect(); voice.gain.disconnect(); voice.pan.disconnect(); }
        this.voices.clear(); this.buffers.clear(); this.loading.clear(); this.camera = null;
        if (this.context) void this.context.close().catch(() => {});
        this.context = null; this.master = null;
    }
}
