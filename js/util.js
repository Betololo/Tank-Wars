/* Utilidades compartilhadas: namespace, RNG com seed, matemática e efeitos sonoros sintetizados. */
window.GB = window.GB || {};

(function (GB) {
  'use strict';

  // ---------- Constantes do mundo ----------
  GB.WORLD_W = 2200;
  GB.WORLD_H = 1000;
  GB.GRAVITY = 420;          // px/s²
  GB.POWER_SCALE = 9.842;    // força (0..100) -> velocidade px/s (+33% de intensidade de disparo)
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

    // ==========================================
    // 1. CONTAGEM REGRESSIVA DO TURNO (TIMER)
    // ==========================================
    timerSubtleTick() {
      if (!this.ctx || !this.enabled) return;
      this.tone(1400, 0.025, 0.035, 'triangle');
    },
    timerTick(sec) {
      if (!this.ctx || !this.enabled) return;
      this.tone(1150, 0.045, 0.08, 'square');
      this.noise(0.02, 3800, 0.04, 'highpass');
    },
    timerUrgent(sec) {
      if (!this.ctx || !this.enabled) return;
      // Beep de alerta urgente nos últimos 5 segundos (frequência cresce de 5s a 1s)
      const f = 780 + Math.max(0, 6 - sec) * 90;
      this.tone(f, 0.08, 0.22, 'sawtooth');
      this.tone(f * 1.5, 0.05, 0.12, 'square');
    },
    timerTimeout() {
      if (!this.ctx || !this.enabled) return;
      // Buzzer descendente de tempo esgotado
      this.tone(360, 0.28, 0.25, 'sawtooth', 120);
      this.noise(0.22, 1200, 0.18);
    },

    // ==========================================
    // 2. DISPAROS (SHOOTING POR MOBILE E TIPO)
    // ==========================================
    shootMortar(isT2) {
      // Canhão de artilharia pesado: estrondo metálico com sub-grave
      this.noise(0.35, isT2 ? 2200 : 1800, isT2 ? 0.65 : 0.5);
      this.tone(180, 0.28, 0.4, 'sawtooth', 45);
      this.tone(90, 0.35, 0.35, 'sine', 30);
    },
    shootMissile(isT2) {
      // Yeti: ignição e silvo de foguete pressurizado
      this.noise(0.28, 3800, 0.38, 'bandpass');
      this.tone(480, 0.16, 0.22, 'sawtooth', 160);
      this.tone(240, 0.22, 0.2, 'triangle', 80);
    },
    shootGrub(isT2) {
      // Worm: lançamento orgânico biônico / estalo e assobio
      this.tone(300, 0.15, 0.28, 'sine', 840);
      this.tone(560, 0.12, 0.18, 'triangle', 220);
      this.noise(0.12, 1600, 0.25);
    },
    shootLightning(isT2) {
      // Doc: arco elétrico de plasma / descarga de alta voltagem
      this.tone(1800, 0.14, 0.3, 'sawtooth', 280);
      this.tone(950, 0.18, 0.22, 'square', 140);
      this.noise(0.18, 4800, 0.4, 'highpass');
    },
    shootIce(isT2) {
      // Frigo: estilhaço de gelo cristalino / tiro sub-zero
      this.tone(2600, 0.16, 0.25, 'triangle', 650);
      this.noise(0.25, 4200, 0.32, 'bandpass');
      this.tone(360, 0.2, 0.22, 'sawtooth', 110);
    },
    shootAduka(isT2) {
      // Kuda: blaster de partículas sci-fi / pulso de fótons
      this.tone(1650, 0.18, 0.32, 'sawtooth', 220);
      this.tone(820, 0.15, 0.22, 'square', 380);
      this.noise(0.12, 3000, 0.22);
    },
    shootThor() {
      // Disparo do satélite orbital Thor
      this.tone(2200, 0.35, 0.45, 'sawtooth', 280);
      this.tone(1100, 0.4, 0.35, 'square', 140);
      this.boom(1.6);
      this.noise(0.3, 5000, 0.4, 'highpass');
    },
    shootDriller(isT2) {
      // Driller: pistão pneumático com rotação de broca mecânica
      this.noise(0.34, 2400, 0.5);
      this.tone(280, 0.25, 0.38, 'sawtooth', 75);
      this.tone(640, 0.12, 0.25, 'square', 320);
    },
    shootTrico(isT2) {
      // Khan: canhão triplo mecânico percussivo
      this.noise(0.26, 2800, 0.45);
      this.tone(240, 0.2, 0.35, 'sawtooth', 85);
      this.tone(520, 0.1, 0.2, 'triangle', 260);
    },
    shootTurtle(isT2) {
      // DJ: mola synth retrô / impacto elástico aquático
      this.tone(260, 0.22, 0.32, 'sine', 720);
      this.tone(520, 0.15, 0.22, 'triangle', 220);
      this.noise(0.08, 1500, 0.18);
    },
    shootMage(isT2) {
      // Launcher: vórtex arcano mágico
      this.tone(920, 0.22, 0.28, 'triangle', 320);
      this.tone(1380, 0.18, 0.2, 'sine', 460);
      this.noise(0.2, 2600, 0.28);
    },
    shootSS(mobId) {
      // Tiro Especial (SS): carga monumental com ressonância cósmica e explosão colossal
      this.boom(2.0);
      this.tone(110, 0.65, 0.5, 'sawtooth', 35);
      [440, 660, 880, 1320].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 0.22, 'sawtooth'), i * 38));
      this.noise(0.45, 2900, 0.55);
    },
    shootTeleport() {
      // Lançamento do projétil de Teletransporte
      this.tone(420, 0.25, 0.32, 'sine', 1600);
      this.tone(1250, 0.2, 0.22, 'triangle', 280);
      this.noise(0.2, 2400, 0.25);
    },
    shootNuclear() {
      // Lançamento da Ogiva Nuclear
      this.noise(0.55, 1700, 0.65);
      this.tone(130, 0.5, 0.45, 'sawtooth', 35);
      this.tone(750, 0.35, 0.28, 'square', 320);
    },
    shootNapalm() {
      // Lançamento do Napalm Incendiário
      this.noise(0.45, 2700, 0.6);
      this.tone(220, 0.38, 0.38, 'sawtooth', 55);
    },
    shootOnda() {
      // Lançamento da Onda de Choque Sísmica
      this.tone(85, 0.55, 0.55, 'sine', 28);
      this.noise(0.35, 1500, 0.5);
      this.tone(380, 0.28, 0.28, 'triangle', 75);
    },
    playShoot(proj) {
      if (!this.ctx || !this.enabled || !proj) return;
      if (proj.isTeleport) return this.shootTeleport();
      if (proj.isNuclear) return this.shootNuclear();
      if (proj.isNapalm) return this.shootNapalm();
      if (proj.isOnda) return this.shootOnda();

      const mobId = (proj.owner && proj.owner.mobile && proj.owner.mobile.id) || 'armor';
      const isSS = proj.shot && proj.shot.name === 'SS';
      const isT2 = proj.shot && proj.shot.name === 'Tiro 2';

      if (isSS) return this.shootSS(mobId);

      switch (mobId) {
        case 'armor': return this.shootMortar(isT2);
        case 'bigfoot': return this.shootMissile(isT2);
        case 'grub': return this.shootGrub(isT2);
        case 'lightning': return this.shootLightning(isT2);
        case 'ice': return this.shootIce(isT2);
        case 'aduka': return this.shootAduka(isT2);
        case 'driller': return this.shootDriller(isT2);
        case 'trico': return this.shootTrico(isT2);
        case 'turtle': return this.shootTurtle(isT2);
        case 'mage': return this.shootMage(isT2);
        default: return this.fire();
      }
    },

    // ==========================================
    // 3. USO DE ITEM 1 E ITEM 2
    // ==========================================
    itemDual() {
      // Ativação do Dual: sequência dupla ascendente clássica de power-up
      if (!this.ctx || !this.enabled) return;
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.14, 0.18, 'triangle'), i * 50));
      setTimeout(() => this.tone(1318, 0.24, 0.22, 'square'), 200);
    },
    itemDualPlus() {
      // Ativação do Dual+: arpejo amplificado super brilhante
      if (!this.ctx || !this.enabled) return;
      [659, 784, 987, 1318].forEach((f, i) => setTimeout(() => this.tone(f, 0.14, 0.2, 'triangle'), i * 45));
      setTimeout(() => this.tone(1568, 0.26, 0.25, 'square'), 180);
    },
    itemTeleport() {
      // Ativação do Teleporte: onda dimensional suave
      if (!this.ctx || !this.enabled) return;
      this.tone(500, 0.22, 0.22, 'sine', 1400);
      this.tone(920, 0.18, 0.18, 'triangle', 1820);
      this.noise(0.15, 3200, 0.2, 'bandpass');
    },
    itemHeal() {
      // Ativação de Cura: brilho celestial restaurador
      if (!this.ctx || !this.enabled) return;
      [440, 554, 659, 880, 1108].forEach((f, i) => setTimeout(() => this.tone(f, 0.28, 0.2, 'sine'), i * 60));
    },
    itemNuclear() {
      // Sirene tática de alerta nuclear
      if (!this.ctx || !this.enabled) return;
      this.tone(880, 0.12, 0.28, 'sawtooth');
      setTimeout(() => this.tone(700, 0.15, 0.3, 'sawtooth'), 120);
      setTimeout(() => this.tone(880, 0.22, 0.32, 'sawtooth'), 270);
      this.tone(90, 0.45, 0.38, 'sawtooth', 35);
    },
    itemNapalm() {
      // Ignição de napalm incendiário
      if (!this.ctx || !this.enabled) return;
      this.noise(0.35, 2600, 0.5);
      this.tone(280, 0.25, 0.28, 'sawtooth', 620);
    },
    itemSuperDual() {
      // Sobrecarga de Super Dual: arpejo de poder quádruplo
      if (!this.ctx || !this.enabled) return;
      [440, 554, 659, 880, 1108, 1320].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 0.22, 'sawtooth'), i * 40));
      this.tone(140, 0.45, 0.38, 'sawtooth', 55);
    },
    itemShockwave() {
      // Ativação de Onda de Choque: zumbido de pressão sísmica
      if (!this.ctx || !this.enabled) return;
      this.tone(110, 0.38, 0.38, 'sine', 35);
      this.noise(0.25, 1300, 0.32);
      this.tone(480, 0.22, 0.22, 'triangle', 150);
    },
    itemEquip() {
      if (!this.ctx || !this.enabled) return;
      this.tone(880, 0.05, 0.12, 'triangle', 1320);
    },
    itemUnequip() {
      if (!this.ctx || !this.enabled) return;
      this.tone(1100, 0.05, 0.1, 'triangle', 660);
    },

    // ==========================================
    // 3.5. SONS DE LOCOMOÇÃO (RODAS, ESTEIRAS, MOLAS, PATAS, HOVER)
    // ==========================================
    // --- 1. Rodas (Wheels / Tires) ---
    moveWheelsHeavy() {
      // Bigfoot (Yeti): Pneus gigantes off-road / monster truck sobre terra
      if (!this.ctx || !this.enabled) return;
      this.tone(72, 0.048, 0.12, 'triangle', 48);
      this.noise(0.055, 380, 0.16, 'lowpass');
    },
    moveWheelsSkate() {
      // Launcher: Rodas de patins inline com rolamentos rápidos
      if (!this.ctx || !this.enabled) return;
      this.tone(260, 0.04, 0.07, 'sine', 220);
      this.noise(0.04, 1800, 0.10, 'bandpass');
    },

    // --- 2. Esteiras (Tracks / Caterpillar Treads) ---
    moveTracksArmor() {
      // Mortar (Armor): Esteira triangular metálica clássica com roletes
      if (!this.ctx || !this.enabled) return;
      this.tone(380, 0.035, 0.09, 'square', 240);
      this.noise(0.045, 950, 0.14, 'bandpass');
    },
    moveTracksDoc() {
      // Doc: Esteira militar tática com roletes e dentes de aço
      if (!this.ctx || !this.enabled) return;
      this.tone(310, 0.04, 0.10, 'square', 160);
      this.tone(820, 0.025, 0.05, 'triangle');
      this.noise(0.045, 800, 0.12, 'lowpass');
    },
    moveTracksDriller() {
      // Driller: Esteira pesadíssima de escavadeira/mineração e dentes robustos
      if (!this.ctx || !this.enabled) return;
      this.tone(90, 0.055, 0.16, 'sawtooth', 50);
      this.tone(210, 0.04, 0.12, 'square', 120);
      this.noise(0.06, 550, 0.18, 'lowpass');
    },

    // --- 3. Molas (Springs / Fole / Sanfona) ---
    moveSpringDJ() {
      // DJ: Pés de mola helicoidal saltitantes ("boing-boing!")
      if (!this.ctx || !this.enabled) return;
      this.tone(240, 0.075, 0.16, 'sine', 680);
      this.tone(480, 0.045, 0.08, 'triangle', 860);
    },
    moveSpringGrub() {
      // Worm (Grub): Fole sanfonado elástico / compressão de lagarta bio-mecânica
      if (!this.ctx || !this.enabled) return;
      this.tone(340, 0.065, 0.13, 'triangle', 180);
      this.noise(0.045, 1100, 0.12, 'bandpass');
    },

    // --- 4. Patas (Legs / Paws / Articuladas) ---
    moveLegsKhan() {
      // Khan: 6 Patas mecânicas de besouro / passos secos e rápidos no solo
      if (!this.ctx || !this.enabled) return;
      this.tone(620, 0.03, 0.11, 'triangle', 280);
      this.noise(0.02, 3400, 0.15, 'highpass');
    },
    moveLegsKuda() {
      // Kuda: Centopeia mecânica / scuttle veloz de patinhas metálicas sequenciais
      if (!this.ctx || !this.enabled) return;
      this.tone(880, 0.025, 0.08, 'sine', 550);
      this.noise(0.018, 4500, 0.12, 'highpass');
    },
    moveLegsFrigo() {
      // Frigo: Mecha-gorila com patas/punhos dianteiros pesados no chão
      if (!this.ctx || !this.enabled) return;
      this.tone(115, 0.055, 0.17, 'triangle', 55);
      this.tone(440, 0.035, 0.10, 'square', 200);
      this.noise(0.045, 800, 0.16, 'lowpass');
    },

    // --- 5. Os que não têm nada (Hover / Levitando / Deslizando) ---
    moveHover() {
      // Hovercraft / levitação antigravidade / propulsão aérea suave
      if (!this.ctx || !this.enabled) return;
      this.tone(180, 0.065, 0.08, 'sine', 150);
      this.noise(0.05, 2000, 0.09, 'bandpass');
    },

    // Despachante sonoro por Mobile ID:
    playMoveSound(mobileId) {
      if (!this.ctx || !this.enabled) return;
      const now = (this.ctx && this.ctx.currentTime) || 0;
      if (this._lastMoveSoundTime && (now - this._lastMoveSoundTime) < 0.06) return;
      this._lastMoveSoundTime = now;

      const mid = (mobileId || 'armor').toLowerCase();
      switch (mid) {
        // 1. Rodas
        case 'bigfoot':
        case 'yeti':
          return this.moveWheelsHeavy();
        case 'launcher':
          return this.moveWheelsSkate();

        // 2. Esteiras
        case 'armor':
        case 'mortar':
          return this.moveTracksArmor();
        case 'doc':
          return this.moveTracksDoc();
        case 'driller':
          return this.moveTracksDriller();

        // 3. Molas
        case 'dj':
          return this.moveSpringDJ();
        case 'grub':
        case 'worm':
          return this.moveSpringGrub();

        // 4. Patas
        case 'khan':
        case 'nak':
          return this.moveLegsKhan();
        case 'kuda':
          return this.moveLegsKuda();
        case 'frigo':
          return this.moveLegsFrigo();

        // 5. Os que não têm nada / Hover
        default:
          return this.moveHover();
      }
    },

    // ==========================================
    // 4. HABILIDADES DOS AVATARES
    // ==========================================
    avatarShield() {
      // Avatar A: Barreira protetora divina / cristal de escudo
      if (!this.ctx || !this.enabled) return;
      [523, 659, 784, 1046, 1568].forEach((f, i) => setTimeout(() => this.tone(f, 0.32, 0.22, 'triangle'), i * 55));
      this.tone(330, 0.45, 0.28, 'sine', 660);
      this.noise(0.22, 3000, 0.2, 'bandpass');
    },
    avatarWind() {
      // Avatar B: Tempestade e vórtex eólico / ventania uivante
      if (!this.ctx || !this.enabled) return;
      this.noise(0.55, 3400, 0.5, 'bandpass');
      this.tone(360, 0.48, 0.28, 'sine', 920);
      setTimeout(() => this.noise(0.4, 2000, 0.38, 'bandpass'), 120);
    },
    avatarOvercharge() {
      // Avatar C: Fúria de sangue e overcharge de dano
      if (!this.ctx || !this.enabled) return;
      this.noise(0.35, 2200, 0.5);
      this.tone(110, 0.55, 0.48, 'sawtooth', 350);
      this.tone(220, 0.38, 0.32, 'sawtooth', 680);
      setTimeout(() => this.boom(1.3), 60);
    },
    avatarSwap() {
      // Avatar D: Troca dimensional espaço-tempo
      if (!this.ctx || !this.enabled) return;
      this.tone(920, 0.18, 0.32, 'sine', 200);
      setTimeout(() => this.tone(200, 0.24, 0.35, 'sine', 1040), 90);
      this.noise(0.22, 3600, 0.32, 'bandpass');
      setTimeout(() => this.boom(0.5), 100);
    },
    modalOpen() {
      if (!this.ctx || !this.enabled) return;
      this.tone(680, 0.08, 0.14, 'triangle', 1020);
    },
    power() {
      this.itemDual();
    },

    epicNiceShot() {
      [880, 1174, 1568, 1760].forEach((f, i) => setTimeout(() => this.tone(f, 0.24, 0.2, 'triangle'), i * 70));
      GB.speakEpic('Nice shot!!', 1.22, 1.28);
    },
    epicSuperShot() {
      this.boom(2.2);
      this.tone(110, 0.6, 0.45, 'sawtooth', 35);
      [261, 392, 523, 659, 784].forEach((f, i) => setTimeout(() => this.tone(f, 0.28, 0.22, 'sawtooth'), i * 75));
      GB.speakEpic('SUPER SHOT!!!', 1.25, 1.3);
    },
    epicDoubleKill() {
      // Impacto duplo brutal com golpe de metal e onda de choque sísmica
      this.boom(1.7);
      this.tone(180, 0.3, 0.4, 'sawtooth', 60);
      setTimeout(() => {
        this.boom(2.2);
        this.tone(680, 0.4, 0.35, 'square', 120);
        this.tone(140, 0.5, 0.45, 'sawtooth', 40);
      }, 120);
      GB.speakEpic('DOUBLE KILL!!!', 1.25, 1.32);
    },
    epicTripleKill() {
      // Descarga de eletricidade e trovão massivo de 3 estágios
      this.noise(0.25, 3000, 0.4);
      this.tone(440, 0.3, 0.3, 'sawtooth', 880);
      setTimeout(() => {
        this.noise(0.35, 2400, 0.5);
        this.tone(700, 0.35, 0.35, 'sawtooth', 1400);
      }, 90);
      setTimeout(() => {
        this.boom(2.6);
        [440, 660, 880, 1320].forEach((f, i) => setTimeout(() => this.tone(f, 0.28, 0.2, 'sawtooth'), i * 65));
      }, 180);
      GB.speakEpic('TRIPLE KILL!!!', 1.28, 1.35);
    },
    epicTeamWipe() {
      this.boom(2.8);
      this.tone(120, 0.7, 0.5, 'sawtooth', 40);
      [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, 0.25, 'triangle'), i * 110));
      GB.speakEpic('FULL TEAM WIPE!!!', 1.22, 1.25);
    }
  };
  GB.Sfx = Sfx;

  const Bgm = {
    audio: null,
    enabled: true,
    volume: 0.40,
    lastNonZeroVolume: 0.40,
    _started: false,

    init() {
      if (this.audio) return;
      try {
        const saved = localStorage.getItem('gb_bgm_enabled');
        if (saved !== null) this.enabled = saved === '1';
        const savedVol = localStorage.getItem('gb_bgm_volume');
        if (savedVol !== null) {
          const v = parseFloat(savedVol);
          if (!isNaN(v) && v >= 0 && v <= 1) {
            this.volume = v;
            if (v > 0) this.lastNonZeroVolume = v;
          }
        }
      } catch (e) {}

      this.audio = new Audio();
      this.audio.loop = true;
      this.audio.volume = (this.enabled && this.volume > 0) ? this.volume : 0;
      this.audio.preload = 'auto';

      // Seleciona formato OGG ou MP3 com base no suporte do navegador
      const canOgg = this.audio.canPlayType && this.audio.canPlayType('audio/ogg; codecs="vorbis"');
      this.audio.src = canOgg ? 'assets/bgm_theme.ogg' : 'assets/bgm_theme.mp3';
    },

    play() {
      if (!this.enabled || this.volume <= 0) return;
      if (!this.audio) this.init();
      this.audio.volume = this.volume;
      const p = this.audio.play();
      if (p && p.catch) p.catch(() => {});
    },

    pause() {
      if (this.audio) this.audio.pause();
    },

    setVolume(val) {
      if (typeof val === 'string') val = parseFloat(val);
      if (isNaN(val)) return;
      if (val > 1.0) val = val / 100.0;
      val = Math.max(0, Math.min(1, val));

      this.volume = val;
      if (val > 0) {
        this.lastNonZeroVolume = val;
        this.enabled = true;
        try { localStorage.setItem('gb_bgm_enabled', '1'); } catch (e) {}
      } else {
        this.enabled = false;
        try { localStorage.setItem('gb_bgm_enabled', '0'); } catch (e) {}
      }

      if (!this.audio) this.init();
      if (this.audio) {
        this.audio.volume = (this.enabled && this.volume > 0) ? this.volume : 0;
        if (this.enabled && this.volume > 0) {
          if (this.audio.paused && this._started) {
            const p = this.audio.play();
            if (p && p.catch) p.catch(() => {});
          }
        } else {
          this.audio.pause();
        }
      }

      try {
        localStorage.setItem('gb_bgm_volume', this.volume.toFixed(2));
      } catch (e) {}

      this.updateUI();
    },

    getVolume() {
      return this.volume;
    },

    toggle() {
      if (!this.audio) this.init();
      if (this.enabled && this.volume > 0) {
        this.enabled = false;
        try { localStorage.setItem('gb_bgm_enabled', '0'); } catch (e) {}
        this.pause();
      } else {
        this.enabled = true;
        if (this.volume <= 0) {
          this.volume = this.lastNonZeroVolume || 0.40;
          try { localStorage.setItem('gb_bgm_volume', this.volume.toFixed(2)); } catch (e) {}
        }
        try { localStorage.setItem('gb_bgm_enabled', '1'); } catch (e) {}
        if (this.audio) this.audio.volume = this.volume;
        this.play();
      }
      this.updateUI();
      return this.enabled;
    },

    updateUI() {
      const isMuted = !this.enabled || this.volume <= 0;
      const pct = isMuted ? 0 : Math.round(this.volume * 100);
      const icon = isMuted ? '🔇' : (this.volume < 0.45 ? '🔉' : '🎵');

      // Sliders
      ['bgm-slider-menu', 'bgm-slider-pause', 'bgm-slider-lobby', 'bgm-slider-hud'].forEach(id => {
        const slider = document.getElementById(id);
        if (slider) slider.value = Math.round(this.volume * 100);
      });

      // Percentuais
      ['bgm-val-menu', 'bgm-val-pause', 'bgm-val-lobby', 'bgm-val-hud'].forEach(id => {
        const valEl = document.getElementById(id);
        if (valEl) valEl.textContent = pct + '%';
      });

      // Botões de mute/toggle
      ['btn-toggle-bgm', 'btn-pause-bgm', 'btn-lobby-bgm', 'btn-hud-bgm-mute', 'btn-hud-bgm'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.textContent = icon;
        btn.classList.toggle('muted', isMuted);
        btn.setAttribute('aria-label', isMuted ? 'Música silenciada' : `Volume da música: ${pct}%`);
      });

      const hudBtn = document.getElementById('btn-hud-bgm');
      if (hudBtn) {
        hudBtn.title = isMuted ? 'Música: Desligada (Clique para abrir volume)' : `Música: ${pct}% (Clique para ajustar)`;
      }
    },

    handleFirstInteraction() {
      if (this._started) return;
      this._started = true;
      this.init();
      if (this.enabled && this.volume > 0) this.play();
      this.updateUI();
    }
  };
  GB.Bgm = Bgm;

  GB.speakEpic = function (phrase, rate = 1.24, pitch = 1.28) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      // Frase enfática em maiúsculas com pontuação de exclamação para entonação enérgica
      const enthusiasticPhrase = phrase.trim();
      const utt = new SpeechSynthesisUtterance(enthusiasticPhrase);
      utt.rate = rate;
      utt.pitch = pitch;
      utt.volume = 1.0;
      utt.lang = 'en-US';

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length) {
        // Prioriza vozes com timbre mais dinâmico/natural (ex: Natural, Online, Mark, David, Guy, Google)
        const bestVoice = voices.find(v => {
          const n = (v.name || '').toLowerCase();
          return (n.includes('natural') || n.includes('online') || n.includes('neural') || n.includes('guy') || n.includes('mark') || n.includes('google')) && v.lang && v.lang.startsWith('en');
        }) || voices.find(v => v.lang && v.lang.startsWith('en')) || voices[0];
        if (bestVoice) utt.voice = bestVoice;
      }
      window.speechSynthesis.speak(utt);
    } catch (e) {}
  };
})(window.GB);
