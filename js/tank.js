/* Tanque/mobile em jogo: física de queda, movimento seguindo o relevo, inclinação e mira. */
(function (GB) {
  'use strict';

  const FEET = [-7, -3, 0, 3, 7];

  class Tank {
    constructor(opts) {
      this.mobile = (opts && GB.MOBILES[opts.mobileId]) || GB.MOBILES.armor;
      this.mobileId = opts.mobileId || 'armor';
      this.avatarId = (opts && opts.avatarId) || 'a';
      this.team = opts.team;
      this.name = opts.name;
      this.color = opts.color;
      this.terrain = opts.terrain;
      this.x = opts.x;
      this.y = 0;
      this.vy = 0;
      this.facing = opts.facing || 1;
      this.angle = this.mobile.minAngle != null ? (this.mobile.minAngle + this.mobile.maxAngle) / 2 : 45;
      this.hp = this.mobile.hp;
      this.maxHp = this.mobile.hp;
      this.ssCooldown = 0;
      this.atkDebuff = 0;
      this.defBuff = 0;
      this.defDebuff = 0;
      this.blizzardStacks = 0;
      this.frozen = false;
      this.hasShield = false;
      this.shieldCharges = 0;
      this.overcharged = false;
      this.avatarSkillUsed = false;
      this.fuel = GB.MAX_FUEL;
      this.alive = true;
      this.tilt = 0;
      this.lastPower = -1;
      this.hurt = 0;
      this.moving = false;
      this.falling = false;
      this.dispHp = this.hp;
      const sy = this.terrain.surfaceBelow(this.x, 0);
      this.y = sy < 0 ? 0 : sy;
      this.targetX = this.x;
      this.targetY = this.y;
      this.targetAngle = this.angle;
      this.updateTilt(true);
    }

    supported() {
      const t = this.terrain;
      let supportPoints = 0;
      let centerSupported = false;
      for (const dx of FEET) {
         if (t.isSolid(this.x + dx, this.y) || t.isSolid(this.x + dx, this.y + 1) || t.isSolid(this.x + dx, this.y + 2)) {
            // É chão e não parede vertical contínua
            if (!t.isSolid(this.x + dx, this.y - 4)) {
               supportPoints++;
               if (Math.abs(dx) <= 3) centerSupported = true;
            }
         }
      }
      // Se não há suporte sob o centro e restou menos de 2 pontos de apoio na ponta, o tanque não se sustenta e cai
      if (!centerSupported && supportPoints < 2) return false;
      return supportPoints > 0;
    }

    groundNear(x) {
      const t = this.terrain;
      for (let yy = this.y - 14; yy < this.y + 22; yy++) if (t.isSolid(x, yy)) return yy;
      return this.y;
    }

    updateTilt(instant) {
      const hl = this.groundNear(this.x - 10), hr = this.groundNear(this.x + 10);
      const target = GB.clamp(Math.atan2(hr - hl, 20), -0.75, 0.75);
      this.tilt = instant ? target : GB.lerp(this.tilt, target, 0.25);
    }

    // Retorna true enquanto estiver caindo.
    updatePhysics(dt) {
      if (!this.alive) return false;
      this.hurt = Math.max(0, this.hurt - dt);
      this.dispHp = GB.lerp(this.dispHp, this.hp, Math.min(1, dt * 6));
      // Se o chão sumiu por baixo da posição atual, ajusta para baixo
      if (!this.supported()) {
        this.falling = true;
        this.targetY = this.y; // Alinha targetY para impedir updateRemote de lutar contra a gravidade
        this.vy = Math.min(this.vy + GB.GRAVITY * 1.4 * dt, 900);
        let dy = this.vy * dt;
        while (dy > 0) {
          this.y += 1; dy -= 1;
          if (this.supported()) { this.vy = 0; break; }
          if (this.y > GB.WORLD_H + 60) break;
        }
      } else {
        // empurra para fora se ficou "enterrado"
        let guard = 0;
        while (this.terrain.isSolid(this.x, this.y - 1) && guard++ < 6) this.y -= 1;
        if (this.falling) { this.falling = false; this.vy = 0; }
      }
      if (this.y > GB.WORLD_H + 40) {
        this.alive = false;
        this.hp = 0;
        this.fellOff = true;
      }
      this.updateTilt(false);
      return this.falling;
    }

    // Interpolação suave a 60 FPS para movimentos e rotação de mira de jogadores remotos
    updateRemote(dt) {
      if (!this.alive) return;
      if (this.targetX !== undefined) {
        const dx = this.targetX - this.x;
        if (Math.abs(dx) > 140) {
          this.x = this.targetX;
        } else if (Math.abs(dx) > 0.05) {
          this.x += dx * Math.min(1, dt * 20);
        } else {
          this.x = this.targetX;
        }
      }
      if (this.targetY !== undefined) {
        const dy = this.targetY - this.y;
        if (this.falling || !this.supported()) {
          // Se o tanque está em queda ou sem chão de sustentação, não puxa o Y para cima
          if (dy < 0) {
            this.targetY = this.y;
          } else {
            this.y += dy * Math.min(1, dt * 20);
          }
        } else {
          if (Math.abs(dy) > 140) {
            this.y = this.targetY;
          } else if (Math.abs(dy) > 0.05) {
            this.y += dy * Math.min(1, dt * 20);
          } else {
            this.y = this.targetY;
          }
        }
      }
      if (this.targetAngle !== undefined) {
        const da = this.targetAngle - this.angle;
        if (Math.abs(da) > 90) {
          this.angle = this.targetAngle;
        } else if (Math.abs(da) > 0.05) {
          this.angle += da * Math.min(1, dt * 22);
        } else {
          this.angle = this.targetAngle;
        }
      }
      this.updateTilt(false);
    }

    // Movimento horizontal seguindo o relevo; retorna px andados.
    move(dir, dt) {
      if (!this.alive || this.falling || this.fuel <= 0 || this.frozen) return 0;
      this.facing = dir;
      const t = this.terrain;
      const climb = Math.ceil(this.mobile.maxClimb);
      const blizzardSlow = Math.max(0, 1 - (this.blizzardStacks || 0) * 0.05);
      let steps = this.mobile.speed * (this.speedMult || 1) * blizzardSlow * dt + (this._carry || 0);
      let moved = 0;
      while (steps >= 1 && this.fuel > 0) {
        steps -= 1;
        const nx = this.x + dir;
        const top = this.y - climb;
        if (t.isSolid(nx, top) || t.isSolid(nx, top - 10)) { steps = 0; break; } // parede íngreme
        let ny = -1;
        for (let yy = top; yy <= this.y + 3; yy++) if (t.isSolid(nx, yy)) { ny = yy; break; }
        this.x = nx;
        if (ny >= 0) this.y = ny;
        this.fuel = Math.max(0, this.fuel - this.mobile.fuelPerPx);
        moved++;
        if (!this.supported()) break; // vai cair
      }
      this._carry = steps;
      return moved;
    }

    get effectiveMinAngle() {
      const base = this.mobile.minAngle != null ? this.mobile.minAngle : 0;
      const penalty = (this.blizzardStacks || 0) * 5;
      const baseMax = this.mobile.maxAngle != null ? this.mobile.maxAngle : 90;
      return Math.min(baseMax, base + penalty);
    }

    get effectiveMaxAngle() {
      const base = this.mobile.maxAngle != null ? this.mobile.maxAngle : 90;
      const penalty = (this.blizzardStacks || 0) * 5;
      const baseMin = this.mobile.minAngle != null ? this.mobile.minAngle : 0;
      return Math.max(baseMin, base - penalty);
    }

    get relativeAngle() {
      let slopeDeg = this.tilt * (180 / Math.PI);
      if (this.mobile.shootsBackwards) {
        return this.facing > 0 ? (this.angle - slopeDeg) : (this.angle + slopeDeg);
      }
      return this.facing > 0 ? (this.angle + slopeDeg) : (this.angle - slopeDeg);
    }

    // Ponto de giro do canhão e direção do disparo em coordenadas do mundo
    aimInfo(angleOverride) {
      const m = this.mobile;
      const a = (angleOverride != null ? angleOverride : this.angle) * GB.DEG;
      const c = Math.cos(this.tilt), s = Math.sin(this.tilt);
      const rot = (lx, ly) => [lx * c - ly * s, lx * s + ly * c];
      const [pxr, pyr] = rot(m.pivot[0] * this.facing, m.pivot[1]);
      
      const px = this.x + pxr, py = this.y + pyr;
      const fDir = m.shootsBackwards ? -this.facing : this.facing;
      const dx = Math.cos(a) * fDir;
      const dy = -Math.sin(a);
      
      return { px, py, dx, dy, mx: px + dx * m.barrel, my: py + dy * m.barrel };
    }

    center() {
      return { x: this.x - Math.sin(this.tilt) * -12, y: this.y - Math.cos(this.tilt) * 12 };
    }

    damage(amount) {
      if (!this.alive) return 0;
      if (amount < 0) {
        const prev = this.hp;
        this.hp = Math.min(this.maxHp, this.hp - Math.round(amount));
        return -(this.hp - prev);
      }
      // Escudo Protetor (Avatar A): Anula 100% de 1 ataque / fonte de dano
      if (this.hasShield) {
        this.hasShield = false;
        this.shieldCharges = 0;
        if (typeof this.onShieldBreak === 'function') {
          this.onShieldBreak();
        }
        return 0;
      }
      // DANO RECEBIDO REAL = DANO RECEBIDO * (1 - DEFESA DO PERSONAGEM)
      const def = (this.mobile && this.mobile.defense != null) ? this.mobile.defense : 0;
      const realAmount = amount * (1 - def);
      const d = Math.min(this.hp, Math.round(realAmount));
      this.hp -= d;
      this.hurt = 0.35;
      if (this.hp <= 0) { this.hp = 0; this.alive = false; }
      return d;
    }

    heal(amount) {
      if (!this.alive) return 0;
      const prev = this.hp;
      this.hp = Math.min(this.maxHp, this.hp + Math.max(0, Math.round(amount)));
      return this.hp - prev;
    }

    draw(ctx, opts) {
      if (!this.alive && !this.drawDead) return;
      const shake = this.hurt > 0 ? Math.sin(this.hurt * 80) * 2 : 0;

      // Aura de Overcharge (Avatar C): névoa e fogo carmesim
      if (this.overcharged) {
        ctx.save();
        const tSec = Date.now() * 0.004;
        const auraR = 30 + Math.sin(tSec * 4.5) * 4;
        const g = ctx.createRadialGradient(this.x, this.y - 12, 6, this.x, this.y - 12, auraR);
        g.addColorStop(0, 'rgba(255, 30, 30, 0.5)');
        g.addColorStop(0.65, 'rgba(255, 80, 0, 0.22)');
        g.addColorStop(1, 'rgba(180, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(this.x, this.y - 12, auraR, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < 3; i++) {
          const offX = Math.sin(tSec * 3 + i * 2.1) * 16;
          const offY = -12 - ((tSec * 28 + i * 14) % 28);
          ctx.beginPath();
          ctx.arc(this.x + offX, this.y + offY, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 50, 50, 0.35)';
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.save();
      ctx.translate(this.x + shake, this.y + 1);
      ctx.rotate(this.tilt);
      // sombra/brilho do time
      ctx.fillStyle = this.color + '55';
      ctx.beginPath(); ctx.ellipse(0, 0, 24, 4, 0, 0, 7); ctx.fill();
      ctx.scale(this.facing, 1);
      if (this.avatarId && GB.drawAvatar) {
        GB.drawAvatar(ctx, this.avatarId, this.mobileId);
      }
      GB.drawMobile(ctx, this.mobileId, this.relativeAngle, this.color);
      ctx.restore();

      // Cúpula protetora de Escudo (Avatar A): bolha ciano brilhante
      if (this.hasShield) {
        ctx.save();
        const pulse = Math.sin(Date.now() * 0.005) * 2;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y - 14, 28 + pulse, 24 + pulse, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(70, 205, 255, 0.22)';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(170, 245, 255, 0.9)';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(this.x - 9, this.y - 23, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();
        ctx.restore();
      }

      if (opts.showAim) this.drawAim(ctx);

      // Bloco de gelo se estiver congelado (5 stacks de blizzard)
      if (this.blizzardStacks >= 5 || this.frozen) {
        ctx.save();
        ctx.translate(this.x, this.y - 12);
        ctx.fillStyle = 'rgba(140, 220, 255, 0.45)';
        ctx.strokeStyle = 'rgba(210, 245, 255, 0.9)';
        ctx.lineWidth = 2.5;
        GB.roundRect(ctx, -26, -26, 52, 44, 8);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-18, -20); ctx.lineTo(-8, -6); ctx.lineTo(-14, 8);
        ctx.moveTo(12, -18); ctx.lineTo(16, -4); ctx.lineTo(6, 6);
        ctx.stroke();
        ctx.restore();
      }

      // etiqueta + barra de vida
      const ty = this.y - 54;
      ctx.save();
      ctx.font = '700 12px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,.7)';
      ctx.strokeText(this.name, this.x, ty - 6);
      ctx.fillStyle = this.color;
      ctx.fillText(this.name, this.x, ty - 6);
      const w = 44, h = 5;
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      GB.roundRect(ctx, this.x - w / 2 - 1, ty - 1, w + 2, h + 2, 3); ctx.fill();
      ctx.fillStyle = '#ff5050';
      ctx.fillRect(this.x - w / 2, ty, w * (this.dispHp / this.maxHp), h);
      ctx.fillStyle = this.hp / this.maxHp > 0.35 ? '#5cff8a' : '#ffcf4a';
      ctx.fillRect(this.x - w / 2, ty, w * (this.hp / this.maxHp), h);

      // Indicadores visuais de Buff/Debuff (Doc, Frigo e outros)
      if (this.defBuff > 0 || this.atkDebuff > 0 || this.defDebuff > 0 || this.blizzardStacks > 0) {
        ctx.font = '800 9px Outfit, sans-serif';
        let badges = [];
        if (this.defBuff > 0) badges.push({ text: `+${Math.round(this.defBuff * 100)}% DEF`, color: '#4cd3e6' });
        if (this.atkDebuff > 0) badges.push({ text: `-${Math.round(this.atkDebuff * 100)}% ATQ`, color: '#ff6b6b' });
        if (this.defDebuff > 0) badges.push({ text: `-${Math.round(this.defDebuff * 100)}% DEF`, color: '#ff7043' });
        if (this.blizzardStacks > 0) badges.push({ text: `❄ ${this.blizzardStacks}/5`, color: '#79b9e7' });
        const by = ty + 12;
        let totalW = 0;
        badges.forEach(b => { totalW += ctx.measureText(b.text).width + 6; });
        let curX = this.x - totalW / 2;
        badges.forEach(b => {
          const bw = ctx.measureText(b.text).width + 4;
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          GB.roundRect(ctx, curX, by - 8, bw, 10, 2);
          ctx.fill();
          ctx.fillStyle = b.color;
          ctx.fillText(b.text, curX + bw / 2, by);
          curX += bw + 2;
        });
      }
      ctx.restore();

      if (opts.active) {
        const bob = Math.sin(opts.time * 6) * 4;
        ctx.save();
        ctx.translate(this.x, ty - 26 + bob);
        ctx.fillStyle = '#ffe08a';
        ctx.strokeStyle = 'rgba(80,30,0,.8)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(8, -8); ctx.lineTo(0, 4); ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }

    // Arco de ângulo e linha de mira (só do jogador local da vez)
    drawAim(ctx) {
      const ai = this.aimInfo();
      const minAng = this.effectiveMinAngle;
      const maxAng = this.effectiveMaxAngle;
      const R = 58;
      ctx.save();
      ctx.lineWidth = 7;
      ctx.strokeStyle = 'rgba(255,255,255,.18)';
      ctx.beginPath();
      const steps = 18;
      for (let s = 0; s <= steps; s++) {
        const testAng = minAng + (maxAng - minAng) * (s / steps);
        const pt = this.aimInfo(testAng);
        const ax = ai.px + pt.dx * R;
        const ay = ai.py + pt.dy * R;
        if (s === 0) ctx.moveTo(ax, ay);
        else ctx.lineTo(ax, ay);
      }
      ctx.stroke();
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,240,180,.9)';
      ctx.beginPath();
      ctx.moveTo(ai.mx, ai.my);
      ctx.lineTo(ai.px + ai.dx * (R + 18), ai.py + ai.dy * (R + 18));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath(); ctx.arc(ai.px + ai.dx * R, ai.py + ai.dy * R, 4.5, 0, 7); ctx.fill();
      
      if (this.lastAngle !== undefined) {
         const lastAi = this.aimInfo(this.lastAngle);
         ctx.lineWidth = 1;
         ctx.strokeStyle = 'rgba(255,100,100,.6)';
         ctx.beginPath();
         ctx.moveTo(lastAi.mx, lastAi.my);
         ctx.lineTo(lastAi.px + lastAi.dx * (R + 18), lastAi.py + lastAi.dy * (R + 18));
         ctx.stroke();
      }
      
      ctx.restore();
    }
  }

  GB.Tank = Tank;
})(window.GB);
