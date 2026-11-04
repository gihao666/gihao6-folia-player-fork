/* Folia Session — offline synthesis + playback engine */
(function (global) {
  'use strict';

  const DATA = global.FoliaData;
  const SAMPLE_RATE = 24000;
  const mtof = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeDrumBuffers(ctx) {
    const sr = ctx.sampleRate;
    const kickLength = Math.floor(sr * 0.5);
    const kick = ctx.createBuffer(1, kickLength, sr);
    const kickData = kick.getChannelData(0);
    let phase = 0;
    for (let i = 0; i < kickLength; i++) {
      const t = i / sr;
      const freq = 45 + 118 * Math.exp(-t * 20);
      phase += (Math.PI * 2 * freq) / sr;
      kickData[i] = Math.sin(phase) * Math.exp(-t * 7.5) * 0.95;
    }

    const hatLength = Math.floor(sr * 0.16);
    const hat = ctx.createBuffer(1, hatLength, sr);
    const hatData = hat.getChannelData(0);
    const hatRand = mulberry32(101);
    for (let i = 0; i < hatLength; i++) {
      const t = i / sr;
      hatData[i] = (hatRand() * 2 - 1) * Math.exp(-t * 42) * 0.5;
    }

    const snareLength = Math.floor(sr * 0.24);
    const snare = ctx.createBuffer(1, snareLength, sr);
    const snareData = snare.getChannelData(0);
    const snareRand = mulberry32(211);
    for (let i = 0; i < snareLength; i++) {
      const t = i / sr;
      const noise = (snareRand() * 2 - 1) * Math.exp(-t * 17) * 0.4;
      const body = Math.sin(Math.PI * 2 * 205 * t) * Math.exp(-t * 28) * 0.25;
      snareData[i] = noise + body;
    }

    return { kick, hat, snare };
  }

  function playBuffer(ctx, dest, buffer, time, gain, rate) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate || 1;
    const env = ctx.createGain();
    env.gain.value = gain;
    src.connect(env);
    env.connect(dest);
    src.start(time);
  }

  function createGraph(ctx, bpm) {
    const master = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 20;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.25;
    master.connect(compressor);
    compressor.connect(ctx.destination);

    const reverb = ctx.createGain();
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.62;
    [0.031, 0.053, 0.079, 0.109].forEach((delayTime) => {
      const line = ctx.createDelay(0.4);
      line.delayTime.value = delayTime;
      const damp = ctx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 2600;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.46;
      reverb.connect(line);
      line.connect(damp);
      damp.connect(feedback);
      feedback.connect(line);
      line.connect(reverbReturn);
    });
    reverbReturn.connect(master);

    const delay = ctx.createDelay(2);
    delay.delayTime.value = (60 / bpm) * 0.72;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.3;
    const delayTone = ctx.createBiquadFilter();
    delayTone.type = 'lowpass';
    delayTone.frequency.value = 2500;
    const delayReturn = ctx.createGain();
    delayReturn.gain.value = 0.22;
    delay.connect(delayTone);
    delayTone.connect(feedback);
    feedback.connect(delay);
    delayTone.connect(delayReturn);
    delayReturn.connect(master);

    const music = ctx.createGain();
    const musicReverb = ctx.createGain();
    musicReverb.gain.value = 0.42;
    const musicDelay = ctx.createGain();
    musicDelay.gain.value = 0.2;
    music.connect(master);
    music.connect(musicReverb);
    musicReverb.connect(reverb);
    music.connect(musicDelay);
    musicDelay.connect(delay);

    const drums = ctx.createGain();
    const drumReverb = ctx.createGain();
    drumReverb.gain.value = 0.1;
    drums.connect(master);
    drums.connect(drumReverb);
    drumReverb.connect(reverb);

    return { master, music, drums, reverb, delay };
  }

  function pad(ctx, dest, time, dur, notes, gain, brightness) {
    notes.forEach((midi, index) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = mtof(midi);
      osc.detune.value = index % 2 === 0 ? -6 : 6;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.value = 0.6;
      filter.frequency.value = brightness;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, time);
      env.gain.linearRampToValueAtTime(gain, time + Math.min(1.2, dur * 0.35));
      env.gain.setValueAtTime(gain, time + dur * 0.62);
      env.gain.linearRampToValueAtTime(0.0001, time + dur);
      osc.connect(filter);
      filter.connect(env);
      env.connect(dest);
      osc.start(time);
      osc.stop(time + dur + 0.06);
    });
  }

  function bass(ctx, dest, time, dur, midi, gain) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = mtof(midi);
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = mtof(midi - 12);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, time);
    filter.frequency.exponentialRampToValueAtTime(150, time + dur * 0.7);
    filter.Q.value = 1.4;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(gain, time + 0.012);
    env.gain.exponentialRampToValueAtTime(gain * 0.7, time + dur * 0.45);
    env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(filter);
    sub.connect(filter);
    filter.connect(env);
    env.connect(dest);
    osc.start(time);
    sub.start(time);
    osc.stop(time + dur + 0.04);
    sub.stop(time + dur + 0.04);
  }

  function pluck(ctx, dest, time, dur, midi, gain, type) {
    const osc = ctx.createOscillator();
    osc.type = type || 'triangle';
    osc.frequency.value = mtof(midi);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2800;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(gain, time + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(filter);
    filter.connect(env);
    env.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.03);
  }

  function lead(ctx, dest, time, dur, midi, gain) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = mtof(midi);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = 2.6;
    filter.frequency.value = 1900;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, time);
    env.gain.linearRampToValueAtTime(gain, time + 0.05);
    env.gain.setValueAtTime(gain * 0.85, time + dur * 0.6);
    env.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(filter);
    filter.connect(env);
    env.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.04);
  }

  async function renderSong(song) {
    const sampleRate = SAMPLE_RATE;
    const barLength = DATA.barSeconds(song);
    const bars = DATA.totalBars(song);
    const duration = DATA.duration(song);
    const ctx = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);
    const bus = createGraph(ctx, song.bpm);
    const drums = makeDrumBuffers(ctx);
    const kickTimes = [];
    const rand = mulberry32(song.art.seed * 97 + 13);

    for (let barIndex = 0; barIndex < bars; barIndex++) {
      const section = DATA.sectionAtBar(song, barIndex);
      const kind = section.kind;
      const chord = song.progression[barIndex % song.progression.length];
      const time = barIndex * barLength;
      const isFinal = barIndex === bars - 1;
      const tail = isFinal ? 0.55 : 1;

      const padNotes = [
        chord.notes[0] + 12,
        chord.notes[1] + 12,
        chord.notes[3] + 12,
      ].map((note) => (note < 55 ? note + 12 : note));
      const padGain = (kind === 'intro' || kind === 'break' ? 0.052 : 0.036) * tail;
      pad(ctx, bus.music, time, barLength * 1.04, padNotes, padGain, kind === 'chorus' ? 2250 : 1450);

      if (kind === 'outro' && barIndex > bars - 3) continue;

      const arpTones = [];
      chord.notes.forEach((note) => {
        arpTones.push(note + 24);
        arpTones.push(note + 36);
      });
      const arpCount = kind === 'chorus' ? 8 : 4;
      const step = barLength / arpCount;
      for (let i = 0; i < arpCount; i++) {
        const idx = (i * 3 + barIndex) % arpTones.length;
        const gain = (kind === 'break' ? 0.03 : kind === 'intro' ? 0.026 : 0.034) * (0.78 + rand() * 0.22) * tail;
        pluck(ctx, bus.music, time + i * step, step * (kind === 'chorus' ? 1.1 : 1.8), arpTones[idx], gain, 'triangle');
      }

      if (kind === 'verse' || kind === 'chorus' || kind === 'outro') {
        const bassPattern = kind === 'chorus' ? [0, 0, 0, 0] : [0, 0];
        bassPattern.forEach((offset, i) => {
          const start = time + i * (barLength / bassPattern.length);
          bass(ctx, bus.music, start, barLength / (bassPattern.length * 1.15), chord.root + offset, 0.17 * tail);
        });
      }

      if (kind === 'chorus') {
        const pattern = [0, 3, 5, 2];
        const step = barLength / pattern.length;
        for (let i = 0; i < pattern.length; i++) {
          const toneIndex = pattern[i] % chord.notes.length;
          const octave = pattern[i] >= 4 ? 24 : 12;
          const note = chord.notes[toneIndex] + octave;
          const swing = i % 2 === 0 ? 0 : step * 0.05;
          lead(ctx, bus.music, time + i * step + swing, step * 1.1, note, 0.07);
        }
      }

      if (kind === 'verse' && barIndex % 2 === 0) {
        const note = chord.notes[(barIndex + 1) % chord.notes.length] + 24;
        pluck(ctx, bus.music, time + barLength * 0.66, barLength * 0.28, note, 0.04, 'sine');
      }

      if (kind === 'intro' && barIndex === 3) {
        for (let i = 0; i < 8; i++) {
          playBuffer(ctx, bus.drums, drums.hat, time + i * (barLength / 8), 0.14 + i * 0.02, 1.02);
        }
      }

      if (kind === 'verse') {
        playBuffer(ctx, bus.drums, drums.kick, time, 0.55 * tail, 1);
        kickTimes.push({ time, amount: 0.72 });
        playBuffer(ctx, bus.drums, drums.kick, time + barLength * 0.62, 0.42 * tail, 0.97);
        kickTimes.push({ time: time + barLength * 0.62, amount: 0.85 });
        for (let i = 0; i < 4; i++) {
          playBuffer(ctx, bus.drums, drums.hat, time + i * (barLength / 4), i % 2 ? 0.26 : 0.4, 0.95 + (i % 3) * 0.04);
        }
        playBuffer(ctx, bus.drums, drums.snare, time + barLength * 0.5, 0.6 * tail, 1);
      }

      if (kind === 'chorus') {
        for (let i = 0; i < 4; i++) {
          playBuffer(ctx, bus.drums, drums.kick, time + i * (barLength / 4), 0.72 * tail, 1 + (i % 2) * 0.02);
          kickTimes.push({ time: time + i * (barLength / 4), amount: 0.62 });
        }
        playBuffer(ctx, bus.drums, drums.snare, time + barLength * 0.25, 0.9 * tail, 1.01);
        playBuffer(ctx, bus.drums, drums.snare, time + barLength * 0.75, 1 * tail, 0.99);
        for (let i = 0; i < 8; i++) {
          playBuffer(ctx, bus.drums, drums.hat, time + i * (barLength / 8), i % 2 === 0 ? 0.42 : 0.22, 0.96 + (i % 4) * 0.03);
        }
      }

      if (kind === 'break') {
        for (let i = 0; i < 4; i++) {
          playBuffer(ctx, bus.drums, drums.hat, time + i * (barLength / 4), 0.18, 1.05);
        }
      }

      if (kind === 'outro') {
        playBuffer(ctx, bus.drums, drums.kick, time, 0.46 * tail, 0.96);
        kickTimes.push({ time, amount: 0.8 });
      }
    }

    const musicGain = bus.music.gain;
    musicGain.setValueAtTime(1, 0);
    kickTimes.forEach(({ time, amount }) => {
      if (time > duration - 1) return;
      musicGain.setValueAtTime(1, time);
      musicGain.linearRampToValueAtTime(amount, time + 0.045);
      musicGain.linearRampToValueAtTime(1, time + 0.3);
    });

    bus.master.gain.setValueAtTime(0.92, 0);
    bus.master.gain.setValueAtTime(0.92, duration - 2.4);
    bus.master.gain.linearRampToValueAtTime(0.0001, duration - 0.15);

    return ctx.startRendering();
  }

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.analyser = null;
      this.master = null;
      this.buffer = null;
      this.source = null;
      this.songId = null;
      this.offset = 0;
      this.startedAt = 0;
      this.playing = false;
      this.volume = 0.85;
      this.muted = false;
      this.token = 0;
      this.freq = new Uint8Array(128);
      this.raw = new Uint8Array(1024);
      this.onEnded = null;
    }

    ensureContext() {
      if (!this.ctx) {
        const Ctor = global.AudioContext || global.webkitAudioContext;
        if (!Ctor) throw new Error('当前浏览器不支持 Web Audio API');
        this.ctx = new Ctor({ latencyHint: 'interactive' });
        this.master = this.ctx.createGain();
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.82;
        this.master.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
        this.applyVolume();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    }

    applyVolume() {
      if (!this.master) return;
      const value = this.muted ? 0 : this.volume;
      this.master.gain.setTargetAtTime(value, this.ctx.currentTime, 0.02);
    }

    setVolume(value) {
      this.volume = clamp(value, 0, 1);
      if (this.volume > 0) this.muted = false;
      this.applyVolume();
    }

    setMuted(value) {
      this.muted = value;
      this.applyVolume();
    }

    get duration() {
      return this.buffer ? this.buffer.duration : 0;
    }

    get currentTime() {
      if (!this.ctx) return this.offset;
      if (!this.playing) return clamp(this.offset, 0, this.duration || 0);
      return clamp(this.ctx.currentTime - this.startedAt + this.offset, 0, this.duration || 0);
    }

    loadBuffer(buffer, songId) {
      this.stopSource();
      this.buffer = buffer;
      this.songId = songId;
      this.offset = 0;
      this.playing = false;
    }

    stopSource() {
      if (this.source) {
        const source = this.source;
        this.source = null;
        try {
          source.stop();
        } catch (error) {
          void error;
        }
      }
    }

    startSource(offset) {
      const ctx = this.ensureContext();
      this.stopSource();
      const source = ctx.createBufferSource();
      source.buffer = this.buffer;
      source.connect(this.master);
      const token = ++this.token;
      source.onended = () => {
        if (token !== this.token) return;
        if (!this.playing) return;
        this.playing = false;
        this.source = null;
        this.offset = this.duration;
        if (this.onEnded) this.onEnded();
      };
      const safeOffset = clamp(offset, 0, Math.max(0, this.duration - 0.01));
      source.start(0, safeOffset);
      this.source = source;
      this.offset = safeOffset;
      this.startedAt = ctx.currentTime;
      this.playing = true;
    }

    play() {
      if (!this.buffer) return false;
      this.ensureContext();
      if (this.currentTime >= this.duration - 0.05) this.offset = 0;
      this.startSource(this.currentTime);
      return true;
    }

    pause() {
      if (!this.playing) return;
      const time = this.currentTime;
      this.playing = false;
      this.offset = time;
      this.token++;
      this.stopSource();
    }

    seek(time) {
      const target = clamp(time, 0, this.duration || 0);
      if (this.playing) {
        this.startSource(target);
      } else {
        this.offset = target;
      }
    }

    analyse() {
      if (!this.analyser) return this.freq;
      this.analyser.getByteFrequencyData(this.raw);
      const bins = this.freq.length;
      const binCount = this.raw.length;
      const sr = this.ctx ? this.ctx.sampleRate : 44100;
      const nyquist = sr / 2;
      for (let i = 0; i < bins; i++) {
        const low = 24 * Math.pow(760, i / bins);
        const high = 24 * Math.pow(760, (i + 1) / bins);
        const a = Math.min(binCount - 1, Math.floor((low / nyquist) * binCount));
        const b = Math.max(a + 1, Math.min(binCount, Math.ceil((high / nyquist) * binCount)));
        let sum = 0;
        for (let j = a; j < b; j++) sum += this.raw[j];
        const avg = sum / (b - a);
        const shaped = Math.pow(avg / 255, 1.25) * 255;
        this.freq[i] = this.freq[i] * 0.45 + shaped * 0.55;
      }
      return this.freq;
    }

    bands() {
      const data = this.freq;
      const slice = (from, to) => {
        let sum = 0;
        for (let i = from; i < to; i++) sum += data[i];
        return sum / Math.max(1, to - from) / 255;
      };
      const bass = slice(0, 18);
      const mid = slice(18, 62);
      const treble = slice(62, 128);
      return {
        bass: Math.min(1, Math.pow(bass, 0.82) * 1.35),
        mid: Math.min(1, Math.pow(mid, 0.8) * 1.5),
        treble: Math.min(1, Math.pow(treble, 0.7) * 1.8),
        level: Math.min(1, ((bass + mid + treble) / 3) * 1.8),
      };
    }
  }

  global.FoliaAudio = {
    AudioEngine,
    renderSong,
    mtof,
    clamp,
  };
})(window);