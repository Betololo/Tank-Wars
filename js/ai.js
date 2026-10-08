/* CPU: simula disparos (com vento e terreno) e escolhe ângulo/força, com erro proposital por dificuldade. */
(function (GB) {
  'use strict';

  const ERR = [
    { power: 7, angle: 3, ssChance: 0.5 },   // Fácil
    { power: 3.2, angle: 1, ssChance: 0.8 }, // Médio
    { power: 1.1, angle: 0, ssChance: 1 },   // Difícil
  ];

  // Simula um tiro "pontual" e devolve o ponto de impacto.
  function simulate(game, tank, angle, power, target) {
    const t = game.terrain;
    const ai = tank.aimInfo(angle);
    let x = ai.mx, y = ai.my;
    const v = power * GB.POWER_SCALE;
    let vx = ai.dx * v, vy = ai.dy * v;
    const ax = game.wind * GB.WIND_ACCEL * tank.mobile.windInfl;
    const dt = 1 / 60;
    const tc = target.center();
    for (let i = 0; i < 600; i++) {
      const sp = Math.hypot(vx, vy);
      const n = Math.max(1, Math.ceil((sp * dt) / 3));
      const h = dt / n;
      for (let k = 0; k < n; k++) {
        vx += ax * h; vy += GB.GRAVITY * h;
        x += vx * h; y += vy * h;
        if (x < -80 || x > GB.WORLD_W + 80 || y > GB.WORLD_H + 60) return { x, y, out: true };
        if (GB.dist(x, y, tc.x, tc.y) < target.mobile.hitR) return { x, y, direct: true };
        if (i > 2 && t.isSolid(x, y)) return { x, y };
      }
    }
    return { x, y, out: true };
  }

  function score(game, tank, target, hit) {
    const tc = target.center();
    if (hit.out) return 1e6;
    let s = GB.dist(hit.x, hit.y, tc.x, tc.y);
    const me = tank.center();
    if (GB.dist(hit.x, hit.y, me.x, me.y) < 70) s += 600; // não se acertar
    return s;
  }

  GB.AI = {
    plan(game, tank, target, difficulty) {
      if (tank.mobile.shootsBackwards) {
        tank.facing = target.x >= tank.x ? -1 : 1;
      } else {
        tank.facing = target.x >= tank.x ? 1 : -1;
      }
      const minA = tank.effectiveMinAngle;
      const maxA = tank.effectiveMaxAngle;
      let best = { s: Infinity, a: (minA + maxA) / 2, p: 60 };
      const stepA = Math.max(1, Math.round((maxA - minA) / 18));
      for (let a = minA; a <= maxA; a += stepA) {
        for (let p = 18; p <= 100; p += 2) {
          const s = score(game, tank, target, simulate(game, tank, a, p, target));
          if (s < best.s) best = { s, a, p };
        }
      }
      // refinamento
      const b0 = { ...best };
      for (let a = b0.a - 3; a <= b0.a + 3; a += 1) {
        for (let p = b0.p - 2; p <= b0.p + 2; p += 0.5) {
          if (a < minA || a > maxA || p < 5 || p > 100) continue;
          const s = score(game, tank, target, simulate(game, tank, a, p, target));
          if (s < best.s) best = { s, a, p };
        }
      }
      const e = ERR[difficulty] || ERR[1];
      const angle = GB.clamp(Math.round(best.a + GB.rand(-e.angle, e.angle)), minA, maxA);
      const power = GB.clamp(best.p + GB.rand(-e.power, e.power), 5, 100);
      let shot = Math.random() < 0.55 ? 1 : 0;
      if (tank.ss >= 100 && Math.random() < e.ssChance) shot = 2;
      if (tank.mobile.id === 'doc') shot = 0; // Doc usa Tiro 1 contra inimigos
      return { angle, power, shot, quality: best.s };
    },

    // Decide se vale andar um pouco antes de atirar (ex.: tiro bloqueado).
    moveDecision(game, tank, target) {
      const quick = this.plan(game, tank, target, 2);
      if (quick.quality < 60 && Math.random() < 0.7) return 0;
      const towardCenter = tank.x < GB.WORLD_W / 2 ? 1 : -1;
      return Math.random() < 0.7 ? towardCenter : -towardCenter;
    },
  };
})(window.GB);
