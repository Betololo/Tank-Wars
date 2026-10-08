/* Utilidades compartilhadas: namespace, RNG com seed, matemática e efeitos sonoros sintetizados. */
window.GB = window.GB || {};

(function (GB) {
  'use strict';

  // ---------- Constantes do mundo ----------
  GB.WORLD_W = 2200;
  GB.WORLD_H = 1000;
  GB.GRAVITY = 420;          // px/s²
  GB.POWER_SCALE = 7.4;      // força (0..100) -> velocidade px/s
  GB.WIND_ACCEL = 9;         // aceleração por unidade de vento
  GB.TURN_TIME = 20;
  GB.MAX_FUEL = 100;

  GB.MAPS = {
    large: { name: 'Grande', w: 2200, h: 1000 },
    small: { name: 'Pequeno', w: 1200, h: 600 }
  };

  // ---------- RNG determinístico (mulberry32) ----------
  GB.makeRng = function (seed) {
    let a = seed >>> 0;
    const rng = function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    rng.range = (min, max) => min + rng() * (max - min);
    rng.int = (min, max) => Math.floor(min + rng() * (max - min + 1));
    return rng;
  };

  GB.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  GB.lerp = (a, b, t) => a + (b - a) * t;
  GB.rand = (a, b) => a + Math.random() * (b - a);
  GB.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
  GB.DEG = Math.PI / 180;

  // ---------- Áudio sintetizado (WebAudio) ----------
  const Sfx = {
    ctx: null,
    enabled: true,
    init() {
      if (this.ctx) return;
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      } catch (e) { this.enabled = false; }
    },
    resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
    noiseBuffer() {
      if (this._nb) return this._nb;
      const len = this.ctx.sampleRate * 1.5;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this._nb = buf;
      return buf;
    },
    noise(dur, freq, vol, type = 'lowpass') {
      if (!this.ctx || !this.enabled) return;
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer();
      const f = this.ctx.createBiquadFilter();
      f.type = type;
      f.frequency.setValueAtTime(freq, t);
      f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.15), t + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t);
      src.stop(t + dur);
    },
    tone(freq, dur, vol = 0.15, type = 'square', slideTo) {
      if (!this.ctx || !this.enabled) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t);
      o.stop(t + dur);
    },
    fire() { this.noise(0.35, 2200, 0.5); this.tone(180, 0.25, 0.2, 'sawtooth', 60); },
    shot() { this.fire(); },
    laser() { this.tone(1400, 0.18, 0.2, 'sawtooth', 300); this.noise(0.2, 1800, 0.25); },
    boom(size = 1) { this.noise(0.6 + size * 0.5, 900 + size * 300, Math.min(1, 0.55 + size * 0.3)); this.tone(90, 0.5, 0.35, 'sine', 30); },
    click() { this.tone(660, 0.06, 0.08, 'triangle'); },
    tick() { this.tone(1200, 0.04, 0.05, 'square'); },
    turn() { this.tone(520, 0.12, 0.1, 'triangle', 780); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 0.12, 'triangle'), i * 120)); },
    lose() { [392, 330, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 0.12, 'triangle'), i * 160)); },
    charge(p) { this.tone(200 + p * 6, 0.05, 0.03, 'sine'); },
  };
  GB.Sfx = Sfx;
})(window.GB);
