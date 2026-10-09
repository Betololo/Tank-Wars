/* Definição dos mobiles (Mortar, Yeti, Worm): atributos, padrões de tiro e desenho vetorial. */
(function (GB) {
  'use strict';

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  GB.roundRect = rr;

  function outline(ctx) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(20,10,30,.85)';
    ctx.stroke();
  }

  // ----------------------------------------------------------------
  // Padrões de tiro: cada "bala" = { off: graus, pm: multiplicador de força, delay: s }
  // ----------------------------------------------------------------
  const MOBILES = {
    armor: {
      id: 'armor',
      name: 'Mortar',
      desc: 'Equilibrado e fácil de usar. Ótimo para começar.',
      hp: 1000, speed: 46, maxClimb: 3.5, fuelPerPx: 0.32, windInfl: 1.0,
      defense: 0.10,
      stats: { HP: 0.65, Dano: 0.7, Destruição: 0.55, Mobilidade: 0.6 },
      pivot: [2, -22], barrel: 20, hitR: 18,
      shots: [
        { name: 'Tiro 1', delay: 720, bullets: [{}], r: 30, dmg: 240, size: 5, color: '#ffe36b' },
        { name: 'Tiro 2', delay: 800, bullets: [{}], r: 36, dmg: 310, size: 6.5, color: '#ffa74d' },
        { name: 'SS', delay: 1100, bullets: [{}], r: 62, dmg: 480, size: 10, color: '#ff4fd8', trail: '#ff9cf0' },
      ],
    },
    bigfoot: {
      id: 'bigfoot',
      name: 'Yeti',
      desc: 'Robusto e destruidor de terreno: mísseis em leque. Sobe mal rampas.',
      hp: 1150, speed: 36, maxClimb: 2.8, fuelPerPx: 0.4, windInfl: 1.1,
      defense: 0.06,
      stats: { HP: 0.85, Dano: 0.35, Destruição: 1.0, Mobilidade: 0.3 },
      pivot: [2, -36], barrel: 20, hitR: 18,
      shots: [
        { name: 'Tiro 1', delay: 760, bullets: [{ off: -3, pm: 0.97 }, { off: -1, pm: 1.0 }, { off: 1, pm: 1.02 }, { off: 3, pm: 0.99 }], r: 27, dmg: 30, size: 4, color: '#c8f1ff', missile: true },
        { name: 'Tiro 2', delay: 910, bullets: [{ off: -4.5, pm: 0.95 }, { off: -2.5, pm: 0.98 }, { off: -0.5, pm: 1.0 }, { off: 0.5, pm: 1.03 }, { off: 2.5, pm: 0.99 }, { off: 4.5, pm: 0.96 }], r: 35, dmg: 30, size: 5, color: '#9ae6ff', missile: true },
        { name: 'SS', delay: 1300, bullets: [{ off: 0, delay: 0 }, { off: -1.5, delay: 0.14 }, { off: 1.5, delay: 0.28 }, { off: -0.5, delay: 0.42 }, { off: 0.8, delay: 0.56 }], r: 54, dmg: 112, size: 7, color: '#ff6b3d', missile: true, trail: '#ffb36b' },
      ],
    },
    grub: {
      id: 'grub',
      name: 'Worm',
      desc: 'Escala quase qualquer rampa e sofre pouco com o vento. HP baixo.',
      hp: 880, speed: 50, maxClimb: 9, fuelPerPx: 0.26, windInfl: 0.45,
      defense: 0.01,
      stats: { HP: 0.45, Dano: 0.7, Destruição: 0.6, Mobilidade: 1.0 },
      pivot: [-4, -21], barrel: 21, hitR: 18,
      shots: [
        { name: 'Tiro 1', delay: 730, bullets: [{}], r: 26, dmg: 250, size: 5, color: '#b6ff5c' },
        { name: 'Tiro 2', delay: 930, bullets: [{ delay: 0, pm: 0.95 }, { delay: 0.08, pm: 1.0 }, { delay: 0.16, pm: 1.05 }, { delay: 0.24, pm: 0.9 }], r: 26, dmg: 100, size: 5, color: '#7dff9a', bouncy: true },
        { name: 'SS', delay: 1400, bullets: [{}], r: 30, dmg: 125, size: 8, color: '#d27bff', trail: '#efc4ff', drill: 5, drillStep: 26 },
      ],
    },
    dj: {
      id: 'dj',
      name: 'DJ',
      desc: 'Manipula o posicionamento inimigo com sucção e repulsão sonoras.',
      hp: 900, speed: 40, maxClimb: 4, fuelPerPx: 0.35, windInfl: 0.8,
      defense: 0.01,
      stats: { HP: 0.5, Dano: 0.5, Destruição: 0.3, Mobilidade: 0.5 },
      pivot: [-1.5, -26], barrel: 22, hitR: 18,
      shots: [
        { name: 'Tiro 1', delay: 780, bullets: [{}], r: 35, dmg: 150, size: 6, color: '#fcf238', isDJ_T1: true },
        { name: 'Tiro 2', delay: 850, bullets: [{}], r: 35, dmg: 180, size: 6, color: '#38fcb7', isDJ_T2: true },
        { name: 'SS', delay: 1200, bullets: [{}], r: 40, dmg: 300, size: 9, color: '#3855fc', trail: '#a3b2ff', isDJ_SS: true },
      ],
    },
    launcher: {
      id: 'launcher',
      name: 'Launcher',
      desc: 'Mestre em invocações: correntes e mini-robôs rastreadores.',
      hp: 1000, speed: 45, maxClimb: 5, fuelPerPx: 0.3, windInfl: 1.0,
      defense: 0.01,
      stats: { HP: 0.65, Dano: 0.7, Destruição: 0.4, Mobilidade: 0.6 },
      pivot: [2, -26], barrel: 20, hitR: 18,
      shots: [
        { name: 'Tiro 1', delay: 800, bullets: [{}], r: 30, dmg: 280, size: 6, color: '#a6a6a6', chains: true },
        { name: 'Tiro 2', delay: 850, bullets: [{ off: -1.5, pm: 0.98 }, { off: 1.5, pm: 1.02 }], r: 25, dmg: 140, size: 5, color: '#7ad4ff', spawnRobots: 1 },
        { name: 'SS', delay: 1300, bullets: [{}], r: 45, dmg: 500, size: 8, color: '#ff4040', trail: '#ff9999', spawnRobots: 1, isSSRobot: true },
      ],
    },
    khan: {
      id: 'khan',
      name: 'Khan',
      desc: 'Atira de costas pelo abdômen! Seu T2 viaja por baixo da terra.',
      hp: 950, speed: 48, maxClimb: 7, fuelPerPx: 0.28, windInfl: 0.8,
      defense: 0.10,
      stats: { HP: 0.55, Dano: 0.8, Destruição: 0.3, Mobilidade: 0.75 },
      pivot: [-7, -14], barrel: 23, hitR: 18,
      minAngle: -90, maxAngle: 90, shootsBackwards: true,
      shots: [
        { name: 'Tiro 1', delay: 750, bullets: [{}], r: 30, dmg: 180, size: 5, color: '#f5b52c' },
        { name: 'Tiro 2', delay: 880, bullets: [{}], r: 35, dmg: 350, size: 6, color: '#ff2c56', isKhanT2: true },
        { name: 'SS', delay: 1300, bullets: [{}], r: 40, dmg: 400, size: 8, color: '#ab2cff', trail: '#d694ff', isKhanSS: true },
      ],
    },
    doc: {
      id: 'doc',
      name: 'Doc',
      desc: 'Médico tático: T1 reduz o ataque do alvo, T2/SS curam aliados e concedem defesa acumulável.',
      hp: 1000, speed: 44, maxClimb: 4.5, fuelPerPx: 0.3, windInfl: 0.85,
      defense: 0.04,
      stats: { HP: 0.65, Dano: 0.45, Destruição: 0.3, Mobilidade: 0.6 },
      pivot: [5.5, -22], barrel: 21, hitR: 18,
      shots: [
        { name: 'Tiro 1', delay: 740, bullets: [{}], r: 28, dmg: 160, size: 5, color: '#26c6da', isDoc_T1: true },
        { name: 'Tiro 2', delay: 840, bullets: [{}], r: 36, dmg: 0, size: 6, color: '#5cff8a', isDoc_T2: true },
        { name: 'SS', delay: 1250, bullets: [{}], r: 65, dmg: 0, size: 9, color: '#00e676', trail: '#b9f6ca', isDoc_SS: true },
      ],
    },
    frigo: {
      id: 'frigo',
      name: 'Frigo',
      desc: 'Robô-gorila de gelo: disparos orbitais independentes. Cada stack de Blizzard reduz ângulo, mobilidade e 15% da defesa. Com 5 stacks congela e perde o turno.',
      hp: 960, speed: 42, maxClimb: 3.8, fuelPerPx: 0.32, windInfl: 0.9,
      defense: 0.04,
      stats: { HP: 0.6, Dano: 0.65, Destruição: 0.45, Mobilidade: 0.55 },
      pivot: [6, -21], barrel: 17, hitR: 18,
      shots: [
        { name: 'Tiro 1', delay: 750, bullets: [{}], r: 24, dmg: 90, size: 6, color: '#79b9e7', isFrigoT1: true },
        { name: 'Tiro 2', delay: 870, bullets: [{}], r: 26, dmg: 80, size: 6.5, color: '#4db5ff', isFrigoT2: true },
        { name: 'SS', delay: 1300, bullets: [{}], r: 72, dmg: 370, size: 11, color: '#90dcff', trail: '#dcf3ff', isFrigoSS: true },
      ],
    },
    driller: {
      id: 'driller',
      name: 'Driller',
      desc: 'Veículo escavador: T1 planta minas subterrâneas de alto impacto, T2 fixa brocas magnéticas de pulso e SS convoca um Air Strike devastador.',
      hp: 1020, speed: 42, maxClimb: 4.0, fuelPerPx: 0.33, windInfl: 0.95,
      defense: 0.06,
      stats: { HP: 0.7, Dano: 0.75, Destruição: 0.85, Mobilidade: 0.5 },
      pivot: [-3, -27], barrel: 28, hitR: 18,
      shots: [
        { name: 'Tiro 1', delay: 750, bullets: [{}], r: 22, dmg: 140, size: 6, color: '#4cb82c', isDrillerT1: true },
        { name: 'Tiro 2', delay: 880, bullets: [{}], r: 24, dmg: 150, size: 6, color: '#ffcc00', isDrillerT2: true },
        { name: 'SS', delay: 1300, bullets: [{}], r: 10, dmg: 0, size: 7, color: '#ff3333', trail: '#ff8888', isDrillerSSMarker: true },
      ],
    },
    kuda: {
      id: 'kuda',
      name: 'Kuda',
      desc: 'Centopeia mecânica: atira pela bunda como o Khan. Invoca o satélite Thor que sobrevoa o mapa e sobe de nível a cada dano causado!',
      hp: 950, speed: 46, maxClimb: 6, fuelPerPx: 0.28, windInfl: 0.85,
      defense: 0.06,
      stats: { HP: 0.55, Dano: 0.8, Destruição: 0.4, Mobilidade: 0.7 },
      pivot: [-8, -14], barrel: 24, hitR: 18,
      minAngle: -25, maxAngle: 45, shootsBackwards: true,
      shots: [
        { name: 'Tiro 1', delay: 780, bullets: [{}], r: 35, dmg: 150, size: 6, color: '#fcf238', isDJ_T1: true },
        { name: 'Tiro 2', delay: 880, bullets: [{ delay: 0 }, { delay: 0.1 }, { delay: 0.2 }], r: 0, dmg: 0, size: 5, color: '#ff2c70', isKudaT2: true },
        { name: 'SS', delay: 1300, bullets: [{}], r: 30, dmg: 150, size: 8, color: '#aa33ff', trail: '#e088ff', isKudaSS: true },
      ],
    },
  };
  GB.MOBILES = MOBILES;
  GB.MOBILES.nak = MOBILES.khan;
  GB.MOBILES.yeti = MOBILES.bigfoot;
  GB.MOBILES.worm = MOBILES.grub;
  GB.MOBILES.mortar = MOBILES.armor;
  GB.MOBILE_IDS = ['armor', 'bigfoot', 'grub', 'dj', 'launcher', 'khan', 'doc', 'frigo', 'driller', 'kuda'];

  GB.THOR = {
    DAMAGE: { 1: 40, 2: 80, 3: 120, 4: 160, 5: 200, 6: 300 },
    EXP_NEEDED: { 1: 150, 2: 300, 3: 600, 4: 1200, 5: 2000 },
    MAX_LEVEL: 6
  };

  // ----------------------------------------------------------------
  // Desenho (origem = centro da base; x positivo = frente)
  // angle = ângulo do canhão em graus acima da horizontal
  // ----------------------------------------------------------------
  const draw = {
    armor(ctx, angle, team, wheelRot) {
      // 1. Barra de proteção / cano curvado traseiro (cinza escuro, x < 0)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-11, -9);
      ctx.lineTo(-12, -31);
      ctx.quadraticCurveTo(-12, -35, -5, -35);
      ctx.lineTo(-1, -35);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#37474f';
      ctx.lineCap = 'round';
      ctx.stroke();
      outline(ctx);
      ctx.restore();

      // 2. Chassi central / placa traseira e peito branco
      ctx.beginPath();
      ctx.moveTo(-8, -12);
      ctx.lineTo(-8, -26);
      ctx.lineTo(2, -28);
      ctx.lineTo(4, -12);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      outline(ctx);

      // 3. Canhão lançador cinza cilíndrico/cônico (em 2, -22)
      ctx.save();
      ctx.translate(2, -22);
      ctx.rotate(-angle * GB.DEG);

      // Base do cano
      rr(ctx, -5, -4, 5, 8, 2);
      ctx.fillStyle = '#455a64'; ctx.fill(); outline(ctx);

      // Tubo do cano cônico cinza de aço
      ctx.beginPath();
      ctx.moveTo(0, -4.5);
      ctx.lineTo(19, -6.5);
      ctx.lineTo(19, 6.5);
      ctx.lineTo(0, 4.5);
      ctx.closePath();
      const gunG = ctx.createLinearGradient(0, -6.5, 0, 6.5);
      gunG.addColorStop(0, '#cfd8dc');
      gunG.addColorStop(0.5, '#90a4ae');
      gunG.addColorStop(1, '#546e7a');
      ctx.fillStyle = gunG;
      ctx.fill();
      outline(ctx);

      // Bocal prateado do cano
      ctx.beginPath();
      ctx.ellipse(19, 0, 2.2, 6.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#eceff1';
      ctx.fill();
      outline(ctx);

      // Abertura escura do cano
      ctx.beginPath();
      ctx.ellipse(19, 0, 1.4, 4.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a1a';
      ctx.fill();
      ctx.restore();

      // 4. Carcaça frontal blindada vermelha/alaranjada (red/orange armor)
      ctx.beginPath();
      ctx.moveTo(-3, -26);
      ctx.quadraticCurveTo(8, -26, 15, -19);
      ctx.quadraticCurveTo(18, -13, 14, -8);
      ctx.lineTo(2, -8);
      ctx.lineTo(-4, -14);
      ctx.closePath();
      const armorG = ctx.createLinearGradient(0, -26, 0, -8);
      armorG.addColorStop(0, '#f4511e');
      armorG.addColorStop(0.6, '#e64a19');
      armorG.addColorStop(1, '#bf360c');
      ctx.fillStyle = armorG;
      ctx.fill();
      outline(ctx);

      // Faixa da equipe
      ctx.fillStyle = team;
      ctx.fillRect(-2, -14, 12, 2.5);

      // 3 Fendas pretas diagonais de ventilação na blindagem frontal
      ctx.fillStyle = '#111111';
      const vents = [[6, -17], [9, -15], [11, -12]];
      for (const [vx, vy] of vents) {
        ctx.save();
        ctx.translate(vx, vy);
        ctx.rotate(-Math.PI / 4);
        rr(ctx, -1.8, -0.9, 3.6, 1.8, 0.8);
        ctx.fill();
        ctx.restore();
      }

      // Pequeno refletor/visor âmbar na blindagem
      ctx.fillStyle = '#ffab91';
      ctx.fillRect(4, -19, 3, 1.6);

      // 5. Cabeça / Olho grande bem aberto com pálpebra vermelha menor e pupila preta bem visível
      ctx.save();
      ctx.translate(1, -31);

      // Globo ocular esférico branco bem aberto
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      outline(ctx);

      // Pálpebra / capacete superior vermelho pequeno (cobre apenas o topo, deixando o olho bem aberto)
      ctx.beginPath();
      ctx.arc(0, 0, 7, Math.PI * 1.1, Math.PI * 1.9);
      ctx.closePath();
      const helmGrad = ctx.createLinearGradient(0, -7, 0, -2);
      helmGrad.addColorStop(0, '#f4511e');
      helmGrad.addColorStop(1, '#d84315');
      ctx.fillStyle = helmGrad;
      ctx.fill();
      outline(ctx);

      // Detalhe de traço/luz laranja no topo do capacete
      ctx.fillStyle = '#ff8a65';
      ctx.fillRect(-2, -5.5, 4, 1.2);

      // Pupila preta grande e bem nítida olhando para a frente
      ctx.beginPath();
      ctx.arc(2.6, 0.8, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#111111';
      ctx.fill();

      // Brilho branco na pupila
      ctx.beginPath();
      ctx.arc(1.8, -0.2, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();

      // 6. Esteira triangular (caterpillar track em triângulo com 3 rodas de metal)
      // Base triangular alaranjada
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(8.5, -5);
      ctx.lineTo(-8.5, -5);
      ctx.closePath();
      ctx.fillStyle = '#d84315';
      ctx.fill();

      // Cinta da esteira com gomos pretos salientes
      const trackPts = [[0, -14], [8, -5], [-8, -5]];
      // Pinos / gomos da esteira ao redor do triângulo
      const beltGomos = [
        [-8.5, -2], [-4, -2], [0, -2], [4, -2], [8.5, -2], // base inferior
        [8, -6], [6, -9], [4, -12], [1, -15], // subida dianteira
        [-1, -15], [-4, -12], [-6, -9], [-8, -6], // descida traseira
      ];
      ctx.fillStyle = '#212121';
      for (const [gx, gy] of beltGomos) {
        rr(ctx, gx - 1.8, gy - 1.8, 3.6, 3.6, 1);
        ctx.fill();
      }

      // Cinta contínua da esteira
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(8, -5);
      ctx.lineTo(-8, -5);
      ctx.closePath();
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = '#261710';
      ctx.stroke();

      // 3 Rodas prateadas com centro escuro dispostas em triângulo (animadas com rotação)
      const rot = wheelRot || 0;
      for (const [wx, wy] of trackPts) {
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(rot);

        // Disco externo prateado
        ctx.beginPath();
        ctx.arc(0, 0, 4.4, 0, Math.PI * 2);
        ctx.fillStyle = '#eceff1';
        ctx.fill();
        outline(ctx);

        // 3 Parafusos/raios de rolamento que giram visivelmente com o movimento
        ctx.fillStyle = '#78909c';
        for (let sp = 0; sp < 3; sp++) {
          const sa = sp * (Math.PI * 2 / 3);
          ctx.beginPath();
          ctx.arc(Math.cos(sa) * 2.8, Math.sin(sa) * 2.8, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }

        // Círculo interno cinza escuro
        ctx.beginPath();
        ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = '#546e7a';
        ctx.fill();

        // Ponto central
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fillStyle = '#263238';
        ctx.fill();

        ctx.restore();
      }
    },

    bigfoot(ctx, angle, team, wheelRot) {
      // 1. Chassi inferior metálico cinza
      rr(ctx, -15, -14, 30, 5, 2);
      ctx.fillStyle = '#7a8896'; ctx.fill(); outline(ctx);
      ctx.fillStyle = '#505a64'; ctx.fillRect(-13, -12.5, 26, 1.5);

      // Suporte traseiro com lanterna vermelha (traseira do trator, x < 0)
      rr(ctx, -19, -19, 5, 7, 1.5);
      ctx.fillStyle = '#8a99a8'; ctx.fill(); outline(ctx);
      ctx.beginPath();
      ctx.arc(-19, -15.5, 3, Math.PI * 0.5, Math.PI * 1.5);
      ctx.fillStyle = '#e61e1e'; ctx.fill(); outline(ctx);
      ctx.beginPath(); ctx.arc(-19.5, -16.5, 1, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();

      // 2. Carroceria do trator azul royal
      ctx.beginPath();
      ctx.moveTo(-17, -14);
      ctx.lineTo(-17, -18);
      ctx.lineTo(-4, -18);
      ctx.lineTo(0, -22);
      ctx.lineTo(14, -22);
      ctx.lineTo(16, -16);
      ctx.lineTo(16, -14);
      ctx.closePath();
      const bodyGrad = ctx.createLinearGradient(0, -22, 0, -14);
      bodyGrad.addColorStop(0, '#1c58f2');
      bodyGrad.addColorStop(0.5, '#0a3cd4');
      bodyGrad.addColorStop(1, '#00259e');
      ctx.fillStyle = bodyGrad;
      ctx.fill();
      outline(ctx);

      // Faixa da equipe no chassi
      ctx.fillStyle = team;
      ctx.fillRect(-13, -17.5, 14, 2.5);

      // 3. Rodas gigantes off-road (Monster Truck Tires) - Desenhadas com rotação viva!
      const rot = wheelRot || 0;
      const wheels = [-13, 12];
      for (const wx of wheels) {
        ctx.save();
        ctx.translate(wx, -11);
        ctx.rotate(rot);

        // 8 cravos/garras de borracha salientes ao redor do pneu
        for (let k = 0; k < 8; k++) {
          ctx.save();
          ctx.rotate(k * Math.PI / 4);
          rr(ctx, 8.5, -2.5, 4.5, 5, 1.5);
          ctx.fillStyle = '#2b2d30';
          ctx.fill();
          outline(ctx);
          ctx.restore();
        }

        // Pneu principal de borracha escura
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#222528';
        ctx.fill();
        outline(ctx);

        // Calota / roda central amarela gigante
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
        const rimG = ctx.createRadialGradient(-1, -1, 1, 0, 0, 5.5);
        rimG.addColorStop(0, '#fff459');
        rimG.addColorStop(0.7, '#ffcc00');
        rimG.addColorStop(1, '#e6a800');
        ctx.fillStyle = rimG;
        ctx.fill();
        outline(ctx);

        // 5 furos estilizados na calota que giram visivelmente
        ctx.fillStyle = '#8c590f';
        for (let sp = 0; sp < 5; sp++) {
          const sa = sp * (Math.PI * 2 / 5);
          ctx.beginPath();
          ctx.arc(Math.cos(sa) * 3.4, Math.sin(sa) * 3.4, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }

        // Porca central preta
        ctx.beginPath();
        ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();

        ctx.restore();
      }

      // 4. Suporte mecânico do lançador (braço celeste/prata ligando chassi ao lançador)
      ctx.save();
      // Braço de suporte principal subindo atrás do olho
      ctx.beginPath();
      ctx.moveTo(-1, -20);
      ctx.lineTo(2, -36);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#8faecc';
      ctx.stroke();

      // Braço angular estilizado (em forma de L invertido atrás do morteiro)
      ctx.beginPath();
      ctx.moveTo(-1, -36);
      ctx.lineTo(6, -38);
      ctx.lineTo(6, -26);
      ctx.lineWidth = 2.8;
      ctx.strokeStyle = '#6d8fae';
      ctx.stroke();
      ctx.restore();

      // 5. Cabeça / Olho grande do personagem (TOTALMENTE VISÍVEL, sobre a roda frontal e abaixo do lançador!)
      ctx.save();
      ctx.translate(6, -25);

      // Olho esférico branco
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      outline(ctx);

      // Capacete / pálpebra azul royal no topo do olho
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, Math.PI * 0.9, Math.PI * 2.1);
      ctx.closePath();
      ctx.fillStyle = '#0a3cd4';
      ctx.fill();
      outline(ctx);

      // Pupila preta grande olhando para a frente
      ctx.beginPath();
      ctx.arc(3.2, 1, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#111111';
      ctx.fill();

      // Brilho na pupila
      ctx.beginPath();
      ctx.arc(2.5, 0, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();

      // 6. Canhão lançador de mísseis (morteiro azul afunilado) BEM ACIMA DO OLHO em (2, -36)
      ctx.save();
      ctx.translate(2, -36);
      ctx.rotate(-angle * GB.DEG);

      // Receptor cilíndrico traseiro escuro
      rr(ctx, -7, -4, 7, 8, 2);
      ctx.fillStyle = '#222831'; ctx.fill(); outline(ctx);

      // Tubo do morteiro em sino azul royal (frente afunilada alargada)
      ctx.beginPath();
      ctx.moveTo(0, -5.5);
      ctx.lineTo(20, -9);
      ctx.lineTo(20, 9);
      ctx.lineTo(0, 5.5);
      ctx.closePath();
      const barrelGrad = ctx.createLinearGradient(0, -9, 0, 9);
      barrelGrad.addColorStop(0, '#2260f8');
      barrelGrad.addColorStop(0.5, '#0a3cd4');
      barrelGrad.addColorStop(1, '#02249c');
      ctx.fillStyle = barrelGrad;
      ctx.fill();
      outline(ctx);

      // Bocal prateado na boca do cano (x = 20)
      ctx.beginPath();
      ctx.ellipse(20, 0, 3, 9, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#d2dce6';
      ctx.fill();
      outline(ctx);

      // Abertura escura da boca do morteiro
      ctx.beginPath();
      ctx.ellipse(20, 0, 2, 6.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#111111';
      ctx.fill();

      // Esfera de articulação metálica celeste no ponto de giro
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#a6c6e8';
      ctx.fill();
      outline(ctx);
      ctx.beginPath(); ctx.arc(-1.2, -1.5, 1.8, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();

      ctx.restore();
    },

    grub(ctx, angle, team) {
      // 1. Corpo principal em domo amarelo (lagarta)
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.quadraticCurveTo(-23, -16, -10, -23);
      ctx.quadraticCurveTo(4, -26, 15, -12);
      ctx.quadraticCurveTo(19, -4, 15, 0);
      ctx.lineTo(-20, 0);
      ctx.closePath();
      ctx.fillStyle = '#fedc00';
      ctx.fill();
      outline(ctx);

      // Aba/borda traseira inferior avermelhada
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(-7, 0);
      ctx.lineTo(-7, -4);
      ctx.quadraticCurveTo(-14, -5, -20, -3);
      ctx.closePath();
      ctx.fillStyle = '#c7330d';
      ctx.fill();
      outline(ctx);

      // 2. Núcleo/esfera alaranjada brilhante interna
      ctx.beginPath();
      ctx.arc(4, -10, 6.5, 0, Math.PI * 2);
      const orbG = ctx.createRadialGradient(2, -12, 1, 4, -10, 7);
      orbG.addColorStop(0, '#ffe566');
      orbG.addColorStop(0.4, '#ff8800');
      orbG.addColorStop(1, '#b82800');
      ctx.fillStyle = orbG;
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(2.5, -12.5, 1.8, 0, Math.PI * 2); ctx.fill();

      // 3. Dobras / gomos verticais de lagarta com contornos marrom-avermelhados
      const drawRib = (pts, w) => {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.lineWidth = w || 3.5;
        ctx.strokeStyle = '#85220a';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      };
      // Dobra posterior
      drawRib([[-15, -20], [-16, -11], [-14, -1]], 3.2);
      // Dobra intermediária
      drawRib([[-8, -22], [-9, -12], [-7, 0]], 3.5);
      // Dobra central em formato de arco/U
      drawRib([[-1, -21], [-3, -12], [-1, -4], [-3, 0]], 3.5);
      // Dobra frontal contornando a esfera brilhante
      drawRib([[5, -17], [1, -12], [2, -3], [5, 0]], 3.5);

      // Faixa da equipe na base
      ctx.fillStyle = team;
      ctx.fillRect(-12, -3, 22, 2.5);

      // 4. Cabeça / Olho esférico na parte frontal inferior
      ctx.save();
      ctx.translate(14, -6);
      // Esfera branca do olho
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      outline(ctx);
      // Pálpebra / capacete superior avermelhado
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, Math.PI * 0.95, Math.PI * 2.05);
      ctx.closePath();
      ctx.fillStyle = '#c7330d';
      ctx.fill();
      outline(ctx);
      // Pupila preta olhando para a frente
      ctx.beginPath();
      ctx.arc(3.2, 1, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = '#111111';
      ctx.fill();
      // Brilho na pupila
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(2.5, 0.2, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 5. Disco / Medidor circular lateral (característico do Grub da arte)
      ctx.save();
      ctx.translate(3, -16);
      const dR = 8.5;
      // Anel segmentado
      // Verde superior-esquerdo
      ctx.beginPath(); ctx.arc(0, 0, dR, -Math.PI * 0.8, -Math.PI * 0.25);
      ctx.strokeStyle = '#6fe838'; ctx.lineWidth = 3.5; ctx.stroke();
      // Cinza/aço superior-direito
      ctx.beginPath(); ctx.arc(0, 0, dR, -Math.PI * 0.25, Math.PI * 0.25);
      ctx.strokeStyle = '#9eaab3'; ctx.lineWidth = 3.5; ctx.stroke();
      // Azul vivo inferior-direito
      ctx.beginPath(); ctx.arc(0, 0, dR, Math.PI * 0.25, Math.PI * 0.8);
      ctx.strokeStyle = '#0066ee'; ctx.lineWidth = 3.5; ctx.stroke();
      // Verde inferior-esquerdo
      ctx.beginPath(); ctx.arc(0, 0, dR, Math.PI * 0.8, Math.PI * 1.2);
      ctx.strokeStyle = '#55c724'; ctx.lineWidth = 3.5; ctx.stroke();

      // Bordas do anel do medidor
      ctx.beginPath(); ctx.arc(0, 0, dR + 1.8, 0, Math.PI * 2);
      ctx.strokeStyle = '#1a0e05'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, dR - 1.8, 0, Math.PI * 2);
      ctx.stroke();

      // Centro branco com a barra diagonal preta grossa
      ctx.beginPath();
      ctx.arc(0, 0, dR - 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.save();
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#111111';
      ctx.fillRect(-1.5, -(dR - 1.8), 3, (dR - 1.8) * 2);
      ctx.restore();
      ctx.restore();

      // 6. Canhão no topo com anel amarelo de suporte
      ctx.save();
      ctx.translate(-4, -21);
      ctx.rotate(-angle * GB.DEG);

      // Anel dourado/amarelo giratório
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#f5a600';
      ctx.fill();
      outline(ctx);
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      outline(ctx);

      // Base do cano amarela
      rr(ctx, 2, -4, 5, 8, 1.5);
      ctx.fillStyle = '#f5a600'; ctx.fill(); outline(ctx);
      // Faixa azul royal clássica do Grub
      rr(ctx, 6, -4.5, 8, 9, 1.5);
      ctx.fillStyle = '#0033cc'; ctx.fill(); outline(ctx);
      // Muzzle cônico branco/prata
      ctx.beginPath();
      ctx.moveTo(14, -4.5);
      ctx.lineTo(21, -3);
      ctx.lineTo(21, 3);
      ctx.lineTo(14, 4.5);
      ctx.closePath();
      ctx.fillStyle = '#edf2f7'; ctx.fill(); outline(ctx);
      // Abertura do cano
      ctx.beginPath();
      ctx.ellipse(21, 0, 1.5, 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1a1a'; ctx.fill();

      ctx.restore();
    },

    dj(ctx, angle, team) {
      // 1. Barriga arredondada inferior (Deep Maroon Underbelly)
      ctx.beginPath();
      ctx.ellipse(-1, -8.5, 9.0, 4.8, 0, 0, Math.PI);
      ctx.fillStyle = '#6b0b0b';
      ctx.fill();
      outline(ctx);

      // 2. Trem de pouso / Pés e Pistões metálicos (Landing gear)
      // Pé Traseiro (x = -11.5)
      // Articulação/joelho traseiro
      ctx.beginPath();
      ctx.moveTo(-14, -10.5);
      ctx.lineTo(-9, -10.5);
      ctx.lineTo(-9.8, -7.5);
      ctx.lineTo(-14, -7.5);
      ctx.closePath();
      ctx.fillStyle = '#7a0e0e';
      ctx.fill();
      outline(ctx);

      // Aba/Estabilizador traseiro (Winglet/Fin)
      ctx.beginPath();
      ctx.moveTo(-13, -10);
      ctx.lineTo(-19, -7.8);
      ctx.lineTo(-18, -5.5);
      ctx.lineTo(-12.5, -7.5);
      ctx.closePath();
      ctx.fillStyle = '#8f1212';
      ctx.fill();
      outline(ctx);

      // Pistão vertical traseiro
      ctx.beginPath();
      ctx.rect(-12.8, -8.0, 2.6, 4.8);
      const pistG1 = ctx.createLinearGradient(-12.8, 0, -10.2, 0);
      pistG1.addColorStop(0, '#546e7a');
      pistG1.addColorStop(0.5, '#cfd8dc');
      pistG1.addColorStop(1, '#37474f');
      ctx.fillStyle = pistG1;
      ctx.fill();
      outline(ctx);

      // Sapata / Prato de apoio traseiro (hemisfério vermelho)
      ctx.beginPath();
      ctx.ellipse(-11.5, -3.5, 5.2, 3.5, 0, 0, Math.PI);
      ctx.closePath();
      const footG1 = ctx.createLinearGradient(0, -3.5, 0, 0.5);
      footG1.addColorStop(0, '#e53935');
      footG1.addColorStop(0.65, '#c62828');
      footG1.addColorStop(1, '#7f0000');
      ctx.fillStyle = footG1;
      ctx.fill();
      outline(ctx);

      // Pé Dianteiro (x = 10)
      // Articulação/joelho dianteiro
      ctx.beginPath();
      ctx.moveTo(7.5, -10.5);
      ctx.lineTo(13, -10.5);
      ctx.lineTo(13, -7.5);
      ctx.lineTo(8.2, -7.5);
      ctx.closePath();
      ctx.fillStyle = '#7a0e0e';
      ctx.fill();
      outline(ctx);

      // Pistão vertical dianteiro
      ctx.beginPath();
      ctx.rect(8.8, -8.0, 2.6, 4.8);
      const pistG2 = ctx.createLinearGradient(8.8, 0, 11.4, 0);
      pistG2.addColorStop(0, '#546e7a');
      pistG2.addColorStop(0.5, '#cfd8dc');
      pistG2.addColorStop(1, '#37474f');
      ctx.fillStyle = pistG2;
      ctx.fill();
      outline(ctx);

      // Sapata / Prato de apoio dianteiro (hemisfério vermelho)
      ctx.beginPath();
      ctx.ellipse(10.1, -3.5, 5.2, 3.5, 0, 0, Math.PI);
      ctx.closePath();
      const footG2 = ctx.createLinearGradient(0, -3.5, 0, 0.5);
      footG2.addColorStop(0, '#e53935');
      footG2.addColorStop(0.65, '#c62828');
      footG2.addColorStop(1, '#7f0000');
      ctx.fillStyle = footG2;
      ctx.fill();
      outline(ctx);

      // 3. Corpo em formato de Tina / Caldeirão (Tub Chassis)
      // Barra base preta
      rr(ctx, -11, -10.5, 20.5, 2.4, 1);
      ctx.fillStyle = '#111111';
      ctx.fill();

      // Faixa inferior alaranjada/dourada
      ctx.beginPath();
      ctx.moveTo(-11, -10.5);
      ctx.lineTo(9.5, -10.5);
      ctx.lineTo(11, -15.8);
      ctx.lineTo(-12.2, -15.8);
      ctx.closePath();
      const orangeG = ctx.createLinearGradient(0, -15.8, 0, -10.5);
      orangeG.addColorStop(0, '#ffa726');
      orangeG.addColorStop(1, '#f57c00');
      ctx.fillStyle = orangeG;
      ctx.fill();
      outline(ctx);

      // Faixa intermediária amarelo-creme / marfim
      ctx.beginPath();
      ctx.moveTo(-12.2, -15.8);
      ctx.lineTo(11, -15.8);
      ctx.lineTo(12.5, -21.2);
      ctx.lineTo(-13.5, -21.2);
      ctx.closePath();
      const creamG = ctx.createLinearGradient(0, -21.2, 0, -15.8);
      creamG.addColorStop(0, '#fffde7');
      creamG.addColorStop(1, '#fff9c4');
      ctx.fillStyle = creamG;
      ctx.fill();
      outline(ctx);

      // Linha preta horizontal divisória entre as faixas
      ctx.beginPath();
      ctx.moveTo(-12.2, -15.8);
      ctx.lineTo(11, -15.8);
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Diamante central fúcsia/magenta neon bem destacado
      ctx.beginPath();
      ctx.moveTo(-2.2, -20.5);
      ctx.lineTo(3.0, -15.8);
      ctx.lineTo(-2.2, -11.1);
      ctx.lineTo(-7.4, -15.8);
      ctx.closePath();
      const diamG = ctx.createLinearGradient(-2.2, -20.5, -2.2, -11.1);
      diamG.addColorStop(0, '#ff40ff');
      diamG.addColorStop(0.5, '#e000d0');
      diamG.addColorStop(1, '#9c008b');
      ctx.fillStyle = diamG;
      ctx.fill();
      outline(ctx);

      // 4. Borda Superior / Colarinho (Rim / Collar)
      // Friso inferior vermelho vivo
      ctx.beginPath();
      ctx.moveTo(-14.2, -21.2);
      ctx.lineTo(13, -21.2);
      ctx.lineTo(13.4, -23.0);
      ctx.lineTo(-14.6, -23.0);
      ctx.closePath();
      ctx.fillStyle = '#d50000';
      ctx.fill();
      outline(ctx);

      // Colarinho bojudo carmesim/vinho alargando para cima
      ctx.beginPath();
      ctx.moveTo(-14.6, -23.0);
      ctx.lineTo(13.4, -23.0);
      ctx.lineTo(12.8, -26.5);
      ctx.lineTo(-14.0, -26.5);
      ctx.closePath();
      const collarG = ctx.createLinearGradient(-14.6, 0, 13.4, 0);
      collarG.addColorStop(0, '#730d05');
      collarG.addColorStop(0.3, '#9e1818');
      collarG.addColorStop(0.8, '#b71c1c');
      collarG.addColorStop(1, '#730d05');
      ctx.fillStyle = collarG;
      ctx.fill();
      outline(ctx);

      // Abertura superior da tina
      ctx.beginPath();
      ctx.ellipse(-0.6, -26.5, 13.0, 2.0, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#111111';
      ctx.fill();
      outline(ctx);

      // 5. Cabeça / Olho grande na lateral frontal direita
      // Olho expressivo com esclera branca e viseira inclinada (~11°)
      const eyeX = 12.0, eyeY = -14.2, eyeR = 6.4;
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      outline(ctx);

      // Viseira / Capacete vermelho cobrindo o topo do olho
      ctx.save();
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
      ctx.clip();

      // Recorte da metade superior inclinada da viseira
      const slant = 1.3;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(eyeX - eyeR - 2, eyeY - slant);
      ctx.lineTo(eyeX + eyeR + 2, eyeY + slant);
      ctx.lineTo(eyeX + eyeR + 2, eyeY - eyeR - 5);
      ctx.lineTo(eyeX - eyeR - 2, eyeY - eyeR - 5);
      ctx.closePath();
      ctx.clip();

      // Metade traseira do visor (vinho escuro)
      ctx.fillStyle = '#7a0e0e';
      ctx.fillRect(eyeX - eyeR - 2, eyeY - eyeR - 5, eyeR + 2, eyeR * 2 + 10);

      // Metade dianteira do visor (vermelho vivo)
      ctx.fillStyle = '#d50000';
      ctx.fillRect(eyeX, eyeY - eyeR - 5, eyeR + 3, eyeR * 2 + 10);
      ctx.restore();

      // Borda preta inferior da viseira inclinada
      ctx.beginPath();
      ctx.moveTo(eyeX - eyeR - 2, eyeY - slant);
      ctx.lineTo(eyeX + eyeR + 2, eyeY + slant);
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pupila preta no canto frontal direito
      ctx.beginPath();
      ctx.ellipse(eyeX + 3.8, eyeY + 1.0, 2.4, 3.9, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#111111';
      ctx.fill();

      // Brilho especular branco da pupila
      ctx.beginPath();
      ctx.arc(eyeX + 2.8, eyeY - 0.4, 1.0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();

      // Contorno final reforçado do olho
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
      outline(ctx);

      // 6. Lançador: Pistola de Raio / Ray Gun retro-futurista saindo do topo da cabeça
      ctx.save();
      ctx.translate(-1.5, -25.5);
      ctx.rotate(-angle * GB.DEG);

      // Suporte/pedestal de conexão
      ctx.beginPath();
      ctx.rect(-2.8, 2.5, 5.2, 4.0);
      ctx.fillStyle = '#1e272e';
      ctx.fill();
      outline(ctx);

      // Mira / Aleta dorsal no topo traseiro da culatra
      ctx.beginPath();
      ctx.moveTo(-7.5, -4.8);
      ctx.lineTo(-6.4, -11.8);
      ctx.lineTo(-1.2, -7.5);
      ctx.lineTo(0.8, -4.8);
      ctx.closePath();
      ctx.fillStyle = '#d50000';
      ctx.fill();
      outline(ctx);

      // Faixa branca chanfrada na aleta dorsal
      ctx.beginPath();
      ctx.moveTo(-3.6, -9.5);
      ctx.lineTo(-1.2, -7.5);
      ctx.lineTo(0.4, -4.8);
      ctx.lineTo(-1.7, -4.8);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Bloco principal da culatra (cinza grafite)
      ctx.beginPath();
      ctx.moveTo(-10.5, 0);
      ctx.lineTo(-8.2, -5.2);
      ctx.lineTo(5.2, -5.2);
      ctx.lineTo(5.2, 5.2);
      ctx.lineTo(-7.5, 5.2);
      ctx.lineTo(-10.5, 1.4);
      ctx.closePath();
      const gunG = ctx.createLinearGradient(0, -5.2, 0, 5.2);
      gunG.addColorStop(0, '#455a64');
      gunG.addColorStop(0.5, '#37474f');
      gunG.addColorStop(1, '#212121');
      ctx.fillStyle = gunG;
      ctx.fill();
      outline(ctx);

      // Grande Orbe Azul brilhante centralizado no pivô de rotação
      ctx.beginPath();
      ctx.arc(0, 0, 4.8, 0, Math.PI * 2);
      const orbG = ctx.createRadialGradient(-1.2, -1.2, 0.4, 0, 0, 4.8);
      orbG.addColorStop(0, '#40c4ff');
      orbG.addColorStop(0.2, '#0055ff');
      orbG.addColorStop(0.7, '#0026cc');
      orbG.addColorStop(1, '#001180');
      ctx.fillStyle = orbG;
      ctx.fill();
      outline(ctx);

      // Brilho especular do orbe azul
      ctx.beginPath();
      ctx.ellipse(-1.7, -1.7, 1.6, 1.0, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();

      // Bobinas / Anéis concêntricos prateados do cano (Tesla coils)
      for (let i = 0; i < 4; i++) {
        const rx = 5.2 + i * 3.3;
        const rw = 3.2;
        const rh = 4.8 - i * 0.36;
        ctx.beginPath();
        rr(ctx, rx, -rh, rw, rh * 2, 1.6);
        const ringG = ctx.createLinearGradient(0, -rh, 0, rh);
        ringG.addColorStop(0, '#ffffff');
        ringG.addColorStop(0.3, '#eceff1');
        ringG.addColorStop(0.7, '#90a4ae');
        ringG.addColorStop(1, '#546e7a');
        ctx.fillStyle = ringG;
        ctx.fill();
        outline(ctx);
      }

      // Bulbo esférico de energia na ponta do cano (vermelho vivo)
      ctx.beginPath();
      ctx.arc(22.5, 0, 5.2, 0, Math.PI * 2);
      const bulbG = ctx.createRadialGradient(21.4, -1.6, 0.4, 22.5, 0, 5.2);
      bulbG.addColorStop(0, '#ff5252');
      bulbG.addColorStop(0.3, '#ff1744');
      bulbG.addColorStop(0.7, '#d50000');
      bulbG.addColorStop(1, '#8b0000');
      ctx.fillStyle = bulbG;
      ctx.fill();
      outline(ctx);

      // Ponto de brilho branco no bulbo vermelho
      ctx.beginPath();
      ctx.arc(24.0, -1.8, 1.3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();
    },

    launcher(ctx, angle, team, wheelRot) {
      // 1. 3 Rodas em linha na base (Inline skate wheels com rotação)
      const rot = wheelRot || 0;
      for (const wx of [-11, 0, 11]) {
        ctx.save();
        ctx.translate(wx, -5);
        ctx.rotate(rot);
        // Pneu escuro
        ctx.beginPath();
        ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = '#1e1e1e';
        ctx.fill();
        outline(ctx);
        // Aro cor de âmbar/caramelo
        ctx.beginPath();
        ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
        const wheelG = ctx.createRadialGradient(-0.8, -0.8, 0.5, 0, 0, 4.2);
        wheelG.addColorStop(0, '#f2bb46');
        wheelG.addColorStop(0.7, '#c28522');
        wheelG.addColorStop(1, '#8c590f');
        ctx.fillStyle = wheelG;
        ctx.fill();
        outline(ctx);
        // 4 raios/furos na roda de patins que giram visivelmente
        ctx.fillStyle = '#6b3e04';
        for (let sp = 0; sp < 4; sp++) {
          const sa = sp * (Math.PI / 2);
          ctx.beginPath();
          ctx.arc(Math.cos(sa) * 2.4, Math.sin(sa) * 2.4, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
        // Eixo central preto
        ctx.beginPath();
        ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = '#111111';
        ctx.fill();
        ctx.restore();
      }

      // 2. Detalhes traseiros: Ponteira de escape e aba/para-lama branco aerodinâmico (x < 0)
      // Ponteira de escape na traseira
      rr(ctx, -19, -13, 5, 4, 1.5);
      ctx.fillStyle = '#e63906'; ctx.fill(); outline(ctx);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-17.5, -12, 3.5, 1.5);

      // Aba/para-lama aerodinâmico branco na traseira inferior
      ctx.beginPath();
      ctx.moveTo(-15, -7.5);
      ctx.lineTo(-7, -7.5);
      ctx.quadraticCurveTo(-7, -13, -11, -14);
      ctx.quadraticCurveTo(-15, -13, -15, -7.5);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      outline(ctx);

      // 3. Carroceria arredondada em casulo (vermelho-alaranjado)
      ctx.beginPath();
      ctx.moveTo(-16, -10);
      ctx.quadraticCurveTo(-16, -19, -4, -19);
      ctx.quadraticCurveTo(8, -19, 15, -15);
      ctx.quadraticCurveTo(18, -10, 12, -7);
      ctx.lineTo(-11, -7);
      ctx.closePath();
      const podG = ctx.createLinearGradient(0, -19, 0, -7);
      podG.addColorStop(0, '#ff5722');
      podG.addColorStop(0.5, '#e63906');
      podG.addColorStop(1, '#ba2602');
      ctx.fillStyle = podG;
      ctx.fill();
      outline(ctx);

      // Saiote inferior escuro
      ctx.beginPath();
      ctx.moveTo(-12, -8.5);
      ctx.lineTo(12, -8.5);
      ctx.lineTo(11, -6.8);
      ctx.lineTo(-11, -6.8);
      ctx.closePath();
      ctx.fillStyle = '#8c1a02';
      ctx.fill();

      // Faixa horizontal amarela na carroceria
      ctx.fillStyle = '#ffd600';
      ctx.fillRect(-12, -10.5, 23, 2.5);

      // Faixa da equipe
      ctx.fillStyle = team;
      ctx.fillRect(-8, -13, 11, 2);

      // 3 Fendas pretas horizontais de ventilação
      ctx.fillStyle = '#111111';
      for (const vy of [-15, -13, -11]) {
        rr(ctx, 3, vy, 6.5, 1.5, 0.7);
        ctx.fill();
      }

      // Brilho de reflexo branco no ombro traseiro
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(-8, -15, 6, 2.5, -Math.PI / 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.fill();
      ctx.restore();

      // 4. Alça metálica tubular tipo 'D' na traseira (atrás da cabeça)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-2, -23);
      ctx.lineTo(-8.5, -23);
      ctx.lineTo(-8.5, -34);
      ctx.lineTo(-1, -34);
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = '#8598a6';
      ctx.lineCap = 'round';
      ctx.stroke();
      outline(ctx);
      ctx.restore();

      // 5. Torre/base amarela do canhão e da cabeça
      ctx.beginPath();
      ctx.moveTo(-5, -18.5);
      ctx.lineTo(8, -18.5);
      ctx.lineTo(6, -26);
      ctx.lineTo(-3, -26);
      ctx.closePath();
      const turretG = ctx.createLinearGradient(0, -26, 0, -18.5);
      turretG.addColorStop(0, '#ffea00');
      turretG.addColorStop(1, '#ffb300');
      ctx.fillStyle = turretG;
      ctx.fill();
      outline(ctx);

      // 6. Canhão lançador cinza de aço com bico vermelho ("bico vermelho ao lado do rostinho")
      ctx.save();
      ctx.translate(2, -26);
      ctx.rotate(-angle * GB.DEG);

      // Base receptora escura do canhão
      rr(ctx, -5, -4, 5, 8, 2);
      ctx.fillStyle = '#37474f'; ctx.fill(); outline(ctx);

      // Tubo do cano cônico cinza de aço
      ctx.beginPath();
      ctx.moveTo(0, -4.5);
      ctx.lineTo(13, -6.5);
      ctx.lineTo(13, 6.5);
      ctx.lineTo(0, 4.5);
      ctx.closePath();
      const gunG = ctx.createLinearGradient(0, -6.5, 0, 6.5);
      gunG.addColorStop(0, '#cfd8dc');
      gunG.addColorStop(0.5, '#90a4ae');
      gunG.addColorStop(1, '#607d8b');
      ctx.fillStyle = gunG;
      ctx.fill();
      outline(ctx);

      // O icônico Bico Vermelho cilíndrico na boca do cano (x = 13 a 19)
      rr(ctx, 13, -7.5, 6, 15, 2.5);
      const bicoG = ctx.createLinearGradient(13, -7.5, 19, 7.5);
      bicoG.addColorStop(0, '#ff3d00');
      bicoG.addColorStop(0.5, '#d50000');
      bicoG.addColorStop(1, '#9b0000');
      ctx.fillStyle = bicoG;
      ctx.fill();
      outline(ctx);

      // Bocal na ponta do bico vermelho (x = 19)
      ctx.beginPath();
      ctx.ellipse(19, 0, 2, 7.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ff5252';
      ctx.fill();
      outline(ctx);

      // Abertura escura da boca do lançador
      ctx.beginPath();
      ctx.ellipse(19, 0, 1.4, 5.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#111111';
      ctx.fill();

      ctx.restore();

      // 7. Cabeça / Olho esférico (ao lado direito do canhão, olhando para a frente)
      ctx.save();
      ctx.translate(0, -30.5);

      // Globo ocular esférico branco
      ctx.beginPath();
      ctx.arc(0, 0, 6.8, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      outline(ctx);

      // Pálpebra / capacete vermelho no topo do olho
      ctx.beginPath();
      ctx.arc(0, 0, 6.8, Math.PI * 1.05, Math.PI * 1.95);
      ctx.closePath();
      const capG = ctx.createLinearGradient(0, -6.8, 0, -1);
      capG.addColorStop(0, '#ff3d00');
      capG.addColorStop(1, '#c62828');
      ctx.fillStyle = capG;
      ctx.fill();
      outline(ctx);

      // Pupila preta grande e nítida olhando para a frente
      ctx.beginPath();
      ctx.arc(2.8, 0.8, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#111111';
      ctx.fill();

      // Brilho na pupila
      ctx.beginPath();
      ctx.arc(2, -0.2, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();
    },

    khan(ctx, angle, team) {
      // 1. O Bumbum / Abdômen disparador na traseira (x < 0)
      // Conecta ao corpo em (-7, -14). Ele próprio mira de acordo com o ângulo (-35° a +35°)!
      ctx.save();
      ctx.translate(-7, -14);
      // Gira para trás (-x) e eleva quando angle > 0:
      ctx.rotate(Math.PI + angle * GB.DEG);

      // Corpo principal do abdômen (barril/cone arredondado alaranjado)
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.quadraticCurveTo(10, -11, 20, -7);
      ctx.lineTo(20, 7);
      ctx.quadraticCurveTo(10, 11, 0, 9);
      ctx.closePath();
      const bumbumGrad = ctx.createLinearGradient(0, -11, 0, 11);
      bumbumGrad.addColorStop(0, '#f28324');
      bumbumGrad.addColorStop(0.5, '#e06612');
      bumbumGrad.addColorStop(1, '#b54406');
      ctx.fillStyle = bumbumGrad;
      ctx.fill();
      outline(ctx);

      // Faixa escura larga (marrom-bordô) em volta do abdômen
      ctx.beginPath();
      ctx.moveTo(6, -10.5);
      ctx.lineTo(13, -9.5);
      ctx.lineTo(13, 9.5);
      ctx.lineTo(6, 10.5);
      ctx.closePath();
      ctx.fillStyle = '#4a1912';
      ctx.fill();
      outline(ctx);

      // Colar / Borda metálica prateada/branca na ponta (nozzle do bumbum)
      ctx.beginPath();
      ctx.moveTo(18, -7.5);
      ctx.lineTo(23, -6);
      ctx.lineTo(23, 6);
      ctx.lineTo(18, 7.5);
      ctx.closePath();
      ctx.fillStyle = '#e8eff5';
      ctx.fill();
      outline(ctx);

      // Abertura escura da saída do disparo no bumbum
      ctx.beginPath();
      ctx.ellipse(23, 0, 1.8, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#111111';
      ctx.fill();

      ctx.restore();

      // 2. Patas / Pods inferiores (3 gomos com juntas pretas e solas creme)
      const podXs = [-8, 2, 12];
      for (const px of podXs) {
        // Sola creme/marfim inferior
        ctx.beginPath();
        rr(ctx, px - 5, -5, 10, 5, 2.5);
        ctx.fillStyle = '#fce2b8';
        ctx.fill();
        outline(ctx);

        // Almofada alaranjada da pata
        ctx.beginPath();
        rr(ctx, px - 5.5, -11, 11, 7.5, 3);
        const podGrad = ctx.createLinearGradient(px, -11, px, -3.5);
        podGrad.addColorStop(0, '#f28324');
        podGrad.addColorStop(1, '#d45b0d');
        ctx.fillStyle = podGrad;
        ctx.fill();
        outline(ctx);

        // Junta / círculo preto no centro da pata
        ctx.beginPath();
        ctx.arc(px, -6.5, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#111111';
        ctx.fill();
      }

      // 3. Carapaça / Segmentos vermelhos arqueados do corpo (inseto/besouro)
      ctx.beginPath();
      ctx.moveTo(-10, -10);
      ctx.quadraticCurveTo(-8, -19, 0, -19);
      ctx.quadraticCurveTo(8, -19, 14, -13);
      ctx.quadraticCurveTo(8, -8, -10, -8);
      ctx.closePath();
      const shellGrad = ctx.createLinearGradient(0, -20, 0, -8);
      shellGrad.addColorStop(0, '#c72b1a');
      shellGrad.addColorStop(1, '#8e190c');
      ctx.fillStyle = shellGrad;
      ctx.fill();
      outline(ctx);

      // Detalhes dos gomos da carapaça vermelha sobre as patas
      for (const gx of [-4, 5]) {
        ctx.beginPath();
        ctx.arc(gx, -15, 6, Math.PI, 0);
        ctx.fillStyle = '#c72b1a';
        ctx.fill();
        outline(ctx);
        // Interior creme sob a carapaça
        ctx.beginPath();
        ctx.arc(gx, -13, 3, 0, Math.PI);
        ctx.fillStyle = '#fce2b8';
        ctx.fill();
      }

      // Faixa com a cor do time
      ctx.fillStyle = team;
      ctx.fillRect(-6, -11, 16, 2.5);

      // 4. Cabeça frontal (formato inseto/capacete vermelho com olho grande)
      ctx.save();
      ctx.translate(15, -13);

      // Antena / exaustor prateado no topo da cabeça
      ctx.beginPath();
      ctx.moveTo(1, -7);
      ctx.lineTo(4, -13);
      ctx.lineTo(7, -12);
      ctx.lineTo(4, -6);
      ctx.closePath();
      ctx.fillStyle = '#9cb0bd';
      ctx.fill();
      outline(ctx);

      // Cabeça redonda vermelha
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = '#c72b1a';
      ctx.fill();
      outline(ctx);

      // Olho frontal (globo ocular branco + capacete vermelho em cima + pupila preta)
      ctx.beginPath();
      ctx.arc(2, 0.5, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      outline(ctx);

      // Pálpebra superior vermelha do olho
      ctx.beginPath();
      ctx.arc(2, 0.5, 5, Math.PI * 0.9, Math.PI * 2.1);
      ctx.closePath();
      ctx.fillStyle = '#a61e10';
      ctx.fill();
      outline(ctx);

      // Pupila preta
      ctx.beginPath();
      ctx.arc(4.5, 1.5, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = '#111111';
      ctx.fill();
      // Brilho na pupila
      ctx.beginPath();
      ctx.arc(4, 0.8, 0.9, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();
    },

    doc(ctx, angle, team, wheelRot) {
      // 1. Esteira e Rodas (Caterpillar tracks & wheels com rotação)
      const rot = wheelRot || 0;
      // Dentes inferiores da esteira tocando o chão em y = 0
      ctx.fillStyle = '#1e272e';
      for (let tx = -13; tx <= 13; tx += 2.6) {
        ctx.fillRect(tx, -1.8, 1.6, 2.0);
      }

      // Faixa de borracha contínua da esteira
      ctx.beginPath();
      rr(ctx, -14.5, -7.5, 29, 6.2, 3);
      ctx.fillStyle = '#2c3e50';
      ctx.fill();
      outline(ctx);

      // Rodas internas da esteira
      // Roda traseira maior (x = -10)
      ctx.beginPath();
      ctx.arc(-10, -4.5, 3.8, 0, Math.PI * 2);
      ctx.fillStyle = '#90a4ae';
      ctx.fill();
      outline(ctx);
      ctx.beginPath();
      ctx.arc(-10, -4.5, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#37474f';
      ctx.fill();
      ctx.fillStyle = '#eceff1';
      for (let sp = 0; sp < 3; sp++) {
        const sa = sp * (Math.PI * 2 / 3) + rot;
        ctx.beginPath();
        ctx.arc(-10 + Math.cos(sa) * 2.6, -4.5 + Math.sin(sa) * 2.6, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Roletes centrais menores (x = -3.2 e x = 3.5)
      for (const rx of [-3.2, 3.5]) {
        ctx.beginPath();
        ctx.arc(rx, -4.5, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = '#78909c';
        ctx.fill();
        outline(ctx);
        ctx.beginPath();
        ctx.arc(rx, -4.5, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = '#263238';
        ctx.fill();
        ctx.fillStyle = '#eceff1';
        ctx.beginPath();
        ctx.arc(rx + Math.cos(rot * 2) * 1.6, -4.5 + Math.sin(rot * 2) * 1.6, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Roda dianteira maior (x = 10)
      ctx.beginPath();
      ctx.arc(10, -4.5, 3.8, 0, Math.PI * 2);
      ctx.fillStyle = '#90a4ae';
      ctx.fill();
      outline(ctx);
      ctx.beginPath();
      ctx.arc(10, -4.5, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#37474f';
      ctx.fill();
      ctx.fillStyle = '#eceff1';
      for (let sp = 0; sp < 3; sp++) {
        const sa = sp * (Math.PI * 2 / 3) + rot;
        ctx.beginPath();
        ctx.arc(10 + Math.cos(sa) * 2.6, -4.5 + Math.sin(sa) * 2.6, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      outline(ctx);
      ctx.beginPath();
      ctx.arc(10, -4.5, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = '#37474f';
      ctx.fill();

      // 2. Chassi da Ambulância (Ambulance Body)
      // Base/saia inferior verde-azulado/petróleo
      rr(ctx, -14, -9.5, 28, 2.5, 1);
      ctx.fillStyle = '#236b73';
      ctx.fill();
      outline(ctx);

      // Para-lama traseiro (x < 0)
      ctx.beginPath();
      ctx.moveTo(-16, -9);
      ctx.quadraticCurveTo(-16, -14.5, -11, -14.5);
      ctx.lineTo(-4, -14.5);
      ctx.lineTo(-4, -9);
      ctx.closePath();
      ctx.fillStyle = '#3ca3ab';
      ctx.fill();
      outline(ctx);

      // Para-lama dianteiro (x > 0)
      ctx.beginPath();
      ctx.moveTo(3.5, -9);
      ctx.lineTo(3.5, -14.5);
      ctx.lineTo(12, -14.5);
      ctx.quadraticCurveTo(17, -14.5, 17, -9);
      ctx.closePath();
      ctx.fillStyle = '#3ca3ab';
      ctx.fill();
      outline(ctx);

      // Lanterna traseira laranja/vermelha
      rr(ctx, -17.5, -13, 2.2, 4.5, 1);
      ctx.fillStyle = '#ff5722';
      ctx.fill();
      outline(ctx);

      // Farol dianteiro amarelo na ponta do para-lama
      ctx.beginPath();
      ctx.ellipse(17.5, -12, 1.5, 3.0, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffeb3b';
      ctx.fill();
      outline(ctx);

      // Corpo central da cabine (painéis brancos de ambulância)
      ctx.beginPath();
      ctx.moveTo(-14, -13);
      ctx.lineTo(-14, -18.5);
      ctx.lineTo(13.5, -18.5);
      ctx.quadraticCurveTo(16.5, -18.5, 16.5, -13);
      ctx.closePath();
      ctx.fillStyle = '#f0f7f8';
      ctx.fill();
      outline(ctx);

      // Traseira da cabine (fendas de ventilação pretas)
      for (const vy of [-17, -15.5, -14]) {
        ctx.fillStyle = '#263238';
        ctx.fillRect(-12.5, vy, 4.2, 0.9);
      }

      // Painel central quadrado com o emblema da cruz médica
      rr(ctx, -5.5, -18, 10.5, 9, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      outline(ctx);
      // Círculo verde-azulado
      ctx.beginPath();
      ctx.arc(-0.25, -13.5, 3.8, 0, Math.PI * 2);
      ctx.fillStyle = '#2d848c';
      ctx.fill();
      // Cruz médica branca
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2.25, -14.5, 4.0, 2.0);
      ctx.fillRect(-1.25, -15.5, 2.0, 4.0);

      // Bocal/escapamento traseiro
      rr(ctx, -18, -17.5, 3, 5.5, 1.5);
      ctx.fillStyle = '#546e7a';
      ctx.fill();
      outline(ctx);

      // Banco do motorista em couro marrom na traseira
      // Estrutura do banco cinza
      ctx.beginPath();
      ctx.moveTo(-14, -18.5);
      ctx.lineTo(-14, -28);
      ctx.lineTo(-10.5, -28);
      ctx.lineTo(-10.5, -20.5);
      ctx.lineTo(-6, -20.5);
      ctx.lineTo(-6, -18.5);
      ctx.closePath();
      ctx.fillStyle = '#455a64';
      ctx.fill();
      outline(ctx);
      // Estofamento marrom acolchoado
      ctx.beginPath();
      ctx.moveTo(-13, -19.5);
      ctx.lineTo(-13, -27);
      ctx.lineTo(-11.5, -27);
      ctx.lineTo(-11.5, -21.5);
      ctx.lineTo(-7, -21.5);
      ctx.lineTo(-7, -19.5);
      ctx.closePath();
      const seatG = ctx.createLinearGradient(-13, -27, -7, -19.5);
      seatG.addColorStop(0, '#8d6e63');
      seatG.addColorStop(1, '#5d4037');
      ctx.fillStyle = seatG;
      ctx.fill();

      // Anel da torre giratória
      rr(ctx, 1.5, -20, 8, 2.0, 1);
      ctx.fillStyle = '#263238';
      ctx.fill();
      outline(ctx);

      // 3. Torre Giratória, Canhão e Sistema de Seringa Médica
      ctx.save();
      ctx.translate(5.5, -22);
      ctx.rotate(-angle * GB.DEG);

      // Cúpula da torre
      ctx.beginPath();
      ctx.moveTo(-8, 3.5);
      ctx.lineTo(-8, -4);
      ctx.quadraticCurveTo(-6, -7.5, 0, -7.5);
      ctx.quadraticCurveTo(5.5, -7.5, 6.5, -2);
      ctx.lineTo(6.5, 3.5);
      ctx.closePath();
      const turretG = ctx.createLinearGradient(0, -7.5, 0, 3.5);
      turretG.addColorStop(0, '#eaf4f6');
      turretG.addColorStop(0.55, '#d0e5e8');
      turretG.addColorStop(0.6, '#3ca3ab');
      turretG.addColorStop(1, '#2a7c83');
      ctx.fillStyle = turretG;
      ctx.fill();
      outline(ctx);

      // Pivô circular lateral com parafuso
      ctx.beginPath();
      ctx.arc(-3, -0.5, 2.8, 0, Math.PI * 2);
      ctx.fillStyle = '#90a4ae';
      ctx.fill();
      outline(ctx);
      ctx.beginPath();
      ctx.arc(-3, -0.5, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = '#37474f';
      ctx.fill();

      // Tubo de infusão curvo (vermelho/magenta) saindo de trás do frasco
      ctx.beginPath();
      ctx.moveTo(-6, -9.5);
      ctx.bezierCurveTo(-11, -9.5, -11, -3, -8, 0);
      ctx.strokeStyle = '#e91e63';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Mangueira inferior conectada ao cano
      ctx.beginPath();
      ctx.moveTo(3, 3);
      ctx.quadraticCurveTo(8, 7, 12, 1);
      ctx.strokeStyle = '#26c6da';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Frasco de vidro com líquido verde medicinal brilhante (topo da torre)
      rr(ctx, -5.5, -12.5, 7.5, 4.2, 1.2);
      const vialG = ctx.createLinearGradient(0, -12.5, 0, -8.3);
      vialG.addColorStop(0, '#b9f6ca');
      vialG.addColorStop(0.4, '#00e676');
      vialG.addColorStop(1, '#00a152');
      ctx.fillStyle = vialG;
      ctx.fill();
      outline(ctx, 1.2);

      // Tampas metálicas do frasco
      ctx.fillStyle = '#78909c';
      ctx.fillRect(-6.8, -12, 1.5, 3.2);
      ctx.fillRect(1.8, -12, 1.5, 3.2);

      // Seringa e agulha na parte frontal do frasco
      rr(ctx, 3, -11.6, 6.0, 2.4, 0.8);
      ctx.fillStyle = '#80deea';
      ctx.fill();
      outline(ctx, 1.0);
      // Agulha metálica
      ctx.beginPath();
      ctx.moveTo(9, -10.4);
      ctx.lineTo(14, -10.4);
      ctx.strokeStyle = '#37474f';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Canhão principal (aço e colares verde-petróleo)
      // Base do cano
      rr(ctx, 6.5, -3.8, 2.5, 6.5, 1);
      ctx.fillStyle = '#2d848c';
      ctx.fill();
      outline(ctx);

      // Corpo metálico central do cano
      rr(ctx, 9, -2.8, 6.5, 4.8, 1);
      const barrelG = ctx.createLinearGradient(0, -2.8, 0, 2.0);
      barrelG.addColorStop(0, '#ffffff');
      barrelG.addColorStop(0.3, '#cfd8dc');
      barrelG.addColorStop(0.7, '#78909c');
      barrelG.addColorStop(1, '#455a64');
      ctx.fillStyle = barrelG;
      ctx.fill();
      outline(ctx);

      // Ponteira / Boca do canhão com mira elevada
      ctx.beginPath();
      ctx.moveTo(15.5, -3.6);
      ctx.lineTo(19.5, -3.6);
      ctx.lineTo(19.5, -5.8); // mira superior
      ctx.lineTo(21.0, -5.8);
      ctx.lineTo(21.5, -3.6);
      ctx.lineTo(21.5, 3.2);
      ctx.lineTo(15.5, 3.2);
      ctx.closePath();
      ctx.fillStyle = '#2d848c';
      ctx.fill();
      outline(ctx);

      // Abertura do cano
      ctx.beginPath();
      ctx.ellipse(21.5, -0.2, 1.0, 2.8, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#111111';
      ctx.fill();

      ctx.restore();
    },

    frigo(ctx, angle, team) {
      // Cores principais fiéis à imagem de referência
      const cIceBase = '#7bb8e8';    // Azul celeste base da armadura
      const cIceLight = '#b2e2ff';   // Reflexo e topo iluminado das curvas
      const cIceMid = '#5fa8df';     // Meio tom
      const cIceDark = '#3d82bb';    // Sombra inferior da blindagem
      const cLine = '#142230';       // Linhas pretas de contorno cartoon
      const cDarkMetal = '#2b3642';  // Metal cinza escuro (esteira, canhão)
      const cSeatBlue = '#174878';   // Estofamento azul marinho
      const cSeatLight = '#2665a3';

      // 1. Pata Dianteira de Fundo (Perna direita/fundo - abaixo da cabeça)
      ctx.beginPath();
      ctx.moveTo(13, -11);
      ctx.lineTo(19, -11);
      ctx.lineTo(21, -6);
      ctx.lineTo(15, -6);
      ctx.closePath();
      ctx.fillStyle = cIceDark; ctx.fill(); outline(ctx);

      // Pata / punho apoiado no chão (ao fundo)
      ctx.beginPath();
      rr(ctx, 14, -5.5, 8.5, 5.5, 2);
      ctx.fillStyle = cIceMid; ctx.fill(); outline(ctx);
      // Sola escura
      rr(ctx, 14.5, -1.5, 7.5, 1.5, 0.5);
      ctx.fillStyle = '#1c242c'; ctx.fill();

      // 2. Chassi inferior e grelha de refrigeração (barriga entre esteira e perna)
      ctx.beginPath();
      ctx.moveTo(-6, -7);
      ctx.quadraticCurveTo(2, -4, 10, -7);
      ctx.lineTo(10, -11);
      ctx.lineTo(-6, -11);
      ctx.closePath();
      ctx.fillStyle = '#222b35'; ctx.fill(); outline(ctx);
      // Aletas de ventilação verticais
      ctx.strokeStyle = '#151c24'; ctx.lineWidth = 1.2;
      for (let vx = -3; vx <= 7; vx += 2.2) {
        ctx.beginPath(); ctx.moveTo(vx, -9.5); ctx.lineTo(vx, -5.5); ctx.stroke();
      }

      // 3. Esteira Traseira (Lagarta / Treads)
      rr(ctx, -20.5, -6.5, 16.5, 6.5, 3.2);
      ctx.fillStyle = '#1c222a'; ctx.fill(); outline(ctx);
      // Dentes inferiores da esteira tocando o chão
      ctx.fillStyle = '#12171d';
      for (let tx = -19; tx <= -6; tx += 2.5) {
        ctx.fillRect(tx, -1.2, 1.4, 1.2);
      }

      // Rodas de rolamento internas (2 rodas cinzas)
      [-16, -9.5].forEach(wx => {
        ctx.beginPath();
        ctx.arc(wx, -3.2, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = '#455364'; ctx.fill();
        ctx.beginPath();
        ctx.arc(wx, -3.2, 1.3, 0, Math.PI * 2);
        ctx.fillStyle = '#1c222a'; ctx.fill();
      });

      // Blindagem / Para-lama da esteira (trapezoidal angular com chanfros)
      ctx.beginPath();
      ctx.moveTo(-21, -6);
      ctx.lineTo(-19.5, -14);
      ctx.lineTo(-6.5, -14);
      ctx.lineTo(-4.5, -6);
      ctx.closePath();
      const gFender = ctx.createLinearGradient(0, -14, 0, -6);
      gFender.addColorStop(0, cIceLight);
      gFender.addColorStop(0.3, cIceBase);
      gFender.addColorStop(1, cIceDark);
      ctx.fillStyle = gFender; ctx.fill(); outline(ctx);

      // Linha de divisão central do para-lama
      ctx.beginPath();
      ctx.moveTo(-13, -14); ctx.lineTo(-13, -6);
      ctx.strokeStyle = cLine; ctx.lineWidth = 1.4; ctx.stroke();

      // Painel chanfrado dianteiro do para-lama
      ctx.beginPath();
      ctx.moveTo(-13, -13);
      ctx.lineTo(-7.5, -13);
      ctx.lineTo(-6, -7);
      ctx.lineTo(-13, -7);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'; ctx.fill();

      // Rebites do para-lama
      [[-17.5, -11.5], [-17.5, -8], [-8.5, -11.5], [-8.5, -8]].forEach(([rx, ry]) => {
        ctx.beginPath(); ctx.arc(rx, ry, 0.85, 0, Math.PI * 2);
        ctx.fillStyle = cLine; ctx.fill();
        ctx.beginPath(); ctx.arc(rx - 0.2, ry - 0.2, 0.35, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill();
      });

      // Cabo corrugado saindo da esteira para o corpo
      ctx.beginPath();
      ctx.moveTo(-7, -10);
      ctx.quadraticCurveTo(-4, -8, -2, -10);
      ctx.strokeStyle = '#12161c'; ctx.lineWidth = 2.2; ctx.stroke();

      // 4. Cockpit / Assento do Piloto na traseira
      rr(ctx, -19, -15, 12, 5, 1.5);
      ctx.fillStyle = cIceMid; ctx.fill(); outline(ctx);
      ctx.fillStyle = cLine;
      ctx.beginPath(); ctx.arc(-17, -12.5, 0.75, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-9, -12.5, 0.75, 0, Math.PI * 2); ctx.fill();

      // Encosto e assento almofadado azul escuro
      ctx.beginPath();
      ctx.moveTo(-17, -24.5);
      ctx.lineTo(-11, -24.5);
      ctx.lineTo(-10.5, -15.5);
      ctx.lineTo(-17, -15.5);
      ctx.closePath();
      const gSeat = ctx.createLinearGradient(0, -25, 0, -15);
      gSeat.addColorStop(0, cSeatLight);
      gSeat.addColorStop(1, cSeatBlue);
      ctx.fillStyle = gSeat; ctx.fill(); outline(ctx);
      // Gomos verticais do estofamento
      ctx.strokeStyle = '#0e2b47'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(-14, -24); ctx.lineTo(-14, -16); ctx.stroke();

      // Moldura externa cinza escura / Santo-antônio e apoio de braço
      ctx.beginPath();
      ctx.moveTo(-19, -15);
      ctx.lineTo(-19, -24);
      ctx.arcTo(-19, -27, -15, -27, 3.5);
      ctx.lineTo(-11, -27);
      ctx.arcTo(-8, -27, -8, -23, 3.5);
      ctx.lineTo(-8, -19);
      ctx.quadraticCurveTo(-7, -15, -2, -15);
      ctx.lineTo(-2, -12);
      ctx.quadraticCurveTo(-7, -12, -9, -15);
      ctx.lineTo(-9, -23);
      ctx.lineTo(-16.5, -23);
      ctx.lineTo(-16.5, -15);
      ctx.closePath();
      ctx.fillStyle = cDarkMetal; ctx.fill(); outline(ctx);
      // Parafuso na moldura
      ctx.fillStyle = '#67788a';
      ctx.beginPath(); ctx.arc(-17.5, -20, 0.8, 0, Math.PI * 2); ctx.fill();

      // 5. Tronco / Corcova do Gorila (corpo central musculoso)
      ctx.beginPath();
      ctx.moveTo(-8, -15);
      ctx.quadraticCurveTo(-6, -22, 2, -22.5);
      ctx.lineTo(6, -22.5);
      ctx.quadraticCurveTo(11, -22.5, 12.5, -16);
      ctx.lineTo(12.5, -9);
      ctx.lineTo(-8, -9);
      ctx.closePath();
      const gBody = ctx.createRadialGradient(2, -19, 2, 2, -17, 15);
      gBody.addColorStop(0, cIceLight);
      gBody.addColorStop(0.5, cIceBase);
      gBody.addColorStop(1, cIceDark);
      ctx.fillStyle = gBody; ctx.fill(); outline(ctx);

      // Linha de divisão e rebites nas costas do gorila
      ctx.beginPath();
      ctx.moveTo(1, -22.5); ctx.lineTo(1, -12);
      ctx.strokeStyle = cLine; ctx.lineWidth = 1.2; ctx.stroke();
      [[-4, -19], [-1, -21], [3, -21], [7, -19]].forEach(([rx, ry]) => {
        ctx.beginPath(); ctx.arc(rx, ry, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = cLine; ctx.fill();
      });

      // 6. Cabeça Robótica Marcante do Gorila (frente)
      ctx.beginPath();
      ctx.moveTo(8.5, -17.5);
      ctx.lineTo(16, -17.5);
      ctx.quadraticCurveTo(20, -17.5, 20.5, -14);
      ctx.lineTo(19.5, -8.5);
      ctx.lineTo(9.5, -8.5);
      ctx.closePath();
      const gHead = ctx.createLinearGradient(0, -18, 0, -8);
      gHead.addColorStop(0, cIceLight);
      gHead.addColorStop(0.4, cIceBase);
      gHead.addColorStop(1, cIceDark);
      ctx.fillStyle = gHead; ctx.fill(); outline(ctx);

      // Queixo / mandíbula inferior chanfrada
      ctx.beginPath();
      ctx.moveTo(10, -8.5);
      ctx.lineTo(19, -8.5);
      ctx.lineTo(17.5, -5.5);
      ctx.lineTo(11, -5.5);
      ctx.closePath();
      ctx.fillStyle = cIceMid; ctx.fill(); outline(ctx);

      // Chanfro e placa frontal iluminada da cabeça
      ctx.beginPath();
      ctx.moveTo(13, -16.5);
      ctx.lineTo(18.5, -16.5);
      ctx.lineTo(18, -10);
      ctx.lineTo(13, -10);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'; ctx.fill();
      // Rebite frontal
      ctx.fillStyle = cLine;
      ctx.beginPath(); ctx.arc(15.5, -13, 0.8, 0, Math.PI * 2); ctx.fill();

      // Conector lateral de metal escuro na cabeça
      ctx.beginPath();
      ctx.arc(10.5, -12, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = cDarkMetal; ctx.fill(); outline(ctx);

      // Cabo preto corrugado característico conectando a cabeça ao peito!
      ctx.beginPath();
      ctx.moveTo(10, -12);
      ctx.bezierCurveTo(7, -10, 6, -14, 3, -13);
      ctx.strokeStyle = '#12161c'; ctx.lineWidth = 2.2; ctx.stroke();

      // 7. Pata Dianteira de Primeiro Plano (Pata esquerda - O braço de gorila musculoso!)
      // Ombro / Junta circular grande (deltoide)
      ctx.beginPath();
      ctx.arc(0, -13, 6.2, 0, Math.PI * 2);
      const gShoulder = ctx.createRadialGradient(-1.5, -14.5, 1, 0, -13, 6.2);
      gShoulder.addColorStop(0, cIceLight);
      gShoulder.addColorStop(0.7, cIceBase);
      gShoulder.addColorStop(1, cIceDark);
      ctx.fillStyle = gShoulder; ctx.fill(); outline(ctx);

      // Disco de articulação metálico central com fenda
      ctx.beginPath(); ctx.arc(0, -13, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#404e5c'; ctx.fill(); outline(ctx);
      ctx.beginPath(); ctx.arc(0, -13, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = '#1c242c'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2, -13); ctx.lineTo(2, -13);
      ctx.strokeStyle = '#6e8296'; ctx.lineWidth = 1; ctx.stroke();

      // Cotovelo / Cabo preto saindo de trás do ombro
      ctx.beginPath();
      ctx.moveTo(-1, -8);
      ctx.quadraticCurveTo(-2, -5, -4, -6);
      ctx.strokeStyle = '#12161c'; ctx.lineWidth = 2.0; ctx.stroke();

      // Braço / Antebraço robusto chanfrado (segmento médio)
      ctx.beginPath();
      ctx.moveTo(1.5, -10);
      ctx.lineTo(7.5, -8);
      ctx.lineTo(6.5, -3);
      ctx.lineTo(1.5, -3.5);
      ctx.closePath();
      ctx.fillStyle = cIceBase; ctx.fill(); outline(ctx);
      // Parafusos do antebraço
      ctx.fillStyle = cLine;
      ctx.beginPath(); ctx.arc(3, -6.5, 0.75, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5.8, -5.5, 0.75, 0, Math.PI * 2); ctx.fill();

      // Punho / Pata assentada no solo (nós dos dedos no chão!)
      ctx.beginPath();
      rr(ctx, 1.5, -3.5, 8.5, 3.5, 1.2);
      const gHand = ctx.createLinearGradient(0, -3.5, 0, 0);
      gHand.addColorStop(0, cIceLight);
      gHand.addColorStop(1, cIceDark);
      ctx.fillStyle = gHand; ctx.fill(); outline(ctx);
      // Sola / apoio de borracha
      rr(ctx, 2, -1.0, 7.5, 1.0, 0.4);
      ctx.fillStyle = '#1c242c'; ctx.fill();

      // 8. Berço / Suporte côncavo azul do canhão no dorso (em x = 6, y = -21)
      ctx.beginPath();
      ctx.arc(6, -21, 5.2, 0, Math.PI * 2);
      ctx.fillStyle = cIceDark; ctx.fill(); outline(ctx);
      // Faixa da cor do time
      ctx.beginPath();
      ctx.arc(6, -21, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = team || '#fff'; ctx.fill();

      // 9. Canhão Lançador (Morteiro Compacto e Proporcional!)
      ctx.save();
      ctx.translate(6, -21);
      ctx.rotate(-angle * GB.DEG);

      // Manga / Meia-concha azul de proteção na base do canhão
      ctx.beginPath();
      ctx.arc(0, 0, 4.8, Math.PI * 0.5, Math.PI * 1.5);
      ctx.fillStyle = cIceBase; ctx.fill(); outline(ctx);

      // Culatra traseira escura
      rr(ctx, -4.5, -4.5, 4.5, 9, 2);
      ctx.fillStyle = '#1c232a'; ctx.fill(); outline(ctx);

      // Tubo cilíndrico do morteiro (comprimento 16, espessura 9.5)
      const bLen = 16;
      const bThick = 9.5;
      rr(ctx, 0, -bThick / 2, bLen, bThick, 1.5);
      const gMortar = ctx.createLinearGradient(0, -bThick / 2, 0, bThick / 2);
      gMortar.addColorStop(0, '#596775');
      gMortar.addColorStop(0.35, '#3d4752');
      gMortar.addColorStop(1, '#252d35');
      ctx.fillStyle = gMortar; ctx.fill(); outline(ctx);

      // Colar reforçado da boca (Muzzle Ring - comprimento 4.5, espessura 12)
      const ringL = 4.5;
      const ringT = 12;
      rr(ctx, bLen - 3.5, -ringT / 2, ringL, ringT, 1.5);
      const gRing = ctx.createLinearGradient(0, -ringT / 2, 0, ringT / 2);
      gRing.addColorStop(0, '#424d57');
      gRing.addColorStop(0.4, '#2e3740');
      gRing.addColorStop(1, '#1b2229');
      ctx.fillStyle = gRing; ctx.fill(); outline(ctx);

      // Boca elíptica interna do morteiro
      ctx.beginPath();
      ctx.ellipse(bLen + 0.8, 0, 1.5, ringT * 0.38, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#0f1317'; ctx.fill();

      ctx.restore();
    },

    driller(ctx, angle, team, wheelRot) {
      // 1. Escapamento traseiro duplo com grade perfurada (x: -16 a -20, y: -12 a -34)
      ctx.save();
      // Tubo de trás
      ctx.beginPath();
      ctx.moveTo(-18, -14);
      ctx.lineTo(-18, -26);
      ctx.quadraticCurveTo(-18, -31, -21, -33);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#606770';
      ctx.lineCap = 'round';
      ctx.stroke();
      outline(ctx);

      // Tubo da frente
      ctx.beginPath();
      ctx.moveTo(-14, -14);
      ctx.lineTo(-14, -28);
      ctx.quadraticCurveTo(-14, -33, -17, -35);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#757d88';
      ctx.lineCap = 'round';
      ctx.stroke();
      outline(ctx);

      // Jaqueta perfurada (heat shield)
      rr(ctx, -16.5, -24, 5, 11, 1.5);
      ctx.fillStyle = '#8b949e';
      ctx.fill();
      outline(ctx);
      // Furos do protetor térmico
      ctx.fillStyle = '#2d333b';
      for (let fy = -22; fy <= -15; fy += 3) {
        ctx.beginPath(); ctx.arc(-15, fy, 0.9, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(-13, fy + 1.5, 0.9, 0, 7); ctx.fill();
      }
      ctx.restore();

      // 2. Olho direito no fundo (peeking do outro lado do capô)
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(16, -17, 2.5, 3.5, 0.1, 0, 7);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      outline(ctx);
      ctx.beginPath();
      ctx.arc(16.5, -16.5, 1.4, 0, 7);
      ctx.fillStyle = '#111111';
      ctx.fill();
      ctx.restore();

      // 3. Esteiras e Rodas (Caterpillar Tracks)
      // Esteira base (cápsula/oval externo)
      ctx.save();
      rr(ctx, -21, -12.5, 38, 12.5, 6);
      ctx.fillStyle = '#323438';
      ctx.fill();
      outline(ctx);

      // Dentes/garras da esteira (tread cleats) ao redor
      ctx.fillStyle = '#222326';
      for (let tx = -18; tx <= 14; tx += 3.6) {
        ctx.fillRect(tx, -0.8, 2.4, 1.2);   // dentes inferiores no chão
        ctx.fillRect(tx, -13.2, 2.4, 1.2);  // dentes superiores
      }
      // Dentes nas curvas traseira e dianteira
      ctx.fillRect(-22.2, -8, 1.4, 3.5);
      ctx.fillRect(17.8, -8, 1.4, 3.5);

      // Miolo interno da esteira
      rr(ctx, -19, -11, 34, 9.5, 4.5);
      ctx.fillStyle = '#1a1b1d';
      ctx.fill();

      const rot = wheelRot || 0;
      // Roda motriz traseira grande (Drive Sprocket) em x = -12, y = -6.2
      ctx.beginPath();
      ctx.arc(-12, -6.2, 5.2, 0, 7);
      ctx.fillStyle = '#5c584a';
      ctx.fill();
      outline(ctx);
      // Cubo e parafusos da roda traseira que giram visivelmente
      ctx.beginPath(); ctx.arc(-12, -6.2, 2.5, 0, 7); ctx.fillStyle = '#3a372e'; ctx.fill();
      ctx.fillStyle = '#dcd8c0';
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
        ctx.beginPath();
        ctx.arc(-12 + Math.cos(a + rot) * 3.8, -6.2 + Math.sin(a + rot) * 3.8, 0.7, 0, 7);
        ctx.fill();
      }

      // Roda guia dianteira média (Front Idler) em x = 9.5, y = -6.2
      ctx.beginPath();
      ctx.arc(9.5, -6.2, 4.2, 0, 7);
      ctx.fillStyle = '#5c584a';
      ctx.fill();
      outline(ctx);
      ctx.beginPath(); ctx.arc(9.5, -6.2, 1.8, 0, 7); ctx.fillStyle = '#3a372e'; ctx.fill();
      ctx.fillStyle = '#dcd8c0';
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
        ctx.beginPath();
        ctx.arc(9.5 + Math.cos(a + rot) * 2.8, -6.2 + Math.sin(a + rot) * 2.8, 0.6, 0, 7);
        ctx.fill();
      }

      // 3 roletes inferiores pequenos (Return Rollers) que giram
      [-4.5, 0, 4.5].forEach(rx => {
        ctx.beginPath(); ctx.arc(rx, -4.2, 2.2, 0, 7); ctx.fillStyle = '#4c483c'; ctx.fill(); outline(ctx);
        ctx.beginPath(); ctx.arc(rx, -4.2, 0.9, 0, 7); ctx.fillStyle = '#222'; ctx.fill();
        ctx.fillStyle = '#c0b89a';
        ctx.beginPath(); ctx.arc(rx + Math.cos(rot * 2) * 1.3, -4.2 + Math.sin(rot * 2) * 1.3, 0.45, 0, 7); ctx.fill();
      });

      // Braço de suspensão verde (Bogie Arm) unindo centro à roda dianteira
      ctx.beginPath();
      ctx.moveTo(-6, -9);
      ctx.lineTo(8, -8);
      ctx.lineTo(11, -5.5);
      ctx.lineTo(7, -3.5);
      ctx.lineTo(-6, -3.5);
      ctx.closePath();
      ctx.fillStyle = '#48b828';
      ctx.fill();
      outline(ctx);
      // Parafusos do braço de suspensão
      ctx.fillStyle = '#1e3814';
      ctx.beginPath(); ctx.arc(8.5, -6, 1.2, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(-4, -5.5, 0.8, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(1, -5.5, 0.8, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(-4, -7.5, 0.8, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(1, -7.5, 0.8, 0, 7); ctx.fill();
      ctx.restore();

      // 4. Para-lama Traseiro Verde com Lanterna Laranja
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-21, -11);
      ctx.quadraticCurveTo(-22, -14, -18, -14.5);
      ctx.lineTo(-2, -14.5);
      ctx.quadraticCurveTo(0, -14.5, 1, -12);
      ctx.lineTo(0, -10.5);
      ctx.lineTo(-17, -10.5);
      ctx.quadraticCurveTo(-20, -10.5, -21, -11);
      ctx.closePath();
      ctx.fillStyle = '#4cb82c';
      ctx.fill();
      outline(ctx);
      // Lanterna traseira laranja
      rr(ctx, -22, -13.5, 2, 3, 0.8);
      ctx.fillStyle = '#ff8800';
      ctx.fill();
      outline(ctx);
      ctx.restore();

      // 5. Chassi / Casco Central com Faixa de Atenção (Hazard Stripe)
      ctx.save();
      // Corpo do chassi verde
      ctx.beginPath();
      ctx.moveTo(-16, -14);
      ctx.lineTo(-16, -23);
      ctx.lineTo(2, -23);
      ctx.lineTo(4, -14);
      ctx.closePath();
      ctx.fillStyle = '#42a826';
      ctx.fill();
      outline(ctx);

      // Faixa diagonal amarelo e preto (Hazard Stripe)
      ctx.save();
      rr(ctx, -14.5, -21.5, 15, 6, 1);
      ctx.clip();
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(-15, -22, 16, 7);
      ctx.fillStyle = '#222222';
      ctx.beginPath();
      for (let hx = -22; hx < 6; hx += 4.5) {
        ctx.moveTo(hx, -14);
        ctx.lineTo(hx + 3, -14);
        ctx.lineTo(hx + 5.5, -23);
        ctx.lineTo(hx + 2.5, -23);
        ctx.closePath();
      }
      ctx.fill();
      ctx.restore();
      rr(ctx, -14.5, -21.5, 15, 6, 1);
      outline(ctx);

      // Rebites do chassi
      ctx.fillStyle = '#1e3814';
      [-14, -8, -1].forEach(rx => {
        ctx.beginPath(); ctx.arc(rx, -13, 0.7, 0, 7); ctx.fill();
      });
      ctx.restore();

      // 6. Cockpit do Trator: Assento e Volante
      ctx.save();
      // Assento escuro (Seat)
      ctx.beginPath();
      ctx.moveTo(2.5, -14);
      ctx.lineTo(2.5, -24);
      ctx.quadraticCurveTo(2.5, -26, 4.5, -26);
      ctx.lineTo(6, -26);
      ctx.lineTo(6, -18);
      ctx.lineTo(8.5, -18);
      ctx.lineTo(8.5, -14);
      ctx.closePath();
      ctx.fillStyle = '#3a443a';
      ctx.fill();
      outline(ctx);

      // Coluna de direção e volante
      ctx.beginPath();
      ctx.moveTo(7.5, -14);
      ctx.lineTo(10, -21);
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#222';
      ctx.stroke();

      // Volante inclinado
      ctx.save();
      ctx.translate(10, -21);
      ctx.rotate(-0.4);
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.8, 1.4, 0, 0, 7);
      ctx.fillStyle = '#111';
      ctx.fill();
      outline(ctx);
      ctx.restore();
      ctx.restore();

      // 7. Capô Frontal, Grade do Radiador, Para-choque e Olho
      ctx.save();
      // Capô frontal verde
      ctx.beginPath();
      ctx.moveTo(7, -13);
      ctx.lineTo(7, -21);
      ctx.quadraticCurveTo(8, -25.5, 12, -26);
      ctx.quadraticCurveTo(15, -26, 15.5, -21);
      ctx.lineTo(15.5, -11);
      ctx.lineTo(8.5, -11);
      ctx.closePath();
      ctx.fillStyle = '#4cb82c';
      ctx.fill();
      outline(ctx);

      // Grade do radiador cinza
      rr(ctx, 13, -22, 2.8, 10, 1.2);
      ctx.fillStyle = '#374151';
      ctx.fill();
      outline(ctx);
      // Aletas horizontais
      ctx.fillStyle = '#1f2937';
      for (let gy = -20.5; gy <= -13.5; gy += 2.2) {
        ctx.fillRect(13.2, gy, 2.4, 0.9);
      }

      // Para-choque dianteiro (Bumper cinza com rebaixos)
      rr(ctx, 12, -12, 4.5, 3.8, 1);
      ctx.fillStyle = '#718096';
      ctx.fill();
      outline(ctx);
      // Dentes do para-choque
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(13, -9.5, 0.8, 1.3);
      ctx.fillRect(14.5, -9.5, 0.8, 1.3);

      // Olho esquerdo em destaque (Carismático cartoon)
      ctx.beginPath();
      ctx.ellipse(11, -17.5, 3.6, 4.2, 0.05, 0, 7);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      outline(ctx);

      // Pupila preta e brilho
      ctx.beginPath();
      ctx.arc(11.8, -17.5, 2.0, 0, 7);
      ctx.fillStyle = '#111827';
      ctx.fill();
      // Brilho branco na pupila
      ctx.beginPath();
      ctx.arc(12.5, -18.3, 0.7, 0, 7);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Pálpebra superior verde (olhar focado/determinado)
      ctx.beginPath();
      ctx.arc(11, -17.5, 3.6, Math.PI, Math.PI * 1.85);
      ctx.closePath();
      ctx.fillStyle = '#4cb82c';
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,10,30,.85)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();

      // 8. Suporte Fixo da Torre (Turret Stanchion)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(-8, -23);
      ctx.lineTo(-7, -27);
      ctx.quadraticCurveTo(-3, -33, 1, -27);
      ctx.lineTo(2, -23);
      ctx.closePath();
      ctx.fillStyle = '#3ea022';
      ctx.fill();
      outline(ctx);
      // Rebites do suporte
      ctx.fillStyle = '#1e3814';
      ctx.beginPath(); ctx.arc(-5.5, -25, 0.7, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(-4, -28, 0.7, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(-1, -28, 0.7, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(0.5, -25, 0.7, 0, 7); ctx.fill();
      ctx.restore();

      // 9. Canhão Lançador com Broca (Torre Móvel - gira com angle)
      // Pivô: [-3, -27]
      ctx.save();
      ctx.translate(-3, -27);
      ctx.rotate(-angle * GB.DEG);

      // Círculo central do mancal da torre
      ctx.beginPath();
      ctx.arc(0, 0, 4.2, 0, 7);
      ctx.fillStyle = '#388e1e';
      ctx.fill();
      outline(ctx);
      ctx.beginPath();
      ctx.arc(0, 0, 2.2, 0, 7);
      ctx.fillStyle = '#285816';
      ctx.fill();

      // Motor traseiro com ranhuras de ventilação (x < 0)
      rr(ctx, -8.5, -4.5, 5, 9, 1.2);
      ctx.fillStyle = '#2d3748';
      ctx.fill();
      outline(ctx);
      ctx.fillStyle = '#1a202c';
      ctx.fillRect(-7.2, -4.5, 1, 9);
      ctx.fillRect(-5.5, -4.5, 1, 9);

      // Corpo principal verde do canhão (Cilindro robusto)
      rr(ctx, -3.5, -5.5, 10.5, 11, 2);
      ctx.fillStyle = '#4cb82c';
      ctx.fill();
      outline(ctx);
      // Tampa/abóbada superior
      rr(ctx, -1, -6.8, 6, 2, 0.8);
      ctx.fillStyle = '#388e1e';
      ctx.fill();
      outline(ctx);

      // Colar dianteiro verde do canhão
      rr(ctx, 7, -4.2, 3.5, 8.4, 1.5);
      ctx.fillStyle = '#388e1e';
      ctx.fill();
      outline(ctx);

      // Cano / Tubo de aço cilíndrico
      rr(ctx, 10, -2.8, 8, 5.6, 1);
      ctx.fillStyle = '#596573';
      ctx.fill();
      outline(ctx);

      // Base da broca (Colar de aço alargado)
      ctx.beginPath();
      ctx.moveTo(17.5, -4.8);
      ctx.lineTo(20, -4.8);
      ctx.lineTo(20, 4.8);
      ctx.lineTo(17.5, 4.8);
      ctx.closePath();
      ctx.fillStyle = '#8392a2';
      ctx.fill();
      outline(ctx);

      // BROCA CÔNICA ESPIRAL (Drill Bit espiral)
      // Cone geral que vai de x=20 (largura 9.6) até x=28 (ponta afiada)
      ctx.beginPath();
      ctx.moveTo(20, -4.8);
      ctx.lineTo(28, 0);
      ctx.lineTo(20, 4.8);
      ctx.closePath();
      ctx.fillStyle = '#b0bcc8';
      ctx.fill();
      outline(ctx);

      // Sulcos espirais da broca (Threaded Flutes)
      ctx.strokeStyle = '#3e4854';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      // Espiral 1
      ctx.moveTo(20.5, -4.5);
      ctx.quadraticCurveTo(22, 0, 21.5, 4.5);
      // Espiral 2
      ctx.moveTo(22.8, -3.6);
      ctx.quadraticCurveTo(24.2, 0, 23.8, 3.6);
      // Espiral 3
      ctx.moveTo(25, -2.4);
      ctx.quadraticCurveTo(26.2, 0, 25.8, 2.4);
      ctx.stroke();

      // Brilho na ponta de perfuração
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(27.5, -0.3, 0.7, 0, 7);
      ctx.fill();

      ctx.restore();
    },

    kuda(ctx, angle, team) {
      // 1. Patas Traseiras/Distantes (3 cones periwinkle com listra branca, sombreados)
      const backLegXs = [-12, -1, 10];
      for (const lx of backLegXs) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(lx - 4, -9);
        ctx.lineTo(lx + 4, -9);
        ctx.lineTo(lx, 0);
        ctx.closePath();
        ctx.fillStyle = '#555ea4';
        ctx.fill();
        outline(ctx);

        // Faixa branca no meio da perna
        ctx.beginPath();
        ctx.moveTo(lx - 2.5, -5.5);
        ctx.lineTo(lx + 2.5, -5.5);
        ctx.lineTo(lx + 1.3, -3);
        ctx.lineTo(lx - 1.3, -3);
        ctx.closePath();
        ctx.fillStyle = '#d5dbfc';
        ctx.fill();
        ctx.restore();
      }

      // 2. Lançador Traseiro / Bumbum Articulado (Eleva com o ângulo de mira para trás, como Khan)
      // Pivot: [-8, -14]. Ângulo roda para trás (Math.PI + angle * GB.DEG)
      ctx.save();
      ctx.translate(-8, -14);
      ctx.rotate(Math.PI + angle * GB.DEG);

      // Bloco do cano / colar traseiro
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(12, -7);
      ctx.lineTo(15, -4);
      ctx.lineTo(15, 4);
      ctx.lineTo(12, 7);
      ctx.lineTo(0, 7);
      ctx.closePath();
      const tailGrad = ctx.createLinearGradient(0, -7, 0, 7);
      tailGrad.addColorStop(0, '#8892e6');
      tailGrad.addColorStop(0.5, '#6872c4');
      tailGrad.addColorStop(1, '#4f579e');
      ctx.fillStyle = tailGrad;
      ctx.fill();
      outline(ctx);

      // Faixa branca decorativa do colar
      ctx.beginPath();
      ctx.moveTo(4, -6.5);
      ctx.lineTo(8, -6.5);
      ctx.lineTo(8, 6.5);
      ctx.lineTo(4, 6.5);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Bocal de disparo interno
      ctx.beginPath();
      ctx.ellipse(14.5, 0, 2, 4.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#111118';
      ctx.fill();

      // DUAS PINÇAS / CHIFRES DE BESOURO DOURADOS (Lançadores icônicos da Aduka/Kuda)
      // Chifre Superior (curva para cima e para trás)
      ctx.beginPath();
      ctx.moveTo(9, -6.5);
      ctx.lineTo(17, -9);
      ctx.lineTo(24, -14);
      ctx.lineTo(21, -6);
      ctx.lineTo(13, -3.5);
      ctx.closePath();
      ctx.fillStyle = '#fce778';
      ctx.fill();
      outline(ctx);

      // Sombra inferior do chifre superior
      ctx.beginPath();
      ctx.moveTo(13, -3.5);
      ctx.lineTo(21, -6);
      ctx.lineTo(18, -6.8);
      ctx.closePath();
      ctx.fillStyle = '#d8c246';
      ctx.fill();

      // Chifre Inferior (curva para baixo e para trás)
      ctx.beginPath();
      ctx.moveTo(9, 6.5);
      ctx.lineTo(17, 9);
      ctx.lineTo(24, 14);
      ctx.lineTo(21, 6);
      ctx.lineTo(13, 3.5);
      ctx.closePath();
      ctx.fillStyle = '#fce778';
      ctx.fill();
      outline(ctx);

      // Sombra do chifre inferior
      ctx.beginPath();
      ctx.moveTo(13, 3.5);
      ctx.lineTo(21, 6);
      ctx.lineTo(18, 6.8);
      ctx.closePath();
      ctx.fillStyle = '#d8c246';
      ctx.fill();

      ctx.restore();

      // 3. Carapaça Central / Segmentos Arqueados de Centopeia (3 gomos)
      // Gomo 1 (Traseiro): x de -15 a -4
      ctx.beginPath();
      ctx.arc(-9, -12, 7.5, Math.PI * 0.85, Math.PI * 2.15);
      ctx.lineTo(-4, -9);
      ctx.lineTo(-14, -9);
      ctx.closePath();
      ctx.fillStyle = '#7882db';
      ctx.fill();
      outline(ctx);

      // Gomo 2 (Central): x de -6 a 7
      ctx.beginPath();
      ctx.arc(1, -13, 8.5, Math.PI * 0.85, Math.PI * 2.15);
      ctx.lineTo(7, -9);
      ctx.lineTo(-5, -9);
      ctx.closePath();
      const midGrad = ctx.createLinearGradient(0, -22, 0, -9);
      midGrad.addColorStop(0, '#9ca5f2');
      midGrad.addColorStop(1, '#6670bd');
      ctx.fillStyle = midGrad;
      ctx.fill();
      outline(ctx);

      // Borda inferior azul real de proteção do chassi
      ctx.beginPath();
      ctx.moveTo(-14, -9);
      ctx.quadraticCurveTo(0, -7, 14, -9);
      ctx.lineTo(14, -7);
      ctx.quadraticCurveTo(0, -5, -14, -7);
      ctx.closePath();
      ctx.fillStyle = '#295cd6';
      ctx.fill();
      outline(ctx);

      // Faixa / Crista branca arqueada no topo dos gomos
      ctx.beginPath();
      ctx.moveTo(-11, -15);
      ctx.quadraticCurveTo(-9, -19, -6, -16);
      ctx.quadraticCurveTo(1, -21, 6, -16);
      ctx.quadraticCurveTo(9, -15, 11, -12);
      ctx.lineTo(9, -11);
      ctx.quadraticCurveTo(7, -13.5, 4, -14.5);
      ctx.quadraticCurveTo(0, -18.5, -5, -14);
      ctx.quadraticCurveTo(-8, -17, -10, -13.5);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Detalhe de Cor do Time no centro
      ctx.fillStyle = team;
      ctx.fillRect(-3, -11, 8, 2.5);

      // 4. Patas Dianteiras / Próximas (3 cones com anel branco no centro)
      const frontLegXs = [-10, 2, 14];
      for (const lx of frontLegXs) {
        ctx.save();
        // Cone principal
        ctx.beginPath();
        ctx.moveTo(lx - 5, -9);
        ctx.lineTo(lx + 5, -9);
        ctx.lineTo(lx, 0);
        ctx.closePath();
        const legGrad = ctx.createLinearGradient(lx - 5, -9, lx + 5, 0);
        legGrad.addColorStop(0, '#929cf0');
        legGrad.addColorStop(0.6, '#727cd6');
        legGrad.addColorStop(1, '#535cb0');
        ctx.fillStyle = legGrad;
        ctx.fill();
        outline(ctx);

        // Faixa branca horizontal no centro da perna
        ctx.beginPath();
        ctx.moveTo(lx - 3.2, -5.5);
        ctx.lineTo(lx + 3.2, -5.5);
        ctx.lineTo(lx + 1.8, -2.8);
        ctx.lineTo(lx - 1.8, -2.8);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        outline(ctx);
        ctx.restore();
      }

      // 5. Cabeça Frontal (Globo periwinkle + face branca + olhão preto + periscópio)
      ctx.save();
      ctx.translate(16, -14);

      // Cabeça redonda
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = '#7882db';
      ctx.fill();
      outline(ctx);

      // Face inferior branca (máscara)
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      outline(ctx);

      // Olho preto expressivo
      ctx.beginPath();
      ctx.arc(-2, 0, 4.2, 0, Math.PI * 2);
      ctx.fillStyle = '#111116';
      ctx.fill();
      // Brilho no olho
      ctx.beginPath();
      ctx.arc(-2.8, -1.2, 1.3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Antena / Mini periscópio vermelho no topo da cabeça
      ctx.beginPath();
      ctx.moveTo(-1, -7);
      ctx.lineTo(-1, -11);
      ctx.lineTo(-6, -11);
      ctx.lineTo(-6, -14);
      ctx.lineTo(1, -14);
      ctx.lineTo(1, -7);
      ctx.closePath();
      ctx.fillStyle = '#e8edf5';
      ctx.fill();
      outline(ctx);

      // Bico / Ponta vermelha da antena
      ctx.beginPath();
      ctx.rect(-6, -14, 2.5, 3);
      ctx.fillStyle = '#ff4034';
      ctx.fill();
      outline(ctx);

      ctx.restore();
    },
  };

  function barrel(ctx, px, py, angle, len, thick, c1, c2) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-angle * GB.DEG);
    rr(ctx, 0, -thick / 2, len, thick, thick / 2.5);
    const g = ctx.createLinearGradient(0, -thick / 2, 0, thick / 2);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.fill(); outline(ctx);
    ctx.restore();
  }

  draw.nak = draw.khan;
  draw.yeti = draw.bigfoot;
  draw.worm = draw.grub;
  draw.mortar = draw.armor;
  GB.drawMobile = function (ctx, id, angle, team, wheelRot) {
    const fn = draw[id] || (id === 'nak' ? draw.khan : null) || draw.armor;
    const rot = wheelRot != null ? wheelRot : (ctx._wheelRot != null ? ctx._wheelRot : 0);
    if (fn) fn(ctx, angle, team || '#fff', rot);
  };

  // ----------------------------------------------------------------
  // Sistema de Avatares (A, B, C, D) montados nos Mobiles
  // ----------------------------------------------------------------
  GB.AVATARS = {
    a: { id: 'a', name: 'Avatar A', desc: 'Concede 1 escudo a um aliado ou a si mesmo, anulando 100% do dano de 1 ataque. (Delay +200)', skillName: 'Escudo Protetor', skillDesc: 'Concede 1 escudo a um aliado ou a si mesmo (bloqueia 100% de 1 ataque).', skillDelay: 200, skillIcon: '🛡️', src: 'img/avatars/avatar_a.png' },
    b: { id: 'b', name: 'Avatar B', desc: 'Altera o vento imediatamente para a direção e intensidade escolhidas, fixando-o por 4 turnos. (Delay +50)', skillName: 'Controle do Vento', skillDesc: 'Muda o vento imediatamente e o trava pelos próximos 4 turnos.', skillDelay: 50, skillIcon: '🌬️', src: 'img/avatars/avatar_b.png' },
    c: { id: 'c', name: 'Avatar C', desc: 'Consome 30% do HP máximo (mínimo 1 HP) para conceder +50% de dano no próximo disparo. (Delay +300)', skillName: 'Overcharge', skillDesc: 'Consome 30% do HP máx (mínimo 1 HP). Próximo disparo causa +50% de dano.', skillDelay: 300, skillIcon: '🔥', src: 'img/avatars/avatar_c.png' },
    d: { id: 'd', name: 'Avatar D', desc: 'Troca de posição instantaneamente com qualquer outro jogador vivo em campo. (Delay +400)', skillName: 'Troca de Posição', skillDesc: 'Troca de posição com qualquer outro jogador vivo.', skillDelay: 400, skillIcon: '🌀', src: 'img/avatars/avatar_d.png' }
  };

  // Âncoras do assento/guidão do piloto para cada veículo:
  // x: posição horizontal do assento, y: altura do assento, scale: proporção do avatar
  GB.AVATAR_ANCHORS = {
    armor:    { x: -16, y: -12, scale: 0.123 },
    bigfoot:  { x: -14, y: -14, scale: 0.123 },
    grub:     { x: -7,  y: -16, scale: 0.120 },
    dj:       { x: -17, y: -9,  scale: 0.123 },
    launcher: { x: -18, y: -12, scale: 0.120 },
    khan:     { x: -1,  y: -15, scale: 0.120 },
    doc:      { x: -9,  y: -17, scale: 0.120 },
    frigo:    { x: -13, y: -15, scale: 0.120 },
    driller:  { x: -7,  y: -15, scale: 0.120 },
    kuda:     { x: -3,  y: -15, scale: 0.120 }
  };
  GB.AVATAR_ANCHORS.nak = GB.AVATAR_ANCHORS.khan;
  GB.AVATAR_ANCHORS.yeti = GB.AVATAR_ANCHORS.bigfoot;
  GB.AVATAR_ANCHORS.worm = GB.AVATAR_ANCHORS.grub;
  GB.AVATAR_ANCHORS.mortar = GB.AVATAR_ANCHORS.armor;

  // Pré-carregamento dos sprites dos avatares
  GB.avatarImages = {};
  GB.avatarLoaded = false;
  let avatarsLoadedCount = 0;
  const totalAvatarKeys = Object.keys(GB.AVATARS);
  totalAvatarKeys.forEach(id => {
    const img = new Image();
    img.onload = () => {
      avatarsLoadedCount++;
      if (avatarsLoadedCount === totalAvatarKeys.length) {
        GB.avatarLoaded = true;
        if (typeof GB.onAvatarsLoaded === 'function') GB.onAvatarsLoaded();
      }
    };
    img.src = GB.AVATARS[id].src;
    GB.avatarImages[id] = img;
  });

  // Renderiza o avatar montado atrás do veículo
  GB.drawAvatar = function (ctx, avatarId, mobileId, customScale, opts) {
    const aid = avatarId || 'a';
    const img = GB.avatarImages && GB.avatarImages[aid];
    if (!img || !img.complete || !img.naturalWidth) return;

    const anch = (GB.AVATAR_ANCHORS && (GB.AVATAR_ANCHORS[mobileId] || (mobileId === 'nak' ? GB.AVATAR_ANCHORS.khan : null))) || { x: -4, y: -15, scale: 0.120 };
    const s = customScale || anch.scale || 0.120;

    ctx.save();
    ctx.translate(anch.x, anch.y);
    if (anch.rot) ctx.rotate(anch.rot);

    // Ponto de contato do assento/quadril na sprite original (259x360): x ≈ 115, y ≈ 340
    const ox = 115 * s;
    const oy = 340 * s;
    const dw = img.naturalWidth * s;
    const dh = img.naturalHeight * s;

    ctx.drawImage(img, -ox, -oy, dw, dh);

    // Coroa Real Dourada do Full Team Wipe
    if (opts && opts.hasCrown) {
      ctx.save();
      const crownX = (135 * s) - ox;
      const crownY = (75 * s) - oy - 10;
      const cw = 44 * s;
      const ch = 24 * s;

      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(crownX - cw / 2, crownY + ch / 2);
      ctx.lineTo(crownX + cw / 2, crownY + ch / 2);
      ctx.lineTo(crownX + cw * 0.45, crownY - ch / 2);
      ctx.lineTo(crownX + cw * 0.2, crownY - ch * 0.1);
      ctx.lineTo(crownX, crownY - ch / 2);
      ctx.lineTo(crownX - cw * 0.2, crownY - ch * 0.1);
      ctx.lineTo(crownX - cw * 0.45, crownY - ch / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gemas vermelhas brilhantes
      ctx.fillStyle = '#ff2244';
      ctx.beginPath(); ctx.arc(crownX, crownY - ch / 2, 2.5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(crownX - cw * 0.45, crownY - ch / 2, 2.5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(crownX + cw * 0.45, crownY - ch / 2, 2.5 * s, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  };

  // Prévia para os cartões de seleção
  GB.drawMobilePreview = function (canvas, id, avatarId) {
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || 160, h = canvas.clientHeight || 80;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const g = ctx.createRadialGradient(w / 2, h * 0.8, 4, w / 2, h * 0.8, w / 1.6);
    g.addColorStop(0, 'rgba(255,170,80,.35)'); g.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(w / 2, h * 0.88, 30, 5, 0, 0, 7); ctx.fill();
    const s = Math.min(h / 48, w / 60);
    ctx.translate(w / 2, h * 0.88);
    ctx.scale(s, s);
    if (avatarId && GB.drawAvatar) {
      GB.drawAvatar(ctx, avatarId, id);
    }
    const previewAngle = (id === 'khan' || id === 'kuda') ? 0 : 35;
    const previewRot = ((Date.now() * 0.003) % (Math.PI * 2));
    GB.drawMobile(ctx, id, previewAngle, '#ffd27a', previewRot);
  };

  // ----------------------------------------------------------------
  // Desenho do Satélite THOR (Imagem 2 de referência)
  // ----------------------------------------------------------------
  GB.drawThor = function (ctx, thor, time) {
    if (!thor || thor.active === false) return;
    const t = time || 0;
    const lvl = thor.level || 1;
    const isFlashing = (thor.flashTimer || 0) > 0;

    const tx = (thor.x != null) ? thor.x : 0;
    const ty = (thor.y != null) ? thor.y : 0;
    const bobY = Math.sin(t * 2.5) * 5;

    ctx.save();
    ctx.translate(tx, ty + bobY);

    ctx.save();

    // 0. Aura de energia ao redor do Thor (cresce com o nível)
    const auraR = 26 + lvl * 2.5 + (isFlashing ? 12 : Math.sin(t * 3) * 2);
    const auraGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, auraR);
    if (isFlashing) {
      auraGrad.addColorStop(0, 'rgba(255, 255, 220, 0.9)');
      auraGrad.addColorStop(0.5, 'rgba(255, 50, 150, 0.6)');
      auraGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
    } else {
      auraGrad.addColorStop(0, 'rgba(255, 60, 120, 0.35)');
      auraGrad.addColorStop(0.6, `rgba(60, 120, 255, ${0.15 + lvl * 0.04})`);
      auraGrad.addColorStop(1, 'rgba(60, 120, 255, 0)');
    }
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fill();

    // 1. Pilares verticais (Superior e Inferior) com escudos arqueados amarelos
    for (const sign of [-1, 1]) {
      ctx.save();
      ctx.scale(1, sign);

      // Haste vertical
      ctx.beginPath();
      ctx.moveTo(-2.5, 14);
      ctx.lineTo(-2.5, 32);
      ctx.lineTo(2.5, 32);
      ctx.lineTo(2.5, 14);
      ctx.closePath();
      ctx.fillStyle = '#4052bf';
      ctx.fill();
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = '#182054';
      ctx.stroke();

      // Conector esférico
      ctx.beginPath();
      ctx.arc(0, 18, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#6577de';
      ctx.fill();
      ctx.stroke();

      // Escudo arqueado
      ctx.beginPath();
      ctx.arc(0, 22, 16, Math.PI * 0.32, Math.PI * 0.68);
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#3242a3';
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#182054';
      ctx.stroke();

      // Pontas amarelas nos extremos do arco
      for (const arcSign of [-1, 1]) {
        const ang = Math.PI * 0.5 + arcSign * 0.28;
        const ax = Math.cos(ang) * 16;
        const ay = Math.sin(ang) * 16 + 22;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(ax, ay, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // 2. Antenas telescópicas na esquerda (3 agulhas diagonais)
    const antAngles = [-0.65, -0.35, -0.05, 0.25];
    for (let k = 0; k < antAngles.length; k++) {
      const a = antAngles[k];
      const len = 34 - k * 3;
      ctx.save();
      ctx.rotate(Math.PI + a);
      ctx.beginPath();
      ctx.moveTo(14, -1.8);
      ctx.lineTo(14 + len, -0.5);
      ctx.lineTo(14 + len, 0.5);
      ctx.lineTo(14, 1.8);
      ctx.closePath();
      ctx.fillStyle = '#e8ecf5';
      ctx.fill();
      ctx.strokeStyle = '#222855';
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // Anéis azuis e LEDs pulsantes nos segmentos das antenas
      const blink = Math.sin(t * 8 + k * 1.8) > 0;
      ctx.fillStyle = blink ? '#00e5ff' : '#394bb5';
      ctx.fillRect(20, -1.5, 3, 3);
      ctx.fillRect(28, -1.2, 2.5, 2.4);

      // Luz brilhante na ponta da agulha
      ctx.fillStyle = blink ? '#ffffff' : '#00b4d8';
      ctx.beginPath();
      ctx.arc(14 + len, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Bocais de propulsão / sensores na direita
    ctx.save();

    // Chamas iônicas sutis dos propulsores de órbita
    const jetLen = 5 + Math.sin(t * 16) * 3;
    const jetGrad = ctx.createLinearGradient(26, 0, 26 + jetLen, 0);
    jetGrad.addColorStop(0, '#ffffff');
    jetGrad.addColorStop(0.3, '#00e5ff');
    jetGrad.addColorStop(1, 'rgba(0, 120, 255, 0)');
    ctx.fillStyle = jetGrad;
    ctx.beginPath();
    ctx.moveTo(26, -3.5);
    ctx.lineTo(26 + jetLen, 0);
    ctx.lineTo(26, 3.5);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(15, -6);
    ctx.lineTo(26, -4);
    ctx.lineTo(26, 4);
    ctx.lineTo(15, 6);
    ctx.closePath();
    ctx.fillStyle = '#ccd4e8';
    ctx.fill();
    ctx.strokeStyle = '#182054';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Sensores pontiagudos diagonais da direita
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(14, d * 11);
      ctx.lineTo(24, d * 16);
      ctx.lineTo(21, d * 18);
      ctx.lineTo(12, d * 13);
      ctx.closePath();
      ctx.fillStyle = '#e0e5f2';
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // 4. Anel Circular Principal do Satélite
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    const ringGrad = ctx.createLinearGradient(-18, -18, 18, 18);
    ringGrad.addColorStop(0, '#5365d6');
    ringGrad.addColorStop(0.5, '#3b4cb5');
    ringGrad.addColorStop(1, '#202c7a');
    ctx.fillStyle = ringGrad;
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = '#141c4a';
    ctx.stroke();

    // Braçadeiras amarelas de aviso no anel externo
    for (const rAng of [-Math.PI * 0.4, Math.PI * 0.4, Math.PI * 0.8, -Math.PI * 0.8]) {
      ctx.save();
      ctx.rotate(rAng);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(15, -2, 3.5, 4);
      ctx.restore();
    }

    // 5. Disco Reator Vermelho Central
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 13);
    coreGrad.addColorStop(0, isFlashing ? '#fff2b3' : '#ff4d5a');
    coreGrad.addColorStop(0.7, '#d62839');
    coreGrad.addColorStop(1, '#780e1a');
    ctx.fillStyle = coreGrad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#182054';
    ctx.stroke();

    // 8 Raios metálicos da gaiola (Wheel-spokes giratórios)
    ctx.strokeStyle = isFlashing ? '#80d4ff' : '#4355c7';
    ctx.lineWidth = 2.0;
    const rotSpeed = isFlashing ? 12 : 1.2;
    const spokeOffset = t * rotSpeed;
    for (let s = 0; s < 8; s++) {
      const spAng = s * Math.PI / 4 + spokeOffset;
      ctx.beginPath();
      ctx.moveTo(Math.cos(spAng) * 4, Math.sin(spAng) * 4);
      ctx.lineTo(Math.cos(spAng) * 13, Math.sin(spAng) * 13);
      ctx.stroke();
    }

    // 6. Esfera de Energia Central (Magenta / Violeta / Flash pulsante)
    const corePulse = isFlashing ? (1.3 + Math.sin(t * 26) * 0.25) : (1 + Math.sin(t * 4.5) * 0.15);
    const rCore = 5 * corePulse;
    ctx.beginPath();
    ctx.arc(0, 0, rCore, 0, Math.PI * 2);
    const sphereGrad = ctx.createRadialGradient(-1, -1, 0, 0, 0, rCore);
    if (isFlashing) {
      sphereGrad.addColorStop(0, '#ffffff');
      sphereGrad.addColorStop(0.6, '#ffe066');
      sphereGrad.addColorStop(1, '#ff3366');
    } else {
      sphereGrad.addColorStop(0, '#ffffff');
      sphereGrad.addColorStop(0.4, '#f74fa3');
      sphereGrad.addColorStop(1, '#9d174d');
    }
    ctx.fillStyle = sphereGrad;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.restore();

    // 7. HUD do Thor: Nível e Barra de Progresso
    ctx.save();
    ctx.translate(0, 36);

    // Fundo do badge
    ctx.fillStyle = 'rgba(15, 18, 36, 0.85)';
    GB.roundRect(ctx, -38, -10, 76, 20, 5);
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = isFlashing ? '#ffd700' : '#4a5fc7';
    ctx.stroke();

    // Texto do Nível
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`THOR LV. ${lvl}`, 0, -1);

    // Barra de EXP miniatura embaixo do badge
    const needed = (GB.THOR && GB.THOR.EXP_NEEDED) ? GB.THOR.EXP_NEEDED[lvl] : 150;
    const cur = thor.dmgThisLevel || 0;
    const pct = lvl >= 6 ? 1 : Math.min(1, cur / needed);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(-32, 6, 64, 4);
    ctx.fillStyle = lvl >= 6 ? '#ffd700' : (pct >= 0.8 ? '#38ef7d' : '#00d2ff');
    ctx.fillRect(-32, 6, 64 * pct, 4);

    ctx.restore();
    ctx.restore();
  };
})(window.GB);
