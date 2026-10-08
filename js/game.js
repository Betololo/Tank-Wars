/* Núcleo da partida: turnos, vento, disparos, explosões, câmera, renderização, HUD e sincronização online. */
(function (GB) {
  'use strict';

  const TEAM_COLORS = ['#ff4444', '#3b82f6'];
  const VIEW_H = 600; // altura do mundo visível (antes do zoom)

  class Game {
    constructor(canvas, ui) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ui = ui;
      this.effects = new GB.Effects();
      this.cam = { x: 0, y: 0, zoom: 1, manual: false };
      this.shake = 0;
      this.time = 0;
      this.running = false;
      this.paused = false;
      this.bg = new Image();
      this.bg.src = 'assets/bg.jpg';
      this.windStreaks = Array.from({ length: 22 }, () => ({ x: Math.random(), y: Math.random(), l: GB.rand(20, 60), s: GB.rand(0.6, 1.4) }));
      this.dom = this.cacheDom();
      this.hudCache = {};
      this.netQueue = [];
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.bindInput();
      this.last = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }

    cacheDom() {
      const $ = (id) => document.getElementById(id);
      return {
        hud: $('hud'), controls: $('controls'),
        pc: [$('pc0'), $('pc1')], pcName: [$('pc0-name'), $('pc1-name')], pcHp: [$('pc0-hp'), $('pc1-hp')],
        windArrow: $('wind-arrow'), windVal: $('wind-val'),
        turnName: $('turn-name'), timer: $('timer'),
        angle: $('angle-val'), fuel: $('fuel-fill'),
        power: $('power-fill'), powerLast: $('power-last'),
        shots: [$('shot-0'), $('shot-1'), $('shot-2')], ssFill: $('ss-fill'),
        toast: $('toast'), minimap: $('minimap'),
      };
    }

    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.dpr = dpr;
      this.cw = window.innerWidth;
      this.ch = window.innerHeight;
      this.canvas.width = Math.round(this.cw * dpr);
      this.canvas.height = Math.round(this.ch * dpr);
      let z = this.ch / VIEW_H;
      if (this.cw / z < 900) z = this.cw / 900;
      this.cam.zoom = z;
    }

    initHudCards() {
      const boxA = document.getElementById('hud-team-a');
      const boxB = document.getElementById('hud-team-b');
      if (!boxA || !boxB) return;
      boxA.innerHTML = '';
      boxB.innerHTML = '';
      this.hudCards = [];

      if (this.modeType === 'score') {
        const livesA = document.createElement('div');
        livesA.className = 'team-lives-header team-a';
        livesA.id = 'hud-lives-a';
        boxA.appendChild(livesA);

        const livesB = document.createElement('div');
        livesB.className = 'team-lives-header team-b';
        livesB.id = 'hud-lives-b';
        boxB.appendChild(livesB);
      }

      this.tanks.forEach((tk, i) => {
        const card = document.createElement('div');
        card.className = `player-card ${tk.team === 1 ? 'right' : ''} ${tk.team === 0 ? 'team-a' : 'team-b'}`;
        card.id = `pc-${i}`;
        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
            <span class="pc-name" id="pc-${i}-name" style="color:${tk.color}">${tk.name}</span>
            <span style="font-size:10px; font-weight:700; color:#ffd27a;">${tk.mobile.name}</span>
          </div>
          <div class="hp-bar"><div class="hp-fill" id="pc-${i}-hp" style="background:${tk.color}; width:100%;"></div></div>
          <div class="pc-status-tag" id="pc-${i}-status"></div>
        `;
        if (tk.team === 0) boxA.appendChild(card);
        else boxB.appendChild(card);
        this.hudCards.push({
          card,
          hp: document.getElementById(`pc-${i}-hp`),
          name: document.getElementById(`pc-${i}-name`),
          status: document.getElementById(`pc-${i}-status`)
        });
      });
    }

    // ================= Início da partida =================
    // cfg: { mode, seed, players: [...], mobiles:[a,b], names:[a,b], kinds:['human'|'cpu'|'remote', ...], first, wind, isHost }
    start(cfg) {
      this.cfg = cfg;
      this.modeType = cfg.modeType || 'single_life';
      this.teamLives = { 0: 4, 1: 4 };
      const mapCfg = GB.MAPS[cfg.map] || GB.MAPS.large;
      GB.WORLD_W = mapCfg.w;
      GB.WORLD_H = mapCfg.h;
      this.mode = cfg.mode;
      this.terrain = new GB.Terrain(cfg.seed);
      const tc = this.terrain.theme.dirt;
      this.terrainCss = `rgb(${tc[0]},${tc[1]},${tc[2]})`;
      const rng = GB.makeRng((cfg.seed ^ 0x9e3779b9) >>> 0);

      // Suporte a jogadores configurados em cfg.players (1v1 até 4v4)
      let players = cfg.players;
      if (!players) {
        players = [0, 1].map(i => ({
          mobileId: cfg.mobiles ? cfg.mobiles[i] : 'armor',
          team: i,
          name: cfg.names ? cfg.names[i] : `Jogador ${i + 1}`,
          color: TEAM_COLORS[i],
          kind: cfg.kinds ? cfg.kinds[i] : (i === 0 ? 'human' : 'cpu'),
          items: cfg.items ? (cfg.items[i] || []) : [],
          items2: cfg.items2 ? cfg.items2[i] : null
        }));
      }

      const usedXs = [];
      const pickX = (minF, maxF) => {
        for (let tries = 0; tries < 50; tries++) {
          const x = Math.round(GB.WORLD_W * rng.range(minF, maxF));
          const sy = this.terrain.surfaceBelow(x, 0);
          if (sy > 0 && sy < GB.WORLD_H - 80) {
            if (usedXs.every(ux => Math.abs(ux - x) > 55)) return x;
          }
        }
        return Math.round(GB.WORLD_W * (minF + maxF) / 2);
      };

      const spawnXs = [];
      for (const p of players) {
        const x = p.team === 0 ? pickX(0.08, 0.44) : pickX(0.56, 0.92);
        usedXs.push(x);
        spawnXs.push(x);
      }

      this.tanks = players.map((p, i) => new GB.Tank({
        mobileId: p.mobileId,
        team: p.team,
        name: p.name,
        color: p.team === 0 ? '#ff4444' : '#3b82f6',
        terrain: this.terrain,
        x: spawnXs[i],
        facing: p.team === 0 ? 1 : -1,
      }));

      this.tanks.forEach((t, i) => { 
        const p = players[i];
        t.playerIdx = i;
        t.kind = p.kind; 
        t.shotSel = 0; 
        t.delay = 0;
        t.items = [...(p.items || [])];
        t.items2 = p.items2 || null;
        t.itemsUsed = {};
        t.item2Used = false;
        t.item2Unlocked = false; // Item 2 começa bloqueado até causar 900 de dano
        t.dmgDealt = 0;
        t.hasUsedItem1ThisTurn = false;
        t.respawnTimer = 0;
        t.isWaitingRespawn = false;
        t.respawnTargetX = t.x;
        t.deathShown = false;
      });

      // ========================================================
      // SORTEIO CARA OU COROA E ORDEM INTERCALADA (2v2, 3v3, 4v4)
      // ========================================================
      const startingTeam = (cfg.startingTeam !== undefined) ? cfg.startingTeam : (Math.random() < 0.5 ? 0 : 1);
      this.startingTeam = startingTeam;

      const teamA = this.tanks.filter(t => t.team === 0);
      const teamB = this.tanks.filter(t => t.team === 1);

      // Define quem começa baseado no cara ou coroa
      const firstTeam = startingTeam === 0 ? teamA : teamB;
      const secondTeam = startingTeam === 0 ? teamB : teamA;

      // Intercala perfeitamente os turnos: [Vencedor 1, Perdedor 1, Vencedor 2, Perdedor 2, ...]
      const initialTurnOrder = [];
      const maxSlots = Math.max(firstTeam.length, secondTeam.length);
      for (let s = 0; s < maxSlots; s++) {
        if (firstTeam[s]) initialTurnOrder.push(firstTeam[s]);
        if (secondTeam[s]) initialTurnOrder.push(secondTeam[s]);
      }

      // Atribui os delays iniciais (0, 10, 20, 30...) para garantir a ordem intercalada
      initialTurnOrder.forEach((tank, orderIdx) => {
        tank.delay = orderIdx * 10;
      });

      this.initHudCards();
      this.projectiles = [];
      this.napalms = [];
      this.ondas = [];
      this.robots = [];
      this.drillMines = [];
      this.magDrills = [];
      this.pendingShocks = [];
      this.ssPushes = [];

      this.thor = null;
      const hasKuda = (this.cfg && this.cfg.mobiles && this.cfg.mobiles.includes('kuda')) ||
                      this.tanks.some(t => t.mobileId === 'kuda' || (t.mobile && t.mobile.id === 'kuda'));
      if (hasKuda) {
        let minGroundY = Infinity;
        for (let x = 40; x < this.terrain.W - 40; x += 10) {
          const sy = this.terrain.surfaceBelow(x, 0);
          if (sy > 0 && sy < minGroundY) minGroundY = sy;
        }
        if (minGroundY === Infinity) minGroundY = this.terrain.H * 0.45;
        const thorY = Math.max(50, Math.round(minGroundY - 140));
        const mapW = this.terrain.W || GB.WORLD_W;
        const thorX = (this.cfg && this.cfg.thorX != null)
          ? this.cfg.thorX
          : Math.round(100 + Math.random() * (mapW - 200));
        this.thor = {
          active: true,
          x: thorX,
          y: thorY,
          curY: thorY,
          level: 1,
          dmgThisLevel: 0,
          totalDmg: 0,
          flashTimer: 0
        };
      }
      this.effects.clear();
      this.netQueue = [];
      this.power = 0;
      this.charging = false;
      this.phase = 'intro';
      this.winner = null;
      this.paused = false;
      this.running = true;
      this.windTurns = 0;
      this.windLast = undefined;
      this.wind = cfg.wind || this.newWind();
      this.itemActive = null;
      this.dom.hud.classList.remove('hidden');
      if (this.dom.pcName) {
        this.tanks.forEach((t, i) => {
          if (this.dom.pcName[i]) {
            this.dom.pcName[i].textContent = `${t.name} · ${t.mobile.name}`;
          }
        });
      }
      this.hudCache = {};
      this.wind = cfg.wind || 0;

      // Câmera começa no primeiro jogador a jogar
      const firstTank = initialTurnOrder[0] || this.tanks[0];
      if (firstTank) {
        this.cam.x = firstTank.x - this.cw / this.cam.zoom / 2;
        this.cam.y = firstTank.y - this.ch / this.cam.zoom / 2;
      } else {
        this.cam.x = GB.WORLD_W / 2 - this.cw / this.cam.zoom / 2;
        this.cam.y = 100;
      }
      this.cam.manual = false;

      // Executa animação marcante de Cara ou Coroa no início antes de começar o turno 1
      this.showCoinFlipIntro(startingTeam, firstTank, () => {
        if (this.cfg === cfg && this.running) {
          this.beginTurn();
        }
      });
    }

    showCoinFlipIntro(startingTeam, firstTank, onDone) {
      const modal = document.getElementById('scr-coin-flip');
      const coin = document.getElementById('coin-element');
      const banner = document.getElementById('coin-result-banner');
      const teamEl = document.getElementById('coin-winner-team');
      const descEl = document.getElementById('coin-winner-desc');
      const subEl = document.getElementById('coin-sub');

      const coinWinnerName = startingTeam === 0 ? 'Time A (Vermelho)' : 'Time B (Azul)';
      const coinWinnerColor = startingTeam === 0 ? '#ff4444' : '#3b82f6';

      if (!modal || !coin || !banner) {
        this.toast(`🪙 CARA OU COROA: ${coinWinnerName} começa jogando!`, 3500);
        this.effects.text(GB.WORLD_W / 2, 140, `🪙 ${coinWinnerName.toUpperCase()} COMEÇA!`, coinWinnerColor, true);
        setTimeout(() => onDone(), 1500);
        return;
      }

      // Prepara o estado inicial
      modal.classList.add('active');
      modal.style.opacity = '1';
      banner.classList.remove('visible');
      coin.style.transition = 'none';
      coin.style.transform = 'rotateY(0deg) scale(0.7)';
      coin.classList.remove('landed-a', 'landed-b');
      if (subEl) subEl.textContent = 'Girando moeda... quem jogará primeiro?';

      // Força reflow no navegador
      void coin.offsetHeight;

      // Inicia giro 3D majestoso
      // Time A: 1800deg (termina em face A = 0deg mod 360)
      // Time B: 1980deg (termina em face B = 180deg mod 360)
      const targetDeg = startingTeam === 0 ? 1800 : 1980;
      coin.style.transition = 'transform 2.2s cubic-bezier(0.15, 0.85, 0.35, 1.05)';
      coin.style.transform = `rotateY(${targetDeg}deg) scale(1.15)`;

      // Sons de giro rítmicos durante a moeda no ar
      let tickCount = 0;
      const spinInterval = setInterval(() => {
        if (!this.running) { clearInterval(spinInterval); return; }
        tickCount++;
        GB.Sfx.click();
        if (tickCount >= 10) clearInterval(spinInterval);
      }, 180);

      // Moeda pousa no resultado após ~2.2s
      setTimeout(() => {
        clearInterval(spinInterval);
        if (!this.running) return;

        // Efeito sonoro triunfante e impacto visual
        GB.Sfx.boom(0.35);
        if (GB.Sfx.win) GB.Sfx.win();

        if (startingTeam === 0) {
          coin.classList.add('landed-a');
          if (teamEl) {
            teamEl.textContent = 'TIME A (VERMELHO) VENCEU!';
            teamEl.className = 'coin-winner-team team-a';
          }
        } else {
          coin.classList.add('landed-b');
          if (teamEl) {
            teamEl.textContent = 'TIME B (AZUL) VENCEU!';
            teamEl.className = 'coin-winner-team team-b';
          }
        }

        const firstName = firstTank ? `${firstTank.name} (${firstTank.mobile.name})` : (startingTeam === 0 ? 'Time A' : 'Time B');
        if (descEl) descEl.textContent = `Primeiro turno: ${firstName}`;
        if (subEl) subEl.textContent = 'Sorteio concluído!';

        banner.classList.add('visible');

        this.toast(`🪙 CARA OU COROA: ${coinWinnerName} começa jogando!`, 4000);
        this.effects.text(GB.WORLD_W / 2, 140, `🪙 ${coinWinnerName.toUpperCase()} COMEÇA!`, coinWinnerColor, true);

        // Deixa o banner bem visível e claro por 1.8 segundos antes de fechar suavemente
        setTimeout(() => {
          if (!this.running) return;
          modal.style.transition = 'opacity 0.4s ease';
          modal.style.opacity = '0';

          setTimeout(() => {
            modal.classList.remove('active');
            modal.style.opacity = '1';
            onDone();
          }, 400);
        }, 1800);
      }, 2200);
    }

    stop() {
      this.running = false;
      this.cfg = null;
      this.dom.hud.classList.add('hidden');
      const coinModal = document.getElementById('scr-coin-flip');
      if (coinModal) {
        coinModal.classList.remove('active');
        coinModal.style.opacity = '1';
      }
      GB.Input.releaseAll();
    }

    registerEnemyDamage(attacker, target, dmg) {
      if (!attacker || !target || attacker.team === target.team || dmg <= 0) return;
      attacker.dmgDealt = (attacker.dmgDealt || 0) + dmg;
      if (!attacker.item2Unlocked && attacker.dmgDealt >= 900) {
        attacker.item2Unlocked = true;
        this.toast(`🔓 ${attacker.name} causou 900+ de dano e desbloqueou o Item 2 (${attacker.items2 ? attacker.items2.toUpperCase() : 'ESPECIAL'})!`, 3500);
        GB.Sfx.click();
      }
    }

    get active() { return this.tanks[this.turn]; }
    isMyTurn() { return this.phase === 'aim' && this.active && this.active.kind === 'human'; }

    // ================= Turnos =================
    beginTurn(forcedTurn) {
      if (!this.running) return;
      const { over } = this.checkMatchOver();
      if (over) {
        this.endTurn();
        return;
      }
      if (forcedTurn !== undefined && forcedTurn >= 0 && forcedTurn < this.tanks.length && this.tanks[forcedTurn].alive) {
        this.turn = forcedTurn;
      } else {
        // Sistema de Delay Tank Wars: próximo turno é do jogador vivo com MENOR delay acumulado
        let lowest = Infinity;
        let nextIdx = 0;
        for (let i = 0; i < this.tanks.length; i++) {
          if (this.tanks[i].alive && this.tanks[i].delay < lowest) {
            lowest = this.tanks[i].delay;
            nextIdx = i;
          }
        }
        this.turn = nextIdx;
      }
      
      const t = this.active;
      if (!t || !t.alive) {
        this.endTurn();
        return;
      }

      // Tratamento de jogador congelado (5 stacks de blizzard): perde o turno e reseta
      if (t.blizzardStacks >= 5 || t.frozen) {
        this.toast(`${t.name} está CONGELADO e perdeu o turno!`);
        this.effects.text(t.x, t.y - 45, 'CONGELADO! TURNO PERDIDO', '#79b9e7', true);
        GB.Sfx.boom(0.6);
        this.effects.explosion(t.x, t.y - 12, 40, '#aee2ff', '#1f4875');

        t.blizzardStacks = 0;
        t.defDebuff = 0;
        t.frozen = false;
        t.angle = GB.clamp(t.angle, t.effectiveMinAngle, t.effectiveMaxAngle);

        // Regra do Usuário: Delay do congelado = Maior delay do time inimigo + 1
        let maxEnemyDelay = -Infinity;
        for (const tk of this.tanks) {
          if (tk.alive && tk.team !== t.team) {
            if (tk.delay > maxEnemyDelay) maxEnemyDelay = tk.delay;
          }
        }
        if (maxEnemyDelay !== -Infinity) {
          t.delay = maxEnemyDelay + 1;
        } else {
          t.delay += 1000;
        }

        this.phase = 'settle';
        this.settleT = 0;
        return;
      }

      if (t.ssCooldown > 0) t.ssCooldown--;
      t.fuel = GB.MAX_FUEL;
      this.timer = GB.TURN_TIME;
      this.power = 0;
      this.charging = false;
      this.aiState = null;
      this.cam.manual = false;
      this.lastImpact = null;
      this.aimSendT = 0;
      this.itemActive = null;
      this.itemActive2 = null;
      t.hasUsedItem1ThisTurn = false;
      GB.Input.releaseAll();
      if (this.mode === 'local') {
        this.phase = 'pass';
        this.ui.showPass(t.name, t.color, () => { this.phase = 'aim'; this.toast('Sua vez!'); GB.Sfx.turn(); });
        return;
      }
      this.phase = 'aim';
      if (t.kind === 'cpu') this.aiState = { stage: 'think', t: 0.8 };
      if (t.kind === 'human') { this.toast('Sua vez!'); GB.Sfx.turn(); }
      else this.toast(`Vez de ${t.name}`);
    }

    newWind() {
      if (this.windTurns === undefined) this.windTurns = 0;
      this.windTurns++;
      if (this.windTurns % 6 === 1 || this.windLast === undefined) {
         // Muda bastante
         this.windPrev = this.windLast;
         const m = Math.pow(Math.random(), 1.4) * 12;
         this.windLast = Math.round(m) * (Math.random() < 0.5 ? -1 : 1);
         if (this.windLast === 0) this.windLast = 1;
         
         const combatLog = document.getElementById('combat-log');
         if (combatLog) {
            const div = document.createElement('div');
            div.innerHTML = `<b style="color:#f7c843">Sistema:</b> Vento mudou bastante!`;
            combatLog.prepend(div);
         }
      } else {
         this.windPrev = this.windLast;
         // Muda pouco e mesma direção
         const diff = Math.floor(Math.random() * 3); // 0, 1, 2
         const dir = Math.sign(this.windLast) || 1;
         this.windLast = this.windLast + (diff * dir);
         // Clampa para nunca inverter
         if (Math.sign(this.windLast) !== dir && this.windLast !== 0) this.windLast = dir;
      }
      return this.windLast;
    }

    fire(shotIdx, power, fromRemote, shooterTank) {
      const t = shooterTank || this.active;
      if (!t) return;
      if (!fromRemote && this.phase !== 'aim') return;
      if (shotIdx === 2 && t.ssCooldown > 0) shotIdx = 0;
      
      // Se usar SS, Dual e Dual+ são desativados sem surtir efeito (perdendo o item)
      if (shotIdx === 2 && (this.itemActive === 'dual' || this.itemActive === 'dualplus')) {
         this.itemActive = null;
      }
      
      const shot = t.mobile.shots[shotIdx];
      if (this.mode === 'online') {
        if (!this.cfg.isHost && !fromRemote) {
          // CLIENTE: Envia ordem de disparo ao Servidor (Host)
          this.send({
            t: 'client_fire',
            pIdx: t.playerIdx,
            s: shotIdx,
            p: power,
            a: t.angle,
            f: t.facing,
            x: t.x,
            y: t.y,
            i: this.itemActive,
            i2: this.itemActive2
          });
          // Não retorna aqui: o cliente spawna o projétil visual na própria tela para ver seu tiro voar!
        } else if (this.cfg.isHost && !fromRemote) {
          // SERVIDOR (HOST): Transmite o evento oficial do disparo para todos os clientes
          GB.Net.broadcast({
            t: 'fire_event',
            pIdx: t.playerIdx,
            s: shotIdx,
            p: power,
            a: t.angle,
            f: t.facing,
            x: t.x,
            y: t.y,
            i: this.itemActive,
            i2: this.itemActive2
          });
        }
      }
      t.lastPower = power;
      const isTeleport = this.itemActive === 'teleport';
      if (!isTeleport && shotIdx === 2) t.ssCooldown = 4;
      
      const isNuclear = !isTeleport && this.itemActive2 === 'nuclear';
      const isNapalm = !isTeleport && this.itemActive2 === 'napalm';
      const isOnda = !isTeleport && this.itemActive2 === 'onda';

      let bulletsToLaunch = [];
      let baseBullets = shot.bullets.map(b => ({ off: b.off || 0, pm: b.pm || 1, delay: b.delay || 0, shot, isNuclear, isNapalm, isOnda }));
      
      if (isTeleport) {
        // TELEPORTE: DISPARO ÚNICO com o peso e aerodinâmica do mobile de quem está atirando!
        // Não herda múltiplos projéteis (Bigfoot, Launcher, Grub, Frigo) nem mecânicas de dano.
        const teleportShot = {
          name: 'Teleporte',
          delay: 0,
          r: 14,
          dmg: 0,
          size: 6,
          color: '#ffffff',
          trail: '#80d4ff'
        };
        baseBullets = [{
          off: 0,
          pm: 1.0,
          delay: 0,
          shot: teleportShot,
          isTeleport: true
        }];
        bulletsToLaunch = [...baseBullets];
        this.itemActive = null;
      } else {
        if (isNuclear || isNapalm || isOnda) {
            let overrideShot = { ...shot, bouncy: false }; // Inherit aero properties
            if (isNuclear) { overrideShot.color = '#ff2222'; overrideShot.size = 9; overrideShot.r = 90; }
            else if (isNapalm) { overrideShot.color = '#ff6600'; overrideShot.size = 7; overrideShot.r = 0; }
            else if (isOnda) { overrideShot.color = '#44aaff'; overrideShot.size = 8; overrideShot.r = 0; }
            // Shoot ONLY ONE bullet per attack, inheriting the delay and pm of the first bullet
            baseBullets = [{ off: 0, pm: baseBullets[0].pm, delay: baseBullets[0].delay, shot: overrideShot, isNuclear, isNapalm, isOnda }];
        }

        bulletsToLaunch.push(...baseBullets);

        const activeItem1 = this.itemActive;
        const activeItem2 = this.itemActive2;

        if (activeItem1 === 'dual') {
           bulletsToLaunch.push(...baseBullets.map(b => ({ ...b, delay: b.delay + 0.6 })));
        } else if (activeItem1 === 'dualplus') {
           if (isNuclear || isNapalm || isOnda) {
              bulletsToLaunch.push(...baseBullets.map(b => ({ ...b, delay: b.delay + 0.6 })));
           } else {
              const otherShotIdx = shotIdx === 0 ? 1 : 0;
              const otherShot = t.mobile.shots[otherShotIdx];
              bulletsToLaunch.push(...otherShot.bullets.map(b => ({ off: b.off || 0, pm: b.pm || 1, delay: (b.delay || 0) + 0.6, shot: otherShot, isNuclear, isNapalm, isOnda })));
           }
        }

        if (activeItem2 === 'superdual') {
           const duplicated = bulletsToLaunch.map(b => ({ ...b, delay: b.delay + 1.2 }));
           bulletsToLaunch.push(...duplicated);
        }
      }
      const usedItem1 = isTeleport ? 'teleport' : this.itemActive;
      const usedItem2 = this.itemActive2;
      this.itemActive = null;
      this.itemActive2 = null;

      for (const b of bulletsToLaunch) {
         const ai = t.aimInfo(t.angle + b.off);
         const v = power * b.pm * GB.POWER_SCALE;
         this.projectiles.push(new GB.Projectile({
            owner: t, shot: b.shot, x: ai.mx, y: ai.my, vx: ai.dx * v, vy: ai.dy * v, 
            delay: b.delay, windInfl: t.mobile.windInfl, bouncy: b.shot.bouncy, 
            isTeleport: !!b.isTeleport,
            isNuclear: b.isNuclear, isNapalm: b.isNapalm, isOnda: b.isOnda
         }));
      }

      // Adiciona o delay da ação + tempo gasto
      const timeSpent = Math.max(0, GB.TURN_TIME - this.timer);
      t.delay += (shot.delay || 750) + Math.floor(timeSpent) * 10;

      // DELAY DE ITENS: O DUAL+ TEM DELAY MENOR QUE O DUAL! (250 < 400)
      if (usedItem1 === 'dual') {
        t.delay += 400; // Dual: delay (+400)
      } else if (usedItem1 === 'dualplus') {
        t.delay += 250; // Dual+: DELAY MENOR QUE O DUAL! (+250 < +400)
      } else if (usedItem1 === 'teleport') {
        t.delay += 150;
      }

      if (usedItem2) {
        const delays2 = { 'nuclear': 1500, 'napalm': 1000, 'superdual': 1200, 'onda': 1000 };
        t.delay += (delays2[usedItem2] || 1000);
      }

      const ai = t.aimInfo();
      this.effects.muzzle(ai.mx, ai.my, ai.dx, ai.dy);
      GB.Sfx.fire();
      this.power = power;
      this.charging = false;
      this.phase = 'flight';
      this.cam.manual = false;
      this.flightTime = 0;
    }

    skipTurn(fromRemote) {
      if (this.phase !== 'aim') return;
      if (this.mode === 'online' && !fromRemote) this.send({ t: 'skip' });
      this.charging = false;
      const timeSpent = Math.max(0, GB.TURN_TIME - this.timer);
      this.active.delay += 100 + Math.floor(timeSpent) * 10;
      this.toast('Tempo esgotado!');
      this.phase = 'settle';
      this.settleT = 0;
    }

    explode(p, x, y, final, subOpts) {
      if (p.isTeleport) {
        const oldX = p.owner.x;
        const oldY = p.owner.y;

        // Efeito visual no ponto de partida
        this.effects.explosion(oldX, oldY - 12, 30, '#80d4ff', '#ffffff');
        this.effects.text(oldX, oldY - 35, 'POOF!', '#aaddff', true);

        // Se caiu no abismo abaixo do mundo
        if (y >= GB.WORLD_H) {
          p.owner.x = x;
          p.owner.y = y;
          p.owner.vy = 60;
          p.owner.falling = true;
        } else {
          // Posiciona no ponto de impacto (eleva caso tenha penetrado terreno sólido)
          let landingY = y;
          while (landingY > 0 && this.terrain.isSolid(x, landingY)) {
            landingY--;
          }
          p.owner.x = GB.clamp(x, 15, GB.WORLD_W - 15);
          p.owner.y = landingY;
          p.owner.vy = 0;
          p.owner.falling = true;
          p.owner.updateTilt(true);

          // Efeito visual no ponto de chegada
          this.effects.explosion(p.owner.x, p.owner.y - 12, 36, '#80d4ff', '#ffffff');
          this.effects.text(p.owner.x, p.owner.y - 45, 'TELEPORT!', '#ffffff', true);
        }

        this.shake = Math.min(16, this.shake + 5);
        this.lastImpact = { x: p.owner.x, y: p.owner.y };
        GB.Sfx.boom(0.5);
        return;
      }
      
      if (p.isNuclear) {
        this.terrain.carve(x, y, 100);
        for (const tk of this.tanks) {
          if (!tk.alive) continue;
          const c = tk.center();
          const d = GB.dist(c.x, c.y, x, y);
          if (d < 300) {
             const angle = Math.atan2(y - c.y, x - c.x);
             const pullForce = ((300 - d) / 300) * 80;
             tk.x += Math.cos(angle) * pullForce;
             tk.y += Math.sin(angle) * pullForce - 15;
             tk.falling = true;
             
             let dmgMultiplier = 1 - 0.5 * (Math.max(0, d - tk.mobile.hitR) / 300);
             let nukeDmg = 150 * dmgMultiplier;
             if (p.owner && p.owner.atkDebuff) nukeDmg *= (1 - p.owner.atkDebuff);
             if (tk.defBuff) nukeDmg *= (1 - tk.defBuff);
             if (tk.defDebuff) nukeDmg *= (1 + tk.defDebuff);
             const dealt = tk.damage(nukeDmg);
             if (dealt > 0) {
                this.effects.text(c.x, c.y - 30, '-' + dealt, tk.team === p.owner.team ? '#ffb0b0' : '#fff35c', dealt > 100);
                if (p.owner) this.registerEnemyDamage(p.owner, tk, dealt);
             }
          }
        }
        this.effects.text(x, Math.max(0, y - 60), 'NUCLEAR LAUNCH DETECTED', '#ff2222', true);
        this.effects.explosion(x, y, 100, '#ff2222', '#110000');
        this.shake = Math.min(35, this.shake + 25);
        this.lastImpact = { x, y };
        GB.Sfx.boom(2);
        return;
      } else if (p.isNapalm) {
        if (!this.napalms) this.napalms = [];
        this.napalms.push({ x, y, radius: 70, turnsLeft: 4, damage: 150 });
        this.effects.text(x, Math.max(0, y - 30), 'NAPALM DEPLOYED', '#ff6600', true);
        for(let ex = -70; ex <= 70; ex += 35) {
           this.effects.explosion(x + ex, y, 30, '#ff6600', '#331100');
        }
        this.shake = Math.min(15, this.shake + 5);
        GB.Sfx.boom(0.5);
        return;
      } else if (p.isOnda) {
        if (!this.ondas) this.ondas = [];
        this.ondas.push({ x: x, y: y, dir: 1, speed: 280, life: 2.2 });
        this.ondas.push({ x: x, y: y, dir: -1, speed: 280, life: 2.2 });
        this.effects.text(x, Math.max(0, y - 30), 'TSUNAMI!', '#44aaff', true);
        GB.Sfx.boom(1.2);
        return;
      } else if (p.shot && p.shot.isSSRobot) {
        // Contato direto do SS do Raon Launcher! Conta diretamente como a explosão do robô do SS!
        this.explodeRobot({
          x: x,
          y: y,
          dir: p.vx > 0 ? 1 : -1,
          type: 'ss',
          owner: p.owner,
          dmg: 500
        });
        return;
      } else if (p.shot && p.shot.spawnRobots && !p.shot.isSSRobot) {
        // Contato direto do Tiro 2 do Raon Launcher! Conta como explosão de mini-robô!
        this.explodeRobot({
          x: x,
          y: y,
          dir: p.vx > 0 ? 1 : -1,
          type: 'mini',
          owner: p.owner,
          dmg: p.shot.dmg || 140
        });
        return;
      } else {
         const shot = p.shot;
         const r = (subOpts && subOpts.r) || shot.r;
         const isDocHeal = shot.isDoc_T2 || shot.isDoc_SS;
         const noCarve = shot.isDJ_SS || isDocHeal || shot.isFrigoSS || shot.isDrillerT1 || shot.isDrillerT2 || shot.isDrillerSSMarker || shot.isKudaT2 || (subOpts && subOpts.noCarve);
         if (!noCarve) this.terrain.carve(x, y, r);
         
         if (shot.isDJ_SS) {
             this.effects.explosion(x, y, r * 3, shot.color, this.terrainCss); // Animação maior sem cavar
         } else if (isDocHeal) {
             this.effects.explosion(x, y, r * 1.5, shot.color || '#5cff8a', '#1b5e20');
             for (let i = 0; i < 8; i++) {
               const offX = (Math.random() - 0.5) * r * 1.2;
               const offY = (Math.random() - 0.5) * r * 0.8;
               this.effects.text(x + offX, y + offY, '+', '#5cff8a', true);
             }
         } else if (shot.isFrigoSS) {
             this.effects.explosion(x, y, r * 1.5, '#79b9e7', '#153c63');
             for (let i = 0; i < 10; i++) {
               const offX = (Math.random() - 0.5) * r * 1.5;
               const offY = (Math.random() - 0.5) * r * 0.9;
               this.effects.text(x + offX, y + offY, '❄', '#b3e5fc', true);
             }
         } else if (shot.isFrigoT1 || shot.isFrigoT2) {
             this.effects.explosion(x, y, r * 1.25, shot.color || '#79b9e7', '#153c63');
             this.effects.text(x + (Math.random() - 0.5) * 8, y - 8, '❄', '#b3e5fc', true);
         } else if (shot.isDrillerSSMarker) {
             this.effects.explosion(x, y, 22, '#ff3333', '#ffffff');
             this.effects.text(x, y - 45, 'AIR STRIKE MARCADO!', '#ff3333', true);
             this.triggerDrillerAirStrike(p.owner, x, y);
             GB.Sfx.boom(0.8);
             return;
         } else if (shot.isDrillerT1) {
             this.effects.explosion(x, y, r * 1.2, '#4cb82c', this.terrainCss);
             if (!this.drillMines) this.drillMines = [];
             let sy = this.terrain.surfaceBelow(x, Math.max(0, y - 10));
             let mineY = sy > 0 ? sy + 20 : y + 20;
             this.drillMines.push({
                x: Math.round(x),
                y: Math.round(mineY),
                owner: p.owner,
                hp: 1,
                turnsLeft: 2,
                justPlanted: true
             });
             this.effects.text(x, y - 25, 'MINA PLANTADA!', '#4cb82c', true);
             GB.Sfx.click();
         } else if (shot.isDrillerT2) {
             this.effects.explosion(x, y, r * 1.2, '#ffd700', this.terrainCss);
             if (!this.magDrills) this.magDrills = [];
             this.magDrills.push({
                x: Math.round(x),
                y: Math.round(y),
                owner: p.owner,
                turnsLeft: 3,
                radius: 50
             });
             this.effects.text(x, y - 25, 'BROCA MAGNÉTICA!', '#ffd700', true);
             this.effects.emp(x, y, 50);
             GB.Sfx.boom(0.6);
         } else if (p.isDrillerAirDrill) {
             this.effects.explosion(x, y, r * 1.3, '#ff9933', this.terrainCss);
             this.effects.text(x, y - 35, 'BROCA IMPACTO!', '#ffaa44', true);
         } else if (p.isThorBeam) {
             this.effects.explosion(x, y, 36, '#00e5ff', '#002b4d');
             GB.Sfx.boom(0.7);
         } else if (shot.isKudaT2) {
             this.effects.explosion(x, y, 20, '#ff2c70', '#ffffff');
             this.triggerThorStrike(p.owner, x, y);
             GB.Sfx.click();
             return;
         } else if (shot.isKudaSS) {
             this.effects.explosion(x, y, 36, '#aa33ff', '#330066');
             GB.Sfx.boom(0.8);
             return;
         } else {
             this.effects.explosion(x, y, r, shot.color, this.terrainCss);
         }
         
         this.shake = Math.min(16, this.shake + r * 0.22);
         this.lastImpact = { x, y };
         GB.Sfx.boom(r / 40);

         if (shot.isDJ_T1) {
            if (!this.pendingShocks) this.pendingShocks = [];
            this.pendingShocks.push({ x, y, r: r * 2, time: 0.5, owner: p.owner, dmg: shot.dmg });
         }
      }

      const r = (subOpts && subOpts.r) || p.shot.r;
      const baseDmg = (subOpts && subOpts.dmg != null) ? subOpts.dmg : p.shot.dmg;
      const isDocHeal = p.shot.isDoc_T2 || p.shot.isDoc_SS;
      for (const t of this.tanks) {
        if (!t.alive) continue;
        if (p.shot.isDrillerT2) continue; // O T2 fixa a broca no chão; o dano vem da área de 50px da broca magnética
        const c = t.center();
        const d = GB.dist(c.x, c.y, x, y);
        
        if (p.shot.isDJ_T2 || p.shot.isDJ_SS) {
           const effectR = p.shot.isDJ_SS ? (r * 6.75) : (r * 4);
           const effectReach = effectR + t.mobile.hitR;
           if (d < effectReach) {
              if (p.shot.isDJ_SS) {
                 if (!this.ssPushes) this.ssPushes = [];
                 const targetX = c.x > x ? x + effectReach : x - effectReach;
                 this.ssPushes.push({ tk: t, targetX: targetX, speed: 600 });
              } else {
                 const angle = Math.atan2(c.y - y, c.x - x);
                 const force = ((effectReach - d) / effectReach) * -80;
                 t.x += Math.cos(angle) * force;
                 t.y += Math.sin(angle) * force - 10;
                 t.falling = true;
              }
           }
        }

        const reach = r + t.mobile.hitR;
        if (d >= reach && (!subOpts || subOpts.hitTank !== t)) continue;

        // Disparos curativos do Doc (T2 e SS)
        if (isDocHeal) {
           const healAmt = p.shot.isDoc_SS ? 200 : 100;
           const healed = t.heal(healAmt);
           if (healed > 0) {
              this.effects.text(c.x, c.y - 30, `+${healed} HP`, '#5cff8a', true);
           }
           // Buff de defesa até o máximo de 50%
           const defAdd = p.shot.isDoc_SS ? 0.10 : 0.05;
           const oldDef = t.defBuff || 0;
           if (oldDef < 0.50) {
              t.defBuff = Math.min(0.50, oldDef + defAdd);
              const actualGain = t.defBuff - oldDef;
              this.effects.text(c.x, c.y - 48, `+${Math.round(actualGain * 100)}% DEF (${Math.round(t.defBuff * 100)}%)`, '#4cd3e6', true);
           }
           continue;
        }

        let dmgMultiplier = 1;
        const distFromTankEdge = d - t.mobile.hitR;
        if (distFromTankEdge > 0) {
           dmgMultiplier = 1 - 0.5 * (distFromTankEdge / r);
        }
        
        let finalDmg = baseDmg * dmgMultiplier;
        if (p.shot.isDJ_T1) finalDmg *= 0.3; // Dano simples no impacto, o resto é no choque
        
        // Aplica debuff de ataque de quem atirou
        if (p.owner && p.owner.atkDebuff) {
           finalDmg *= (1 - p.owner.atkDebuff);
        }
        // Aplica buff de defesa de quem foi atingido
        if (t.defBuff) {
           finalDmg *= (1 - t.defBuff);
        }
        // Aplica debuff de defesa de quem foi atingido (recebe mais dano)
        if (t.defDebuff) {
           finalDmg *= (1 + t.defDebuff);
        }

        const dealt = t.damage(finalDmg);
        if (dealt > 0) {
          this.effects.text(c.x, c.y - 30, '-' + dealt, t.team === p.owner.team ? '#ffb0b0' : '#fff35c', dealt > 200);
          if (p.owner) this.registerEnemyDamage(p.owner, t, dealt);
          if (p.isThorBeam) {
            this.addThorExp(dealt);
          }
        }

        // Se for Doc T1: reduz o ataque do alvo em 5% até o máximo de 50%
        if (p.shot.isDoc_T1) {
           const oldAtk = t.atkDebuff || 0;
           if (oldAtk < 0.50) {
              t.atkDebuff = Math.min(0.50, oldAtk + 0.05);
              const actualDebuff = t.atkDebuff - oldAtk;
              this.effects.text(c.x, c.y - 48, `-${Math.round(actualDebuff * 100)}% ATQ (-${Math.round(t.atkDebuff * 100)}%)`, '#ff6b6b', true);
           }
        }

        // Mecânica do Frigo: stacks de Blizzard (1 stack por bolinha de T1 e T2, 3 stacks no SS)
        // Regra do Usuário: "CADA STACK DE FRIGO DEVE APLICAR 15% DE REDUÇÃO DE DEFESA!"
        let blizzardGain = 0;
        if (p.shot.isFrigoT1 || p.shot.isFrigoT2) blizzardGain = 1;
        else if (p.shot.isFrigoSS) blizzardGain = 3;

        if (blizzardGain > 0) {
           const oldStacks = t.blizzardStacks || 0;
           t.blizzardStacks = Math.min(5, oldStacks + blizzardGain);
           t.defDebuff = t.blizzardStacks * 0.15; // 15% por stack acumulado
           const actualGain = t.blizzardStacks - oldStacks;
           t.angle = GB.clamp(t.angle, t.effectiveMinAngle, t.effectiveMaxAngle);
           if (t.blizzardStacks >= 5) {
              t.frozen = true;
              this.effects.text(c.x, c.y - 50, 'CONGELADO! (5/5 ❄)', '#79b9e7', true);
              this.effects.text(c.x, c.y - 68, '-75% DEF (+75% DANO)', '#ff7043', true);
           } else if (actualGain > 0) {
              this.effects.text(c.x, c.y - 50, `+${actualGain} ❄ (${t.blizzardStacks}/5)`, '#79b9e7', true);
              this.effects.text(c.x, c.y - 68, `-${Math.round(t.defDebuff * 100)}% DEF (+${Math.round(t.defDebuff * 100)}% DANO)`, '#ff7043', true);
           }
        }
      }
    
    // Robôs sofrem dano e podem ser destruídos se estiverem no raio da explosão
    if (this.robots) {
       for (const rb of this.robots) {
          if (rb.justSpawned) { rb.justSpawned = false; continue; } // Ignora a própria explosão do tiro que o spawnou
          if (rb.type === 'mini') {
             const d = GB.dist(rb.x, rb.y, x, y);
             if (d <= r + 5) {
                const dmgAmt = (p.shot.dmg || 50); rb.hp -= dmgAmt; if (p.isThorBeam) this.addThorExp(dmgAmt);
             }
          }
       }
    }

    // Minas terrestres do Driller sofrem dano se estiverem no raio da explosão
    if (this.drillMines) {
       for (const m of this.drillMines) {
          if (m.justPlanted) { m.justPlanted = false; continue; }
          const d = GB.dist(m.x, m.y, x, y);
          if (d <= r + 15) {
             const dmgAmt = (p.shot.dmg || 50); m.hp -= dmgAmt; if (p.isThorBeam) this.addThorExp(dmgAmt);
          }
       }
       this.processDrillMines();
    }
  }

    checkMatchOver() {
      if (this.modeType === 'score') {
        const aliveA = this.tanks.filter(t => t.team === 0 && t.alive).length;
        const aliveB = this.tanks.filter(t => t.team === 1 && t.alive).length;
        
        // No modo Score: perde se ficar com todo mundo morto/fora de campo ao mesmo tempo
        const teamAWiped = aliveA === 0;
        const teamBWiped = aliveB === 0;
        
        if (teamAWiped && teamBWiped) {
          return { over: true, winner: -1, alive: [] };
        } else if (teamAWiped) {
          return { over: true, winner: 1, alive: this.tanks.filter(t => t.alive) };
        } else if (teamBWiped) {
          return { over: true, winner: 0, alive: this.tanks.filter(t => t.alive) };
        }
        return { over: false, winner: -1, alive: this.tanks.filter(t => t.alive) };
      }

      // Modo Padrão: Single Life
      const alive = this.tanks.filter((t) => t.alive);
      const teamsAlive = new Set(alive.map(t => t.team));
      const over = teamsAlive.size <= 1;
      const winner = teamsAlive.size === 1 ? alive[0].team : -1;
      return { over, winner, alive };
    }

    processTankDeaths() {
      for (const t of this.tanks) {
        if (!t.alive && !t.deathShown) {
          t.deathShown = true;
          const c = t.center();
          if (!t.fellOff) this.effects.explosion(c.x, c.y, 50, '#ff8a3c', '#333');
          GB.Sfx.boom(1.4);

          if (this.modeType === 'score') {
            const curLives = (this.teamLives && this.teamLives[t.team] != null) ? this.teamLives[t.team] : 4;
            if (curLives > 0) {
              this.teamLives[t.team] = curLives - 1;
              t.isWaitingRespawn = true;
              t.respawnTimer = 4; // Daqui a 4 turnos
              t.respawnTargetX = Math.round(t.x);
              this.toast(t.fellOff
                ? `💀 ${t.name} caiu! (Vidas restantes: ${this.teamLives[t.team]} | Respawn em 4 turnos)`
                : `💀 ${t.name} K.O.! (Vidas restantes: ${this.teamLives[t.team]} | Respawn em 4 turnos)`, 3000);
            } else {
              t.isWaitingRespawn = false;
              this.toast(t.fellOff ? `💀 ${t.name} caiu! Sem vidas de equipe restantes.` : `💀 ${t.name} K.O.! Sem vidas de equipe.`, 3000);
            }
          } else {
            this.toast(t.fellOff ? `${t.name} caiu!` : `${t.name} K.O.!`);
          }
        }
      }
    }

    endTurn() {
      // mortes
      this.processTankDeaths();

      // Processa respawn no modo Score
      if (this.modeType === 'score') {
        for (const t of this.tanks) {
          if (!t.alive && t.isWaitingRespawn) {
            t.respawnTimer--;
            if (t.respawnTimer <= 0) {
              // Renasce o jogador!
              t.alive = true;
              t.hp = t.maxHp;
              t.fuel = GB.MAX_FUEL;
              t.isWaitingRespawn = false;
              t.deathShown = false;
              t.fellOff = false;
              t.x = Math.max(60, Math.min(this.terrain.W - 60, t.respawnTargetX || t.x));
              t.y = 20; // Cai com paraquedas suave
              t.falling = true;
              t.vy = 80;
              
              let maxDelay = 0;
              this.tanks.forEach(o => { if (o.alive && o !== t && o.delay > maxDelay) maxDelay = o.delay; });
              t.delay = maxDelay + 400;

              this.effects.text(t.x, 60, '🪂 RESPAWN!', '#5cff8a', true);
              this.toast(`🪂 ${t.name} renasceu no campo de batalha!`, 3000);
              GB.Sfx.click();
            }
          }
        }
      }

      if (this.mode === 'online' && !this.cfg.isHost) {
        this.phase = 'waitSync';
        return;
      }
      const { over, winner } = this.checkMatchOver();

      // Encontra próximo tanque com menor delay
      let lowest = Infinity;
      let nextIdx = 0;
      for (let i = 0; i < this.tanks.length; i++) {
        if (this.tanks[i].alive && this.tanks[i].delay < lowest) {
          lowest = this.tanks[i].delay;
          nextIdx = i;
        }
      }

      const wind = this.newWind();
      if (this.mode === 'online') {
        this.send({
          t: 'sync', turn: nextIdx, wind, over, winner,
          tanks: this.tanks.map((t) => ({
            x: t.x, y: t.y, hp: t.hp, al: t.alive, ss: t.ssCooldown, f: t.facing, a: t.angle, lp: t.lastPower,
            dd: t.dmgDealt, u2: t.item2Unlocked, i2u: t.item2Used,
            wr: t.isWaitingRespawn, rt: t.respawnTimer, rx: t.respawnTargetX
          })),
          teamLives: this.teamLives,
          delays: this.tanks.map(t => t.delay),
          craters: this.terrain.craters,
          napalms: this.napalms || [],
          ondas: this.ondas || [],
          pendingShocks: (this.pendingShocks || []).map(s => ({
            x: s.x, y: s.y, r: s.r, time: s.time, dmg: s.dmg,
            ownerIdx: (s.owner && s.owner.playerIdx != null) ? s.owner.playerIdx : 0
          })),
          robots: (this.robots || []).map(r => ({
            x: r.x, y: r.y, dir: r.dir, type: r.type, state: r.state, life: r.life,
            hp: r.hp, pendingWalk: r.pendingWalk, dmg: r.dmg, justSpawned: !!r.justSpawned,
            ownerIdx: (r.owner && r.owner.playerIdx != null) ? r.owner.playerIdx : 0
          })),
          drillMines: (this.drillMines || []).map(m => ({
            x: m.x, y: m.y, hp: m.hp, turnsLeft: m.turnsLeft, justPlanted: !!m.justPlanted,
            ownerIdx: (m.owner && m.owner.playerIdx != null) ? m.owner.playerIdx : 0
          })),
          magDrills: (this.magDrills || []).map(d => ({
            x: d.x, y: d.y, radius: d.radius, turnsLeft: d.turnsLeft,
            ownerIdx: (d.owner && d.owner.playerIdx != null) ? d.owner.playerIdx : 0
          })),
          thor: this.thor || null
        });
      }
      if (over) return this.finish(winner);
      this.wind = wind;
      this.beginTurn(nextIdx);
    }

    applySync(m) {
      // Limpa projéteis visuais e destrava fase
      this.projectiles = [];
      this.phase = 'settle';

      // Sincronização inteligente de crateras sem destruir nem recriar o terreno procedural
      if (m.craters && this.terrain) {
        const curCount = this.terrain.craters ? this.terrain.craters.length : 0;
        if (m.craters.length > curCount) {
          for (let i = curCount; i < m.craters.length; i++) {
            const c = m.craters[i];
            if (Array.isArray(c)) {
              if (c[2] < 0) this.terrain.carveFlat(c[0], c[1], -c[2], c[3], false);
              else this.terrain.carve(c[0], c[1], c[2], false);
            } else if (c && c.k === 'col') {
              this.terrain.carveColumns(c.x0, c.t, c.d, false);
            }
          }
          this.terrain.craters = [...m.craters];
        } else if (m.craters.length < curCount) {
          // Se houve rollback raro de terreno
          this.terrain = new GB.Terrain(this.cfg.seed);
          this.terrain.applyCraters(m.craters);
          this.tanks.forEach((t) => { t.terrain = this.terrain; });
        }
      }

      // Atualiza o estado autoritativo absoluto de todos os tanques vindo do Host
      m.tanks.forEach((s, i) => {
        const t = this.tanks[i];
        if (!t) return;
        t.x = s.x; t.y = s.y; t.hp = s.hp; t.ssCooldown = s.ss; t.facing = s.f; t.angle = s.a; t.lastPower = s.lp;
        t.dmgDealt = s.dd || 0;
        t.item2Unlocked = !!s.u2;
        t.item2Used = !!s.i2u;
        t.isWaitingRespawn = !!s.wr;
        t.respawnTimer = s.rt || 0;
        t.respawnTargetX = s.rx || t.x;
        t.alive = !!s.al;
        t.updateTilt(true);
      });
      if (m.teamLives) this.teamLives = m.teamLives;
      this.processTankDeaths();
      this.napalms = m.napalms || [];
      this.ondas = m.ondas || [];
      this.pendingShocks = (m.pendingShocks || []).map(s => ({
        ...s,
        owner: (s.ownerIdx != null && this.tanks[s.ownerIdx]) ? this.tanks[s.ownerIdx] : null
      }));
      this.robots = (m.robots || []).map(r => ({
        ...r,
        owner: (r.ownerIdx != null && this.tanks[r.ownerIdx]) ? this.tanks[r.ownerIdx] : null
      }));
      this.drillMines = (m.drillMines || []).map(dm => ({
        ...dm,
        owner: (dm.ownerIdx != null && this.tanks[dm.ownerIdx]) ? this.tanks[dm.ownerIdx] : null
      }));
      this.magDrills = (m.magDrills || []).map(md => ({
        ...md,
        owner: (md.ownerIdx != null && this.tanks[md.ownerIdx]) ? this.tanks[md.ownerIdx] : null
      }));
      if (m.thor) this.thor = m.thor;
      
      if (m.over) return this.finish(m.winner);
      this.wind = m.wind;
      if (m.delays) {
        this.tanks.forEach((t, i) => { if (m.delays[i] !== undefined) t.delay = m.delays[i]; });
      }
      if (m.turn !== undefined) this.turn = m.turn;
      this.beginTurn(m.turn);
    }

    finish(winner) {
      this.phase = 'over';
      this.winner = winner;
      this.processTankDeaths();
      setTimeout(() => { if (this.running) this.ui.gameOver(winner, this); }, 1600);
    }

    // ================= Rede =================
    send(msg) { GB.Net.send(msg); }

    onNetMessage(m) { this.netQueue.push(m); }

    processNet() {
      while (this.netQueue.length) {
        // SEMPRE consome o pacote do topo: NUNCA deixa a fila entupida!
        const m = this.netQueue.shift();
        if (!m) continue;

        if (m.t === 'sync') {
          // O Servidor enviou o estado final do turno: aplica instantaneamente!
          this.applySync(m);
        } else if (m.t === 'client_fire') {
          // Convidado solicitou disparo: Servidor executa a física autoritativa
          if (this.cfg && this.cfg.isHost) {
            const t = this.tanks[m.pIdx] || this.active;
            if (t) {
              t.x = m.x; t.y = m.y; t.facing = m.f; t.angle = m.a;
              t.updateTilt(true);
              this.itemActive = m.i;
              this.itemActive2 = m.i2;
              // Broadcast para todos os clientes criarem o efeito visual do projétil
              GB.Net.broadcast({
                t: 'fire_event',
                pIdx: t.playerIdx,
                s: m.s,
                p: m.p,
                a: m.a,
                f: m.f,
                x: m.x,
                y: m.y,
                i: m.i,
                i2: m.i2
              });
              this.fire(m.s, m.p, true, t);
            }
          }
        } else if (m.t === 'fire_event') {
          // Se fui eu mesmo que atirei, ignoro (já spawnei meu tiro localmente no instante do disparo)
          const myTank = this.tanks.find(tk => tk.kind === 'human');
          if (myTank && myTank.playerIdx === m.pIdx) {
            // Tiro local já executado
          } else {
            // Servidor ou outro convidado atirou: cliente executa o efeito visual do projétil
            const t = this.tanks[m.pIdx] || this.active;
            if (t) {
              t.x = m.x; t.y = m.y; t.facing = m.f; t.angle = m.a;
              t.updateTilt(true);
              this.itemActive = m.i;
              this.itemActive2 = m.i2;
              this.fire(m.s, m.p, true, t);
            }
          }
        } else if (m.t === 'aim') {
          // Pacote de mira / movimento: aplica ao tanque correspondente
          const t = (m.pIdx !== undefined ? this.tanks[m.pIdx] : null) || this.active;
          if (t && t.kind === 'remote') {
            t.x = m.x; t.y = m.y; t.facing = m.f; t.angle = m.a;
            t.updateTilt(true);
            if (t === this.active) {
              this.power = m.p || 0;
              this.charging = !!m.c;
            }
            if (this.cfg && this.cfg.isHost) {
              GB.Net.broadcast(m);
            }
          }
          // Se não estiver em aim, o pacote foi apenas descartado suavemente sem travar a fila!
        } else if (m.t === 'skip') {
          if (this.phase === 'aim' && this.active && this.active.kind === 'remote') {
            if (this.cfg && this.cfg.isHost) GB.Net.broadcast(m);
            this.skipTurn(true);
          }
        } else if (m.t === 'respawn_pos') {
          if (this.tanks[m.pIdx]) {
            this.tanks[m.pIdx].respawnTargetX = m.x;
          }
          if (this.cfg && this.cfg.isHost) {
            GB.Net.broadcast(m);
          }
        }
      }
    }

    // ================= Entrada =================
    bindInput() {
      const I = GB.Input;

      // Clique no canvas para escolher onde renascer no modo Score
      const canvasEl = document.getElementById('game');
      if (canvasEl && !this._boundRespawnClick) {
        this._boundRespawnClick = true;
        canvasEl.addEventListener('click', (e) => {
          if (this.modeType !== 'score') return;
          const mySlot = (this.cfg && this.cfg.mySlotIdx !== undefined) ? this.cfg.mySlotIdx : 0;
          const myTank = this.tanks.find(t => (this.mode === 'online' ? t.playerIdx === mySlot : t.kind === 'human'));
          if (myTank && !myTank.alive && myTank.isWaitingRespawn) {
            const rect = canvasEl.getBoundingClientRect();
            const sx = (e.clientX - rect.left);
            const wx = (sx - canvasEl.clientWidth / 2) / this.cam.zoom + this.cam.x;
            const targetX = Math.round(Math.max(60, Math.min(this.terrain.W - 60, wx)));
            myTank.respawnTargetX = targetX;
            this.toast(`🎯 Ponto de respawn marcado em X: ${targetX} (Respawn em ${myTank.respawnTimer} turnos)`);
            GB.Sfx.click();
            if (this.mode === 'online') {
              this.send({ t: 'respawn_pos', pIdx: myTank.playerIdx, x: targetX });
            }
          }
        });
      }

      // Clique no minimapa para escolher onde renascer no modo Score
      const mm = this.dom.minimap;
      if (mm && !this._boundMmRespawnClick) {
        this._boundMmRespawnClick = true;
        mm.addEventListener('click', (e) => {
          if (this.modeType !== 'score') return;
          const mySlot = (this.cfg && this.cfg.mySlotIdx !== undefined) ? this.cfg.mySlotIdx : 0;
          const myTank = this.tanks.find(t => (this.mode === 'online' ? t.playerIdx === mySlot : t.kind === 'human'));
          if (myTank && !myTank.alive && myTank.isWaitingRespawn) {
            const rect = mm.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            const targetX = Math.round(Math.max(60, Math.min(this.terrain.W - 60, ratio * GB.WORLD_W)));
            myTank.respawnTargetX = targetX;
            this.toast(`🎯 Ponto de respawn marcado em X: ${targetX} (Respawn em ${myTank.respawnTimer} turnos)`);
            GB.Sfx.click();
            if (this.mode === 'online') {
              this.send({ t: 'respawn_pos', pIdx: myTank.playerIdx, x: targetX });
            }
          }
        });
      }
      I.handlers.fireStart = () => {
        if (!this.isMyTurn() || this.charging) return;
        this.charging = true;
        this.power = 0;
      };
      I.handlers.fireEnd = () => {
        if (!this.isMyTurn() || !this.charging) return;
        this.fire(this.active.shotSel, Math.max(1, this.power));
      };
      I.handlers.shot = (i) => {
        if (!this.isMyTurn()) return;
        const t = this.active;
        if (i === 2 && t.ssCooldown > 0) { this.toast(`SS em cooldown (${t.ssCooldown} turnos)`); return; }
        if (i === 2 && (this.itemActive === 'dual' || this.itemActive === 'dualplus')) {
           this.toast('SS bloqueado pelo Dual!');
           return;
        }
        if (i === 2 && this.itemActive === 'teleport') {
           this.toast('SS bloqueado pelo Teleport!');
           return;
        }
        t.shotSel = i;
        GB.Sfx.click();
      };
      I.handlers.pan = (dx, dy) => {
        if (!this.running) return;
        this.cam.manual = true;
        this.cam.x -= dx / this.cam.zoom;
        this.cam.y -= dy / this.cam.zoom;
      };
      document.getElementById('btn-center').addEventListener('click', () => { this.cam.manual = false; GB.Sfx.click(); });

      // Botões de item
      for (let i = 0; i < 3; i++) {
        document.getElementById(`item-btn-${i}`).addEventListener('click', () => {
          if (!this.isMyTurn() || this.charging) return;
          const t = this.active;
          if (!t) return;
          const item = t.items[i];
          if (!item || (t.itemsUsed && t.itemsUsed[i])) return;
          if (t.hasUsedItem1ThisTurn) {
             this.toast('Você já usou um Item 1 neste turno!');
             return;
          }
          
          GB.Sfx.click();
          t.itemsUsed[i] = true;
          t.hasUsedItem1ThisTurn = true;
          
          if (item === 'dual' || item === 'dualplus') {
            this.itemActive = item;
            this.toast(item === 'dual' ? 'Dual: 2 Tiros do mesmo tipo! (+400 Delay)' : 'Dual+: Tiro Misto (T1 + T2)! (+250 Delay - Menor que o Dual)');
            if (t.shotSel === 2) {
               t.shotSel = 1;
               this.toast('SS bloqueado pelo Dual! Tiro 2 selecionado.');
            }
          } else if (item === 'teleport') {
            this.itemActive = 'teleport';
            this.toast('Teleport: Atire para mover! (+150 Delay)');
            if (t.shotSel === 2) {
               t.shotSel = 1;
               this.toast('SS não afeta Teleport! Tiro 2 selecionado.');
            }
          } else if (item === 'cure') {
            t.delay += 150;
            const heal = t.damage(-t.maxHp * 0.25);
            this.effects.text(t.x, t.y - 30, '+' + (-heal), '#5cff8a', true);
            this.toast('Cura! (+150 Delay)');
            this.skipTurn();
          }
        });
      }

      document.getElementById('item-btn-3').addEventListener('click', () => {
         if (!this.isMyTurn() || this.charging) return;
         const t = this.active;
         if (!t || !t.items2) return;
         if (!t.item2Unlocked) {
            this.toast(`Item 2 bloqueado! Cause 900 de dano a inimigos para desbloquear (${Math.floor(t.dmgDealt || 0)}/900).`);
            return;
         }
         if (t.item2Used) return;
         GB.Sfx.click();
         t.item2Used = true;
         this.itemActive2 = t.items2;
         const delays = { 'nuclear': 1500, 'napalm': 1000, 'superdual': 1200, 'onda': 1000 };
         this.toast(`Ativou ${t.items2.toUpperCase()}! (+${delays[t.items2] || 1000} Delay)`);
         if (t.items2 === 'superdual' && t.shotSel === 2 && (this.itemActive === 'dual' || this.itemActive === 'dualplus')) {
             t.shotSel = 1;
             this.toast('SS bloqueado pelo Dual! Tiro 2 selecionado.');
         }
      });
    }

    // ================= Loop =================
    loop(now) {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (this.running && !(this.paused && this.mode !== 'online')) this.update(dt);
      if (this.running) this.render();
      requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
      this.time += dt;
      if (this.thor && this.thor.active) {
        this.thor.curY = this.thor.y + Math.sin(this.time * 2.5) * 5;
        if (this.thor.flashTimer > 0) {
          this.thor.flashTimer = Math.max(0, this.thor.flashTimer - dt);
        }
      }
      if (this.mode === 'online') {
        this.processNet();
        if (this.phase === 'waitSync') {
          this.waitSyncTimer = (this.waitSyncTimer || 0) + dt;
          if (this.waitSyncTimer > 3.5) {
            console.warn('[Failsafe] waitSync timeout (3.5s). Unblocking phase...');
            this.waitSyncTimer = 0;
            this.phase = 'settle';
            this.settleT = 0;
            this.beginTurn();
          }
        } else {
          this.waitSyncTimer = 0;
        }
      }

      if (this.phase !== 'over' && this.phase !== 'waitSync') {
         const { over } = this.checkMatchOver();
         if (over && (this.phase === 'aim' || this.phase === 'pass')) {
            this.processTankDeaths();
            this.endTurn();
            return;
         }
      }

      const t = this.active;

      for (const tk of this.tanks) {
         tk.speedMult = 1;
         if (this.napalms) {
            for (const n of this.napalms) {
               if (GB.dist(tk.x, tk.y, n.x, n.y) < n.radius + tk.mobile.hitR) { tk.speedMult = 0.2; break; }
            }
         }
         tk.updatePhysics(dt);
      }
      
      this.updateRobots(dt);

      if (this.phase === 'aim' && t) {
        if (!t.alive) { this.phase = 'settle'; this.settleT = 0; }
        else {
          this.timer -= dt;
          if (t.kind === 'human') this.updateHuman(t, dt);
          else if (t.kind === 'cpu') this.updateAI(t, dt);
          if (this.timer <= 0 && t.kind !== 'remote') {
            if (this.charging) this.fire(t.shotSel, Math.max(1, this.power));
            else this.skipTurn();
          }
        }
      } else if (this.phase === 'flight') {
        this.flightTime += dt;
        const cb = { 
           explode: (p, x, y, final, subOpts) => this.explode(p, x, y, final, subOpts), 
           launch: () => GB.Sfx.fire(),
           spawnRobots: (p) => this.spawnRobots(p),
           checkLivingEntity: (x, y) => this.checkLivingEntity(x, y),
           hitKudaSS: (p, target) => this.hitKudaSS(p, target),
           checkKudaLivingTarget: (p) => this.checkKudaLivingTarget(p)
        };
        for (const p of this.projectiles) p.step(dt, this.wind, this.terrain, this.tanks, cb);
        this.projectiles = this.projectiles.filter((p) => !p.dead);
        if (!this.projectiles.length || this.flightTime > 14) {
          this.projectiles = [];
          this.phase = 'settle';
          this.settleT = 0;
        }
      } else if (this.phase === 'settle') {
         if (!this.settleInit) {
             this.settleInit = true;
             if (this.robots) {
                 for (const rb of this.robots) {
                     if (rb.type === 'mini') {
                         let nearest = null;
                         let minDist = 100;
                         for (const tk of this.tanks) {
                             if (!tk.alive || tk.team === rb.owner.team) continue;
                             const d = GB.dist(tk.center().x, tk.center().y, rb.x, rb.y);
                             if (d < minDist) { minDist = d; nearest = tk; }
                         }
                         if (nearest) {
                             rb.state = 'walking';
                             rb.dir = nearest.center().x > rb.x ? 1 : -1;
                             rb.pendingWalk = 34;
                         } else {
                             rb.state = 'idle';
                             rb.pendingWalk = 0;
                         }
                     }
                 }
             }
         }
         
         let hasActiveWaves = false;
         let hasPendingShocks = false;
         let hasSSPushes = false;
         
         if (this.ssPushes && this.ssPushes.length > 0) {
            hasSSPushes = true;
            for (let i = this.ssPushes.length - 1; i >= 0; i--) {
               let push = this.ssPushes[i];
               if (!push.tk.alive) { this.ssPushes.splice(i, 1); continue; }
               
               let dx = push.targetX - push.tk.x;
               let step = Math.sign(dx) * push.speed * dt;
               
               let hitWall = false;
               for (let k = 1; k <= Math.ceil(Math.abs(step)); k++) {
                  if (this.terrain.isSolid(push.tk.x + Math.sign(dx) * k, push.tk.y - 8)) {
                     hitWall = true; break;
                  }
               }

               if (hitWall || Math.abs(step) >= Math.abs(dx)) {
                   if (!hitWall) push.tk.x = push.targetX;
                   this.ssPushes.splice(i, 1);
               } else {
                   push.tk.x += step;
               }
               
               // Adere ao chão sem cair
               let sy = this.terrain.surfaceBelow(push.tk.x, push.tk.y - 15);
               if (sy > 0 && Math.abs(sy - push.tk.y) < 20) {
                   push.tk.y = sy;
               }
            }
         }
         
         if (this.pendingShocks && this.pendingShocks.length > 0) {
            hasPendingShocks = true;
            for (let i = this.pendingShocks.length - 1; i >= 0; i--) {
               const sh = this.pendingShocks[i];
               sh.time -= dt;
               if (sh.time <= 0) {
                  // Eletrecuta (Animação de EMP personalizada)
                  this.effects.emp(sh.x, sh.y, sh.r);
                  this.shake = Math.min(25, this.shake + 10);
                  GB.Sfx.boom(1.2);
                  for (const tk of this.tanks) {
                     if (!tk.alive) continue;
                     const c = tk.center();
                     const d = GB.dist(c.x, c.y, sh.x, sh.y);
                     if (d < sh.r + tk.mobile.hitR) {
                        let shockDmg = sh.dmg;
                        if (sh.owner && sh.owner.atkDebuff) shockDmg *= (1 - sh.owner.atkDebuff);
                        if (tk.defBuff) shockDmg *= (1 - tk.defBuff);
                        if (tk.defDebuff) shockDmg *= (1 + tk.defDebuff);
                        const dealt = tk.damage(shockDmg);
                        if (dealt > 0) this.effects.text(c.x, c.y - 30, '-' + dealt, tk.team === sh.owner.team ? '#ffb0b0' : '#fff35c', dealt > 100);
                     }
                  }
                  this.pendingShocks.splice(i, 1);
               }
            }
         }
         if (this.ondas && this.ondas.length > 0) {
            hasActiveWaves = true;
            for (const w of this.ondas) {
               w.x += w.dir * w.speed * dt;
               w.life -= dt;
               
               let sy = this.terrain.surfaceBelow(w.x, 0);
               if (sy > 0) w.y = GB.lerp(w.y, sy - 20, 10 * dt);
               
               for (const tk of this.tanks) {
                  if (!tk.alive) continue;
                  if (Math.abs(tk.x - w.x) < 55 && Math.abs(tk.y - w.y) < 80) {
                     tk.x += w.dir * w.speed * dt * 1.15;
                     tk.vy = -120;
                     tk.falling = true;
                  }
               }
               
               for (let i = 0; i < 3; i++) {
                  this.effects.parts.push({ t: 'smoke', x: w.x + GB.rand(-15,15), y: w.y + GB.rand(-15,15), vx: w.dir * 30, vy: -50, life: 0.5, max: 0.5, size: 10 + Math.random()*15 });
                  this.effects.parts.push({ t: 'spark', x: w.x + GB.rand(-20,20), y: w.y, vx: w.dir * 80 + GB.rand(-20,20), vy: -100 + GB.rand(-20,20), life: 0.4, max: 0.4, size: 4, color: '#88ccff' });
               }
            }
            this.ondas = this.ondas.filter(w => w.life > 0);
         }

        const falling = this.tanks.some((tk) => tk.alive && tk.falling);
        const hasActiveRobots = this.robots && this.robots.some(r => r.type === 'ss' || (r.type === 'mini' && r.pendingWalk > 0));
        this.settleT = (falling || hasActiveWaves || hasPendingShocks || hasActiveRobots || hasSSPushes) ? 0 : this.settleT + dt;
        if (this.settleT > 0.7) {
            if (this.napalms && this.napalms.length > 0 && !this.napalmProcessed) {
                this.napalmProcessed = true;
                for (const n of this.napalms) {
                    let tops = [];
                    let x0 = Math.round(n.x - n.radius);
                    let count = Math.round(n.radius * 2);
                    for (let i = 0; i < count; i++) {
                        tops.push(this.terrain.surfaceBelow(x0 + i, Math.max(0, n.y - n.radius - 20)));
                    }
                    this.terrain.carveColumns(x0, tops, 90);
                    
                    let sy = this.terrain.surfaceBelow(n.x, Math.max(0, n.y - n.radius));
                    if (sy > 0) {
                        n.y = sy;
                    } else {
                        n.y += 90;
                    }

                    for(let ex = -n.radius; ex <= n.radius; ex += 35) {
                        this.effects.explosion(n.x + ex, n.y, 25, '#ff6600', '#221100');
                    }
                    GB.Sfx.boom(0.5);
                    for (const tk of this.tanks) {
                        if (!tk.alive) continue;
                        if (GB.dist(tk.x, tk.y, n.x, n.y) < n.radius + tk.mobile.hitR) {
                            const dealt = tk.damage(150);
                            if (dealt > 0) this.effects.text(tk.x, tk.y - 30, '-150', '#ffb0b0', false);
                        }
                    }
                    n.turnsLeft--;
                }
                this.napalms = this.napalms.filter(n => n.turnsLeft > 0);
                this.settleT = 0;
            } else if (((this.magDrills && this.magDrills.length > 0) || (this.drillMines && this.drillMines.length > 0)) && !this.deployablesProcessed) {
                this.deployablesProcessed = true;
                const didSomething = this.processDeployables();
                if (didSomething) {
                   this.settleT = 0;
                }
            } else {
                this.napalmProcessed = false;
                this.deployablesProcessed = false;
                this.settleInit = false;
                this.endTurn();
            }
        }
      }

      this.effects.update(dt);
      this.shake = Math.max(0, this.shake - dt * 30);
      this.updateCamera(dt);
      this.updateHud();
    }

    updateRobots(dt) {
      if (!this.robots || !this.robots.length) return;
      for (let i = this.robots.length - 1; i >= 0; i--) {
         const rb = this.robots[i];
         
         if (rb.type === 'ss') {
             rb.life -= dt;
             if (rb.life <= 0) {
                this.explodeRobot(rb);
                this.robots.splice(i, 1);
                continue;
             }
             if (rb.state === 'walking') rb.pendingWalk = 68 * dt; // Dobro da velocidade (34 -> 68)
         } else if (rb.type === 'mini') {
             if (rb.hp <= 0) {
                this.explodeRobot(rb);
                this.robots.splice(i, 1);
                continue;
             }
         }
         
         rb.vy = (rb.vy || 0) + GB.GRAVITY * dt;
         rb.y += rb.vy * dt;
         
         // Caiu para fora do mapa? Explode e sai
         if (rb.x < -80 || rb.x > GB.WORLD_W + 80 || rb.y > GB.WORLD_H + 60) {
            this.explodeRobot(rb);
            this.robots.splice(i, 1);
            continue;
         }
         
         let grounded = false;
         for (let k = 0; k < 8; k++) {
             if (this.terrain.isSolid(rb.x, rb.y - 1)) {
                 rb.y -= 1;
                 rb.vy = 0;
                 grounded = true;
             } else {
                 break;
             }
         }
         if (!grounded && this.terrain.isSolid(rb.x, rb.y + 2)) {
             grounded = true;
             rb.vy = 0;
         }

         if (rb.state === 'walking' && rb.pendingWalk > 0) {
            let step = rb.type === 'ss' ? rb.pendingWalk : Math.min(rb.pendingWalk, 120 * dt);
            
            let nx = rb.x + (rb.dir * step);
            
            let hitWall = false;
            for (let k = 1; k <= Math.ceil(step); k++) {
               if (this.terrain.isSolid(rb.x + rb.dir * k, rb.y - 6)) {
                  hitWall = true; break;
               }
            }
            
            if (hitWall) {
               rb.dir *= -1; // Reverse
               nx = rb.x + (rb.dir * step);
            }
            
            rb.x = nx;
            rb.pendingWalk -= step;
            
            if (grounded && !this.terrain.isSolid(rb.x, rb.y + 2)) {
               let sy = this.terrain.surfaceBelow(rb.x, rb.y - 5);
               if (sy > 0 && sy - rb.y <= 10) {
                   rb.y = sy;
               }
            }
         }
         
         let hitTank = false;
         for (const tk of this.tanks) {
            if (!tk.alive) continue;
            if (GB.dist(tk.center().x, tk.center().y, rb.x, rb.y) < tk.mobile.hitR + 8) {
               hitTank = true;
               break;
            }
         }
         
         if (hitTank) {
            this.explodeRobot(rb);
            this.robots.splice(i, 1);
         }
      }
    }

    explodeRobot(rb) {
       const r = rb.type === 'ss' ? 45 : 25;
       this.terrain.carve(rb.x, rb.y, r);
       this.effects.explosion(rb.x, rb.y, r, rb.type === 'ss' ? '#ff4040' : '#7ad4ff', this.terrainCss);
       this.shake = Math.min(16, this.shake + r * 0.22);
       GB.Sfx.boom(r / 40);
       this.lastImpact = { x: rb.x, y: rb.y };
       
       for (const t of this.tanks) {
           if (!t.alive) continue;
           const c = t.center();
           const d = GB.dist(c.x, c.y, rb.x, rb.y);
           const reach = r + t.mobile.hitR;
           if (d >= reach) continue;
           
           let dmgMultiplier = 1;
           const distFromTankEdge = d - t.mobile.hitR;
           if (distFromTankEdge > 0) {
              dmgMultiplier = 1 - 0.5 * (distFromTankEdge / r);
           }
           
           let rbDmg = rb.dmg * dmgMultiplier;
           if (rb.owner && rb.owner.atkDebuff) rbDmg *= (1 - rb.owner.atkDebuff);
           if (t.defBuff) rbDmg *= (1 - t.defBuff);
           if (t.defDebuff) rbDmg *= (1 + t.defDebuff);
           const dealt = t.damage(rbDmg);
           if (dealt > 0) {
             const isFriendly = rb.owner ? (t.team === rb.owner.team) : false;
             this.effects.text(c.x, c.y - 30, '-' + dealt, isFriendly ? '#ffb0b0' : '#fff35c', dealt > 100);
             if (rb.owner) this.registerEnemyDamage(rb.owner, t, dealt);
           }
       }
    }

    spawnRobots(p) {
        if (!this.robots) this.robots = [];
        const count = p.shot.spawnRobots;
        const isSS = p.shot.isSSRobot;
        const dir = p.vx > 0 ? 1 : -1;
        
        let rx = p.x;
        let ry = p.y - 2; // Spawns slightly above impact point to allow gravity to settle it
        
        for (let i = 0; i < count; i++) {
            this.robots.push({
               x: rx + (i * 20 * (dir * -1)),
               y: ry,
               dir: dir,
               type: isSS ? 'ss' : 'mini',
               state: isSS ? 'walking' : 'idle',
               life: isSS ? 6.0 : Infinity,
               hp: isSS ? 9999 : 1,
               pendingWalk: 0,
               owner: p.owner,
               dmg: isSS ? 500 : 140,
               justSpawned: true
            });
        }
        GB.Sfx.click();
    }

    checkLivingEntity(x, y) {
      if (this.robots) {
        for (const rb of this.robots) {
          if (rb.hp > 0 && GB.dist(rb.x, rb.y, x, y) < 14) {
             rb.hp -= 220;
             return true;
          }
        }
      }
      if (this.drillMines) {
        for (const m of this.drillMines) {
          if (m.hp > 0 && GB.dist(m.x, m.y, x, y) < 16) {
             m.hp -= 220;
             return true;
          }
        }
      }
      return false;
    }

    triggerDrillerAirStrike(owner, targetX, targetY) {
      const offsets = [-20, -10, 10, 20];
      const dir = (owner && owner.facing < 0) ? -1 : 1;
      const startY = -120;
      const tFlight = 0.82;
      const g = GB.GRAVITY;

      const airShot = {
         name: 'Broca Aérea',
         delay: 0,
         r: 38,
         dmg: 220,
         size: 7,
         color: '#b0bcc8',
         trail: '#ff8833',
         isDrillerAirDrill: true
      };

      offsets.forEach((off, idx) => {
         const destX = targetX + off;
         const destY = targetY;
         const startX = destX - dir * 130;

         const vx = (destX - startX) / tFlight;
         const vy = (destY - startY - 0.5 * g * tFlight * tFlight) / tFlight;

         this.projectiles.push(new GB.Projectile({
            owner: owner,
            shot: airShot,
            x: startX,
            y: startY,
            vx: vx,
            vy: vy,
            delay: idx * 0.12,
            windInfl: 0,
            isDrillerAirDrill: true
         }));
      });
      GB.Sfx.boom(0.9);
    }

    triggerThorStrike(owner, targetX, targetY) {
      if (!this.thor) {
        const mapW = (this.terrain && this.terrain.W) || GB.WORLD_W;
        this.thor = {
          active: true,
          x: Math.round(100 + Math.random() * (mapW - 200)),
          y: 70,
          level: 1,
          dmgThisLevel: 0,
          totalDmg: 0,
          flashTimer: 0
        };
      }
      this.thor.flashTimer = 0.4;
      const lvl = this.thor.level || 1;
      const dmg = (GB.THOR && GB.THOR.DAMAGE) ? (GB.THOR.DAMAGE[lvl] || 40) : 40;

      const thorShot = {
        name: `Thor Raio Nv.${lvl}`,
        delay: 0,
        r: 21,
        dmg: dmg,
        size: 7,
        color: '#00e5ff',
        trail: '#80f0ff',
        isThorBeam: true
      };

      const thorX = this.thor.x;
      const thorY = (this.thor.curY != null) ? this.thor.curY : this.thor.y;
      const angle = Math.atan2(targetY - thorY, targetX - thorX);
      const speed = 900;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.projectiles.push(new GB.Projectile({
        owner: owner,
        shot: thorShot,
        x: thorX,
        y: thorY,
        vx: vx,
        vy: vy,
        targetX: targetX,
        targetY: targetY,
        thorX: thorX,
        thorY: thorY,
        isThorBeam: true
      }));

      GB.Sfx.fire();
    }

    addThorExp(dmg) {
      if (!this.thor || !this.thor.active) return;
      if (this.thor.level >= GB.THOR.MAX_LEVEL) return;
      this.thor.dmgThisLevel = (this.thor.dmgThisLevel || 0) + dmg;
      this.thor.totalDmg = (this.thor.totalDmg || 0) + dmg;

      while (this.thor.level < GB.THOR.MAX_LEVEL) {
        const needed = GB.THOR.EXP_NEEDED[this.thor.level];
        if (this.thor.dmgThisLevel >= needed) {
          this.thor.dmgThisLevel -= needed;
          this.thor.level++;
          this.toast(`THOR SUBIU PARA O NÍVEL ${this.thor.level}!`);
          const curY = (this.thor.curY != null) ? this.thor.curY : this.thor.y;
          this.effects.text(this.thor.x, curY + 35, `LEVEL UP! NV ${this.thor.level}`, '#00e5ff', true);
          this.effects.emp(this.thor.x, curY, 80);
          GB.Sfx.boom(1.2);
        } else {
          break;
        }
      }
    }

    hitKudaSS(p, t) {
      if (!t.alive) return;
      const c = t.center();
      let dmg = 150;
      if (p.owner && p.owner.atkDebuff) dmg *= (1 - p.owner.atkDebuff);
      if (t.defBuff) dmg *= (1 - t.defBuff);
      if (t.defDebuff) dmg *= (1 + t.defDebuff);
      const dealt = t.damage(dmg);
      if (dealt > 0) {
        this.effects.text(c.x, c.y - 30, '-' + dealt, t.team === p.owner.team ? '#ffb0b0' : '#fff35c', dealt > 100);
        if (p.owner) this.registerEnemyDamage(p.owner, t, dealt);
      }
      this.effects.explosion(c.x, c.y, 24, '#aa33ff', '#330066');
      this.triggerThorStrike(p.owner, c.x, c.y);
      GB.Sfx.boom(0.5);
    }

    checkKudaLivingTarget(p) {
      if (!p.hitLivingEntities) p.hitLivingEntities = new Set();
      if (this.robots) {
        for (const rb of this.robots) {
          if (p.hitLivingEntities.has(rb)) continue;
          const d = GB.dist(rb.x, rb.y, p.x, p.y);
          if (d <= 20) {
            p.hitLivingEntities.add(rb);
            rb.hp -= 150;
            this.effects.explosion(rb.x, rb.y, 20, '#aa33ff', '#330066');
            this.effects.text(rb.x, rb.y - 25, '-150', '#fff35c');
            this.triggerThorStrike(p.owner, rb.x, rb.y);
            GB.Sfx.boom(0.4);
          }
        }
      }
      if (this.drillMines) {
        for (const m of this.drillMines) {
          if (p.hitLivingEntities.has(m)) continue;
          const d = GB.dist(m.x, m.y, p.x, p.y);
          if (d <= 20) {
            p.hitLivingEntities.add(m);
            m.hp -= 150;
            this.effects.explosion(m.x, m.y, 20, '#aa33ff', '#330066');
            this.effects.text(m.x, m.y - 25, '-150', '#fff35c');
            this.triggerThorStrike(p.owner, m.x, m.y);
            GB.Sfx.boom(0.4);
          }
        }
        this.processDrillMines();
      }
    }

    explodeDrillMine(mine) {
       const r = 50;
       // Cava área circular de raio 50px
       this.terrain.carve(mine.x, mine.y, 50);
       this.effects.explosion(mine.x, mine.y, 50, '#ff8a3c', this.terrainCss);
       this.effects.text(mine.x, mine.y - 30, 'MINA BOOM!', '#ffaa44', true);
       this.shake = Math.min(22, this.shake + 12);
       GB.Sfx.boom(1.3);

       for (const t of this.tanks) {
          if (!t.alive) continue;
          const c = t.center();
          const d = GB.dist(c.x, c.y, mine.x, mine.y);
          const reach = r + t.mobile.hitR;
          if (d >= reach) continue;
          let dmgMultiplier = 1;
          const distFromTankEdge = d - t.mobile.hitR;
          if (distFromTankEdge > 0) dmgMultiplier = 1 - 0.5 * (distFromTankEdge / r);
          let finalDmg = 300 * dmgMultiplier;
          if (mine.owner && mine.owner.atkDebuff) finalDmg *= (1 - mine.owner.atkDebuff);
          if (t.defBuff) finalDmg *= (1 - t.defBuff);
          if (t.defDebuff) finalDmg *= (1 + t.defDebuff);
          const dealt = t.damage(finalDmg);
          if (dealt > 0) {
             this.effects.text(c.x, c.y - 30, '-' + dealt, t.team === (mine.owner ? mine.owner.team : -1) ? '#ffb0b0' : '#fff35c', dealt > 200);
          }
       }

       if (this.robots) {
          for (const rb of this.robots) {
             if (GB.dist(rb.x, rb.y, mine.x, mine.y) <= r + 10) rb.hp -= 300;
          }
       }
       if (this.drillMines) {
          for (const otherMine of this.drillMines) {
             if (otherMine !== mine && GB.dist(otherMine.x, otherMine.y, mine.x, mine.y) <= r + 15) {
                otherMine.hp -= 300;
             }
          }
       }
    }

    processDrillMines() {
       if (!this.drillMines || !this.drillMines.length) return;
       let explodedAny = false;
       for (let i = this.drillMines.length - 1; i >= 0; i--) {
          const mine = this.drillMines[i];
          if (mine.hp <= 0 || mine.turnsLeft <= 0) {
             this.drillMines.splice(i, 1);
             this.explodeDrillMine(mine);
             explodedAny = true;
          }
       }
       if (explodedAny) {
          this.processDrillMines();
       }
    }

    processDeployables() {
      let anyAction = false;
      // 1. Brocas Magnetizadas do Driller (T2): dura 3 turnos, raio 50px, 150 dano por turno
      if (this.magDrills && this.magDrills.length > 0) {
         for (let i = this.magDrills.length - 1; i >= 0; i--) {
            const drill = this.magDrills[i];
            drill.turnsLeft--;
            anyAction = true;
            this.effects.emp(drill.x, drill.y, drill.radius);
            this.effects.parts.push({ t: 'spark', x: drill.x, y: drill.y, vx: (Math.random()-0.5)*120, vy: -80, life: 0.5, max: 0.5, size: 5, color: '#ffd700' });
            GB.Sfx.boom(0.5);

            // Dano em jogadores
            for (const tk of this.tanks) {
               if (!tk.alive) continue;
               const c = tk.center();
               if (GB.dist(c.x, c.y, drill.x, drill.y) < drill.radius + tk.mobile.hitR) {
                  let tickDmg = 150;
                  if (drill.owner && drill.owner.atkDebuff) tickDmg *= (1 - drill.owner.atkDebuff);
                  if (tk.defBuff) tickDmg *= (1 - tk.defBuff);
                  if (tk.defDebuff) tickDmg *= (1 + tk.defDebuff);
                  const dealt = tk.damage(tickDmg);
                  if (dealt > 0) {
                     this.effects.text(c.x, c.y - 30, '-' + dealt, tk.team === (drill.owner ? drill.owner.team : -1) ? '#ffb0b0' : '#fff35c', true);
                     this.effects.parts.push({ t: 'spark', x: c.x, y: c.y, vx: (Math.random()-0.5)*100, vy: -60, life: 0.4, max: 0.4, size: 4, color: '#ffea00' });
                     if (drill.owner) this.registerEnemyDamage(drill.owner, tk, dealt);
                  }
               }
            }

            // Dano em robôs
            if (this.robots) {
               for (const rb of this.robots) {
                  if (GB.dist(rb.x, rb.y, drill.x, drill.y) < drill.radius + 10) {
                     rb.hp -= 150;
                  }
               }
            }

            // Dano em minas terrestres (T1) -> ATIVA A MINA!
            if (this.drillMines) {
               for (const mine of this.drillMines) {
                  if (GB.dist(mine.x, mine.y, drill.x, drill.y) < drill.radius + 15) {
                     mine.hp -= 150;
                  }
               }
            }

            if (drill.turnsLeft <= 0) {
               this.effects.text(drill.x, drill.y - 20, 'BROCA ESGOTADA', '#aaa', false);
               this.magDrills.splice(i, 1);
            }
         }
      }

      // 2. Minas Terrestres do Driller (T1): dura 2 turnos ou explode com dano
      if (this.drillMines && this.drillMines.length > 0) {
         for (const mine of this.drillMines) {
            if (mine.justPlanted) {
               mine.justPlanted = false;
            } else {
               mine.turnsLeft--;
            }
         }
         this.processDrillMines();
         anyAction = true;
      }

      return anyAction;
    }

    updateHuman(t, dt) {
      const H = GB.Input.held;
      if (!this.charging) {
        if (H.left) { t.facing = -1; t.move(-1, dt); }
        else if (H.right) { t.facing = 1; t.move(1, dt); }
        if (H.up || H.down) {
          const minA = t.effectiveMinAngle;
          const maxA = t.effectiveMaxAngle;
          this._angAcc = (this._angAcc || 0) + (H.up ? 1 : -1) * 32 * dt;
          const step = this._angAcc > 0 ? Math.floor(this._angAcc) : Math.ceil(this._angAcc);
          if (step) { t.angle = GB.clamp(t.angle + step, minA, maxA); this._angAcc -= step; GB.Sfx.tick(); }
        } else this._angAcc = 0;
      } else {
        const prev = this.power;
        this.power = Math.min(100, this.power + 52 * dt);
        if (Math.floor(prev / 10) !== Math.floor(this.power / 10)) GB.Sfx.charge(this.power);
      }
      if (this.mode === 'online') {
        this.aimSendT -= dt;
        if (this.aimSendT <= 0) {
          this.aimSendT = 0.07;
          const sig = `${t.x}|${t.y}|${t.facing}|${t.angle}|${Math.round(this.power)}|${this.charging}`;
          if (sig !== this._aimSig) {
            this._aimSig = sig;
            this.send({ t: 'aim', pIdx: t.playerIdx, x: t.x, y: t.y, f: t.facing, a: t.angle, p: this.power, c: this.charging });
          }
        }
      }
    }

    updateAI(t, dt) {
      const s = this.aiState;
      if (!s) return;
      const target = this.tanks.find((o) => o.team !== t.team && o.alive);
      if (!target) return;
      s.t -= dt;
      if (s.stage === 'think' && s.t <= 0) {
        const dir = GB.AI.moveDecision(this, t, target);
        if (dir) { s.stage = 'move'; s.dir = dir; s.t = GB.rand(0.4, 1.1); }
        else s.stage = 'plan';
      } else if (s.stage === 'move') {
        t.move(s.dir, dt);
        if (s.t <= 0 || t.fuel <= 0) s.stage = 'plan';
      } else if (s.stage === 'plan') {
        if (t.falling) return;
        s.plan = GB.AI.plan(this, t, target, this.cfg.difficulty);
        t.shotSel = s.plan.shot;
        s.stage = 'aim';
      } else if (s.stage === 'aim') {
        const d = s.plan.angle - t.angle;
        if (Math.abs(d) < 1) { t.angle = s.plan.angle; s.stage = 'charge'; this.charging = true; this.power = 0; }
        else t.angle += Math.sign(d) * Math.min(Math.abs(d), 50 * dt);
      } else if (s.stage === 'charge') {
        this.power += 52 * dt;
        if (this.power >= s.plan.power) {
          t.angle = Math.round(t.angle);
          this.fire(s.plan.shot, s.plan.power);
        }
      }
    }

    // ================= Câmera =================
    updateCamera(dt) {
      const z = this.cam.zoom;
      const vw = this.cw / z, vh = this.ch / z;
      if (!this.cam.manual) {
        let fx = null, fy = null;
        if (this.phase === 'flight') {
          const p = this.projectiles.find((q) => q.launched && !q.dead);
          if (p) { fx = p.x; fy = p.y; }
        }
        if (fx == null && this.lastImpact && (this.phase === 'settle' || this.phase === 'flight' || this.phase === 'waitSync')) { fx = this.lastImpact.x; fy = this.lastImpact.y; }
        if (fx == null && this.active) { fx = this.active.x; fy = this.active.y - 20; }
        if (fx != null) {
          const tx = fx - vw / 2, ty = fy - vh * 0.52;
          const k = Math.min(1, dt * (this.phase === 'flight' ? 5 : 3));
          this.cam.x += (tx - this.cam.x) * k;
          this.cam.y += (ty - this.cam.y) * k;
        }
      }
      const minX = -150, maxX = GB.WORLD_W + 150 - vw;
      this.cam.x = maxX < minX ? (GB.WORLD_W - vw) / 2 : GB.clamp(this.cam.x, minX, maxX);
      this.cam.y = GB.clamp(this.cam.y, -700, GB.WORLD_H + 60 - vh);
    }

    // ================= Render =================
    render() {
      const ctx = this.ctx, dpr = this.dpr, z = this.cam.zoom;
      const cw = this.cw, ch = this.ch;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Fundo com parallax
      if (this.bg.complete && this.bg.naturalWidth) {
        const iw = this.bg.naturalWidth, ih = this.bg.naturalHeight;
        const s = Math.max(cw / iw, ch / ih) * 1.25;
        const w = iw * s, h = ih * s;
        const px = GB.clamp((this.cam.x + 150) / (GB.WORLD_W + 300), 0, 1);
        const py = GB.clamp((this.cam.y + 700) / (GB.WORLD_H + 760), 0, 1);
        ctx.drawImage(this.bg, -(w - cw) * px, -(h - ch) * py, w, h);
      } else {
        const g = ctx.createLinearGradient(0, 0, 0, ch);
        g.addColorStop(0, '#2a1d5c'); g.addColorStop(1, '#e78a6a');
        ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
      }

      // Vento ambiente
      if (this.wind) {
        ctx.strokeStyle = 'rgba(255,255,255,.22)';
        ctx.lineWidth = 1.5;
        const dir = Math.sign(this.wind);
        for (const s of this.windStreaks) {
          s.x += dir * s.s * Math.abs(this.wind) * 0.0009 + dir * 0.002;
          if (s.x > 1.1) { s.x = -0.1; s.y = Math.random(); }
          if (s.x < -0.1) { s.x = 1.1; s.y = Math.random(); }
          const x = s.x * cw, y = s.y * ch * 0.8;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dir * s.l * (0.4 + Math.abs(this.wind) / 12), y); ctx.stroke();
        }
      }

      const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
      ctx.setTransform(dpr * z, 0, 0, dpr * z, (-this.cam.x * z + sx) * dpr, (-this.cam.y * z + sy) * dpr);

      if (this.terrain) ctx.drawImage(this.terrain.canvas, 0, 0);

      // Névoa do abismo
      const gN = ctx.createLinearGradient(0, GB.WORLD_H - 140, 0, GB.WORLD_H + 60);
      gN.addColorStop(0, 'rgba(18,8,40,0)');
      gN.addColorStop(1, 'rgba(18,8,40,.92)');
      ctx.fillStyle = gN;
      ctx.fillRect(-600, GB.WORLD_H - 140, GB.WORLD_W + 1200, 400);

      // Chamas do Napalm
      if (this.napalms) {
         ctx.save();
         ctx.globalCompositeOperation = 'lighter';
         for (const n of this.napalms) {
            ctx.fillStyle = 'rgba(255, 100, 0, 0.2)';
            ctx.beginPath(); 
            ctx.ellipse(n.x, n.y, n.radius, 15, 0, 0, Math.PI * 2);
            ctx.fill();
            const t = this.time * 8;
            for (let i = 0; i < 24; i++) {
               const fx = n.x + (Math.random() * 2 - 1) * n.radius;
               const fy = n.y + (Math.random() * 2 - 1) * 8 - 5 + Math.sin(t + i) * 6;
               ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 180, 0, 0.6)' : 'rgba(255, 60, 0, 0.8)';
               ctx.beginPath(); ctx.arc(fx, fy, 4 + Math.random() * 8, 0, Math.PI*2); ctx.fill();
            }
         }
         ctx.restore();
      }

      // Ondas (Tsunamis)
      if (this.ondas) {
         ctx.save();
         for (const w of this.ondas) {
            ctx.globalCompositeOperation = 'lighter';
            const dx = w.dir;
            ctx.fillStyle = 'rgba(68, 170, 255, 0.6)';
            ctx.beginPath();
            ctx.moveTo(w.x + dx * 40, w.y + 40);
            ctx.bezierCurveTo(w.x + dx * 40, w.y - 40, w.x - dx * 20, w.y - 80, w.x - dx * 40, w.y - 20);
            ctx.bezierCurveTo(w.x - dx * 30, w.y + 10, w.x - dx * 10, w.y + 40, w.x - dx * 40, w.y + 40);
            ctx.fill();
            
            ctx.fillStyle = 'rgba(150, 240, 255, 0.8)';
            ctx.beginPath();
            ctx.ellipse(w.x + dx * 20, w.y - 15, 15, 30, (dx < 0 ? -1 : 1) * Math.PI / 6, 0, Math.PI * 2);
            ctx.fill();
         }
         ctx.globalCompositeOperation = 'source-over';
         ctx.restore();
      }

      if (this.tanks) {
        for (const t of this.tanks) {
          const isActive = t === this.active && this.phase === 'aim';
          t.draw(ctx, { active: isActive, time: this.time, showAim: isActive && t.kind === 'human' });
        }
      }

      // Renderiza marcadores de respawn com paraquedas no modo Score
      if (this.modeType === 'score' && this.tanks) {
        for (const t of this.tanks) {
          if (!t.alive && t.isWaitingRespawn) {
            const rx = t.respawnTargetX || t.x;
            const sy = this.terrain ? this.terrain.surfaceBelow(rx, 0) : 400;
            ctx.save();
            const grad = ctx.createLinearGradient(rx, 0, rx, sy);
            grad.addColorStop(0, t.team === 0 ? 'rgba(255, 68, 68, 0.45)' : 'rgba(59, 130, 246, 0.45)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
            ctx.fillStyle = grad;
            ctx.fillRect(rx - 16, 0, 32, sy);
            
            ctx.strokeStyle = t.color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.ellipse(rx, sy, 24, 7, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = "bold 13px 'Lilita One', sans-serif";
            ctx.textAlign = 'center';
            ctx.fillText(`🪂 ${t.name}`, rx, sy - 28);
            ctx.fillStyle = '#ffd27a';
            ctx.font = "bold 11px 'Outfit', sans-serif";
            ctx.fillText(`Respawn em ${t.respawnTimer}T`, rx, sy - 14);
            ctx.restore();
          }
        }
      }
      
      if (this.robots) {
         for (const rb of this.robots) {
             ctx.save();
             ctx.translate(rb.x, rb.y);
             ctx.scale(rb.dir, 1);
             if (rb.type === 'ss') {
                 ctx.fillStyle = '#ff4040';
                 GB.roundRect(ctx, -8, -14, 16, 14, 3);
                 ctx.fill();
                 ctx.fillStyle = '#111';
                 ctx.fillRect(2, -10, 4, 4);
                 // Antena ou detalhe do robô grande
                 ctx.strokeStyle = '#222';
                 ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(4, -20); ctx.stroke();
             } else {
                 ctx.fillStyle = '#7ad4ff';
                 GB.roundRect(ctx, -5, -8, 10, 8, 2);
                 ctx.fill();
                 ctx.fillStyle = '#111';
                 ctx.fillRect(1, -6, 3, 3);
             }
             ctx.restore();
         }
      }

      if (this.magDrills) {
        for (const d of this.magDrills) {
          ctx.save();
          ctx.translate(d.x, d.y);
          
          const pulse = 0.85 + Math.sin(this.time * 5) * 0.15;
          ctx.strokeStyle = `rgba(255, 215, 0, ${0.28 * pulse})`;
          ctx.fillStyle = `rgba(255, 215, 0, ${0.05 * pulse})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.arc(0, 0, d.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.save();
          ctx.rotate(0.2);
          ctx.fillStyle = '#4a5568';
          ctx.fillRect(-4, -18, 8, 8);
          ctx.strokeStyle = '#2d3748';
          ctx.strokeRect(-4, -18, 8, 8);

          ctx.beginPath();
          ctx.moveTo(-5, -10);
          ctx.lineTo(5, -10);
          ctx.lineTo(0, 6);
          ctx.closePath();
          ctx.fillStyle = '#b0bcc8';
          ctx.fill();
          ctx.strokeStyle = '#2d3748';
          ctx.stroke();

          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 1.5;
          const sparkAngle = this.time * 12;
          ctx.beginPath();
          ctx.arc(0, -10, 7, sparkAngle, sparkAngle + Math.PI * 0.8);
          ctx.stroke();
          ctx.restore();

          ctx.fillStyle = '#ffea00';
          ctx.font = "bold 10px 'Lilita One', sans-serif";
          ctx.textAlign = 'center';
          ctx.fillText(`${d.turnsLeft}T`, 0, -22);

          ctx.restore();
        }
      }

      if (this.drillMines) {
        for (const m of this.drillMines) {
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.fillStyle = '#2b3035';
          ctx.beginPath();
          ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ff6b35';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          const blink = Math.sin(this.time * 8) > 0;
          ctx.fillStyle = blink ? '#ff2222' : '#550000';
          ctx.beginPath();
          ctx.arc(0, -2, 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffaa44';
          ctx.font = "bold 9px 'Lilita One', sans-serif";
          ctx.textAlign = 'center';
          ctx.fillText(`${m.turnsLeft}T`, 0, -8);
          ctx.restore();
        }
      }
      
      if (this.thor && this.thor.active) {
        GB.drawThor(ctx, this.thor, this.time);
      }
      for (const p of this.projectiles || []) p.draw(ctx);
      this.effects.draw(ctx);

      // Indicador de projétil fora da tela
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const p of this.projectiles || []) {
        if (!p.launched || p.dead) continue;
        const px = (p.x - this.cam.x) * z;
        const py = (p.y - this.cam.y) * z;
        if (py < 0) {
          const x = GB.clamp(px, 20, cw - 20);
          ctx.fillStyle = p.shot.color;
          ctx.beginPath(); ctx.moveTo(x, 70); ctx.lineTo(x - 8, 84); ctx.lineTo(x + 8, 84); ctx.closePath(); ctx.fill();
          break;
        }
      }
      this.renderMinimap();
    }

    renderMinimap() {
      const mm = this.dom.minimap;
      if (!this.terrain) return;
      const c = mm.getContext('2d');
      const W = mm.width, H = mm.height;
      c.clearRect(0, 0, W, H);
      c.drawImage(this.terrain.canvas, 0, 0, W, H);
      const sx = W / GB.WORLD_W, sy = H / GB.WORLD_H;
      for (const t of this.tanks) {
        if (!t.alive) continue;
        c.fillStyle = t.color;
        c.beginPath(); c.arc(t.x * sx, (t.y - 10) * sy, 4, 0, 7); c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = 1; c.stroke();
      }
      if (this.thor && this.thor.active) {
        c.fillStyle = '#00e5ff';
        c.beginPath();
        c.arc(this.thor.x * sx, this.thor.y * sy, 4.5, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#fff';
        c.lineWidth = 1;
        c.stroke();
      }
      for (const p of this.projectiles) {
        if (!p.launched) continue;
        c.fillStyle = '#fff';
        c.fillRect(p.x * sx - 1.5, GB.clamp(p.y * sy, 0, H) - 1.5, 3, 3);
      }
      const z = this.cam.zoom;
      c.strokeStyle = 'rgba(255,255,255,.7)';
      c.lineWidth = 1;
      c.strokeRect(this.cam.x * sx, this.cam.y * sy, (this.cw / z) * sx, (this.ch / z) * sy);
    }

    // ================= HUD =================
    setText(el, key, v) { if (this.hudCache[key] !== v) { this.hudCache[key] = v; el.textContent = v; } }
    setStyle(el, key, prop, v) { if (this.hudCache[key] !== v) { this.hudCache[key] = v; el.style[prop] = v; } }
    setClass(el, key, cls, on) { if (this.hudCache[key] !== on) { this.hudCache[key] = on; el.classList.toggle(cls, on); } }

    updateHud() {
      const d = this.dom, t = this.active;
      if (this.modeType === 'score') {
        const elLivesA = document.getElementById('hud-lives-a');
        const elLivesB = document.getElementById('hud-lives-b');
        const lA = this.teamLives ? (this.teamLives[0] ?? 0) : 4;
        const lB = this.teamLives ? (this.teamLives[1] ?? 0) : 4;
        if (elLivesA) elLivesA.innerHTML = `<span class="lives-tag">VIDAS:</span> <span class="lives-hearts">${'❤️'.repeat(lA)}${'🖤'.repeat(Math.max(0, 4 - lA))}</span> ${lA}/4`;
        if (elLivesB) elLivesB.innerHTML = `<span class="lives-tag">VIDAS:</span> <span class="lives-hearts">${'❤️'.repeat(lB)}${'🖤'.repeat(Math.max(0, 4 - lB))}</span> ${lB}/4`;
      }

      if (this.hudCards && this.hudCards.length) {
        this.tanks.forEach((tk, i) => {
          const el = this.hudCards[i];
          if (!el) return;
          const pct = Math.max(0, 100 * tk.hp / tk.maxHp).toFixed(1) + '%';
          this.setStyle(el.hp, 'hp' + i, 'width', pct);
          this.setClass(el.card, 'turn' + i, 'turn', tk === t && this.phase === 'aim');
          this.setClass(el.card, 'dead' + i, 'dead', !tk.alive);
          if (el.status) {
            if (!tk.alive) {
              if (this.modeType === 'score' && tk.isWaitingRespawn) {
                el.status.textContent = `🪂 ${tk.respawnTimer} turnos`;
                el.status.className = 'pc-status-tag waiting';
              } else {
                el.status.textContent = 'K.O.';
                el.status.className = 'pc-status-tag ko';
              }
            } else {
              el.status.textContent = '';
            }
          }
        });
      } else {
        this.tanks.forEach((tk, i) => {
          if (d.pcHp && d.pcHp[i]) this.setStyle(d.pcHp[i], 'hp' + i, 'width', (100 * tk.hp / tk.maxHp).toFixed(1) + '%');
          if (d.pc && d.pc[i]) this.setClass(d.pc[i], 'turn' + i, 'turn', tk === t && this.phase === 'aim');
        });
      }
      const w = this.wind;
      this.setText(d.windVal, 'wv', String(Math.abs(w)));
      this.setStyle(d.windArrow, 'wa', 'transform', `rotate(${w < 0 ? 180 : 0}deg) scale(${0.8 + Math.abs(w) / 24})`);
      this.setStyle(d.windArrow, 'wo', 'opacity', w === 0 ? '0.25' : '1');
      
      const wp = this.windPrev;
      if (wp !== undefined) {
         document.getElementById('wind-history').classList.remove('hidden');
         document.getElementById('wind-prev-val').textContent = String(Math.abs(wp));
         document.getElementById('wind-prev-arrow').style.transform = `rotate(${wp < 0 ? 180 : 0}deg) scale(${0.8 + Math.abs(wp) / 24})`;
         document.getElementById('wind-prev-arrow').style.opacity = wp === 0 ? '0.25' : '1';
      }
      
      if (!t) return;
      this.setText(d.turnName, 'tn', this.phase === 'aim' ? t.name : this.phase === 'waitSync' ? 'Sincronizando…' : '···');
      const secs = Math.max(0, Math.ceil(this.timer));
      this.setText(d.timer, 'tm', this.phase === 'aim' ? String(secs) : '');
      this.setClass(d.timer, 'tml', 'low', this.phase === 'aim' && secs <= 5);
      this.setText(d.angle, 'an', Math.round(t.angle) + '°');
      
      if (t.lastAngle !== undefined) {
         document.getElementById('angle-last-val').textContent = '(' + Math.round(t.lastAngle) + '°)';
      } else {
         document.getElementById('angle-last-val').textContent = '';
      }
      
      this.setStyle(d.fuel, 'fu', 'width', t.fuel.toFixed(0) + '%');
      this.setStyle(d.power, 'pw', 'width', this.power.toFixed(1) + '%');
      this.setStyle(d.powerLast, 'pl', 'left', `calc(${Math.max(0, t.lastPower)}% - 1px)`);
      this.setStyle(d.powerLast, 'plo', 'opacity', t.lastPower >= 0 ? '1' : '0');
      d.shots.forEach((b, i) => this.setClass(b, 'sh' + i, 'active', t.shotSel === i));
      this.setClass(d.shots[2], 'ssl', 'locked', t.ssCooldown > 0);
      this.setClass(d.shots[2], 'ssr', 'ready', t.ssCooldown === 0);
      this.setStyle(d.ssFill, 'ssf', 'width', t.ssCooldown === 0 ? '100%' : '0%');
      const ssBtn = d.shots[2];
      if (t.ssCooldown > 0) {
        ssBtn.setAttribute('data-cd', t.ssCooldown);
        ssBtn.title = `SS em recarga: restam ${t.ssCooldown} turnos do seu mobile`;
      } else {
        ssBtn.removeAttribute('data-cd');
        ssBtn.title = 'SS Pronto!';
      }
      this.setClass(d.controls, 'dis', 'disabled', !this.isMyTurn());
      document.getElementById('btn-fire').classList.toggle('charging', this.charging && this.isMyTurn());
      
      // Update items
      if (t) {
        for (let i = 0; i < 3; i++) {
          const btn = document.getElementById(`item-btn-${i}`);
          const item = t.items[i];
          if (!item) { this.setStyle(btn, 'ib'+i, 'display', 'none'); continue; }
          this.setStyle(btn, 'ib'+i, 'display', 'flex');
          const html = GB.itemLabelHTML(item);
          if (this.hudCache['ibh'+i] !== html) {
             this.hudCache['ibh'+i] = html;
             btn.innerHTML = html;
          }
          this.setClass(btn, 'ibu'+i, 'used', t.itemsUsed && !!t.itemsUsed[i]);
          this.setClass(btn, 'iba'+i, 'active', this.itemActive === item);
        }
        
        const btn2 = document.getElementById('item-btn-3');
        if (t.items2) {
           this.setStyle(btn2, 'ib3', 'display', 'flex');
           const isLocked = !t.item2Unlocked;
           let html2 = GB.itemLabelHTML(t.items2);
           if (isLocked) {
              const currentDmg = Math.min(900, Math.floor(t.dmgDealt || 0));
              html2 += `<div class="item2-lock-badge" title="Bloqueado: Cause 900 de dano a inimigos (${currentDmg}/900)">🔒<span class="item2-lock-dmg">${currentDmg}</span></div>`;
           }
           const cacheKey = html2 + isLocked;
           if (this.hudCache['ibh3'] !== cacheKey) {
              this.hudCache['ibh3'] = cacheKey;
              btn2.innerHTML = html2;
           }
           this.setClass(btn2, 'iblk3', 'locked', isLocked);
           this.setClass(btn2, 'ibu3', 'used', !!t.item2Used);
           this.setClass(btn2, 'iba3', 'active', this.itemActive2 === t.items2);
        } else {
           this.setStyle(btn2, 'ib3', 'display', 'none');
        }
      }
      
      // Update Turn Order (Sort by delay)
      if (!this.hudCache._turnOrderUpdated) {
         this.hudCache._turnOrderUpdated = true;
         // It only updates when turn changes, but we'll do it continuously or when delay changes.
      }
      const orderDiv = document.getElementById('turn-order');
      if (orderDiv) {
         const sorted = [...this.tanks].sort((a,b) => a.delay - b.delay);
         orderDiv.innerHTML = sorted.filter(tk => tk.alive).map(tk => {
            const isTurn = tk === t;
            return `<div class="to-icon ${isTurn ? 'active' : ''}" style="background: ${tk.color}">${tk.name.substring(0,2)}<span class="to-delay-text">${Math.round(tk.delay)}</span></div>`;
         }).join('');
      }
    }

    toast(text) {
      const el = this.dom.toast;
      el.textContent = text;
      el.classList.add('show');
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => el.classList.remove('show'), 1300);
    }
  }

  GB.Game = Game;
})(window.GB);
