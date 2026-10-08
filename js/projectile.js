/* Projéteis (física com gravidade + vento, colisão por pixel, perfuração do SS do Grub) e efeitos visuais. */
(function (GB) {
  'use strict';

  class Projectile {
    constructor(o) {
      this.owner = o.owner;          // Tank
      this.shot = o.shot;            // definição do tiro
      this.x = o.x; this.y = o.y;
      this.vx = o.vx; this.vy = o.vy;
      this.delay = o.delay || 0;
      this.windInfl = o.windInfl;
      this.age = 0;
      this.dead = false;
      this.trail = [];
      this.drillLeft = o.shot.drill || 0;
      this.drilling = false;
      this.drillDist = 0;
      this.launched = this.delay <= 0;
      this.bouncy = o.bouncy || false;
      this.hasBounced = false;
      this.bounceTimer = 0;
      this.isTeleport = o.isTeleport || false;
      this.isNuclear = !this.isTeleport && (o.isNuclear || false);
      this.isNapalm = !this.isTeleport && (o.isNapalm || false);
      this.isOnda = !this.isTeleport && (o.isOnda || false);
      this.isFrigoT1 = !this.isTeleport && !!o.shot.isFrigoT1;
      this.isFrigoT2 = !this.isTeleport && !!o.shot.isFrigoT2;
      this.isFrigoSS = !this.isTeleport && !!o.shot.isFrigoSS;
      if (this.isTeleport) {
        this.bouncy = false;
        this.drillLeft = 0;
      }
      this.isDrillerAirDrill = o.isDrillerAirDrill || false;
      this.isThorBeam = o.isThorBeam || (o.shot && o.shot.isThorBeam) || false;
      this.targetX = o.targetX;
      this.targetY = o.targetY;
      this.thorX = o.thorX;
      this.thorY = o.thorY;
      if (this.isDrillerAirDrill || this.isThorBeam) {
        this.windInfl = 0;
      }
      this.isKudaT2 = o.isKudaT2 || (o.shot && o.shot.isKudaT2) || false;
      this.isKudaSS = o.isKudaSS || (o.shot && o.shot.isKudaSS) || false;
      if (this.isKudaSS) {
        this.hitLivingEntities = new Set();
      }
      this.orbitAngle = 0;
      this.b1Trail = [];
      this.b2Trail = [];
      this.b1Alive = true;
      this.b2Alive = true;
      this.bCenterAlive = true;
    }

    // Avança a simulação; chama cb.explode(x, y, final) nas colisões.
    step(dt, wind, terrain, tanks, cb) {
      if (this.dead) return;
      if (!this.launched) {
        this.delay -= dt;
        if (this.delay > 0) return;
        this.launched = true;
        if (cb.launch) cb.launch(this);
      }
      this.age += dt;
      const ax = wind * GB.WIND_ACCEL * this.windInfl;
      const speed = Math.hypot(this.vx, this.vy);
      const n = Math.max(1, Math.ceil((speed * dt) / 2));
      const h = dt / n;
      for (let i = 0; i < n && !this.dead; i++) {
        let grav = GB.GRAVITY;
        if (this.isThorBeam) grav = 0; // Raio laser do Thor viaja reto direto ao alvo
        if (this.drilling) grav = GB.GRAVITY * 0.25;
        if (this.underground) grav = -2 * GB.GRAVITY; // Khan T2 aceleração vertical multiplicada por -2 embaixo da terra

        let currentAx = ax;
        if (this.underground) currentAx *= 1.5; // Vento fica 1.5x mais forte debaixo da terra para o efeito ser visível na medida certa

        this.vx += (this.drilling ? 0 : currentAx) * h;
        this.vy += grav * h;
        const ox = this.x, oy = this.y;
        this.x += this.vx * h;
        this.y += this.vy * h;

        // Interação com Pilar de Efeito Climático (Force, Black, Thunder, Tornado)
        const weather = cb.getWeather ? cb.getWeather() : null;
        if (weather && weather.type && !this.dead) {
          const wx = weather.x;
          const halfW = 12.5; // pilar com 25px de largura total
          if (Math.abs(this.x - wx) <= halfW) {
            if (weather.type === 'force' && !this.hasForce) {
              this.hasForce = true;
              this.damageMult = (this.damageMult || 1) * 1.5;
              if (cb.spawnWeatherFX) cb.spawnWeatherFX('force', this.x, this.y);
            } else if (weather.type === 'black' && !this.hasBlack) {
              this.hasBlack = true;
              this.damageMult = (this.damageMult || 1) * 0.5;
              if (cb.spawnWeatherFX) cb.spawnWeatherFX('black', this.x, this.y);
            } else if (weather.type === 'thunder' && !this.hasThunder) {
              this.hasThunder = true;
              if (cb.spawnWeatherFX) cb.spawnWeatherFX('thunder', this.x, this.y);
            } else if (weather.type === 'tornado' && (!this.tornadoCooldown || this.tornadoCooldown <= 0)) {
              this.tornadoCooldown = 0.6;
              this.inTornadoSwirl = 0.24;

              let isRising = false, isFalling = false;
              if (this.underground) {
                // Khan T2 subterrâneo: lógica vertical invertida
                isRising = this.vy > 5;
                isFalling = this.vy < -5;
              } else {
                isRising = this.vy < -5; // vy negativo = subindo
                isFalling = this.vy > 5;  // vy positivo = descendo
              }

              const deltaY = 32;
              if (isRising) {
                // Sai mais alto
                this.y += this.underground ? deltaY : -deltaY;
                const spd = Math.max(140, Math.abs(this.vy) * 1.15);
                this.vy = (this.underground ? 1 : -1) * spd;
              } else if (isFalling) {
                // Sai mais baixo
                this.y += this.underground ? -deltaY : deltaY;
                const spd = Math.max(140, Math.abs(this.vy) * 1.15);
                this.vy = (this.underground ? -1 : 1) * spd;
              }
              // Se for zero (horizontal), sai no mesmo rumo na mesma altura

              if (!this.underground && terrain.isSolid(this.x, this.y)) {
                let safeY = this.y;
                while (safeY > 0 && terrain.isSolid(this.x, safeY)) safeY--;
                this.y = safeY;
              }

              // Sai do outro lado do tornado de acordo com vx
              const dir = this.vx >= 0 ? 1 : -1;
              this.x = wx + dir * 14;

              if (cb.spawnWeatherFX) cb.spawnWeatherFX('tornado', wx, this.y);
            }
          }
        }

        if (this.isFrigoT1) {
          const rotDir = (this.owner && this.owner.facing < 0) ? -1 : 1;
          this.orbitAngle += rotDir * 8.5 * h;
          const rOrbit = Math.min(26, 26 * (this.age / 0.25));
          const x1 = this.x + rOrbit * Math.cos(this.orbitAngle);
          const y1 = this.y + rOrbit * Math.sin(this.orbitAngle);
          const x2 = this.x - rOrbit * Math.cos(this.orbitAngle);
          const y2 = this.y - rOrbit * Math.sin(this.orbitAngle);
          this.curOrb1 = { x: x1, y: y1 };
          this.curOrb2 = { x: x2, y: y2 };

          // Colisão independente da Bolinha 1
          if (this.b1Alive) {
            let hit1Tank = null;
            for (const t of tanks) {
              if (!t.alive) continue;
              if (t === this.owner && this.age < 0.25) continue;
              const c = t.center();
              if (GB.dist(c.x, c.y, x1, y1) < t.mobile.hitR + 4) { hit1Tank = t; break; }
            }
            const hit1Terrain = (this.age >= 0.2) && terrain.isSolid(x1, y1);
            if (hit1Tank || hit1Terrain) {
              this.b1Alive = false;
              cb.explode(this, x1, y1, false, { dmg: 90, r: 24, isSubOrb: true, hitTank: hit1Tank });
            }
          }

          // Colisão independente da Bolinha 2
          if (this.b2Alive) {
            let hit2Tank = null;
            for (const t of tanks) {
              if (!t.alive) continue;
              if (t === this.owner && this.age < 0.25) continue;
              const c = t.center();
              if (GB.dist(c.x, c.y, x2, y2) < t.mobile.hitR + 4) { hit2Tank = t; break; }
            }
            const hit2Terrain = (this.age >= 0.2) && terrain.isSolid(x2, y2);
            if (hit2Tank || hit2Terrain) {
              this.b2Alive = false;
              cb.explode(this, x2, y2, false, { dmg: 90, r: 24, isSubOrb: true, hitTank: hit2Tank });
            }
          }

          if (!this.b1Alive && !this.b2Alive) {
            this.dead = true;
            break;
          }
          if (this.x < -100 || this.x > GB.WORLD_W + 100 || this.y > GB.WORLD_H + 80) {
            this.dead = true;
            break;
          }
          continue;
        } else if (this.isFrigoT2) {
          const rotDir = (this.owner && this.owner.facing < 0) ? -1 : 1;
          this.orbitAngle += rotDir * 6.2 * h;
          const rOrbit = Math.min(52, 52 * (this.age / 0.3));
          const x1 = this.x + rOrbit * Math.cos(this.orbitAngle);
          const y1 = this.y + rOrbit * Math.sin(this.orbitAngle);
          const x2 = this.x - rOrbit * Math.cos(this.orbitAngle);
          const y2 = this.y - rOrbit * Math.sin(this.orbitAngle);
          this.curOrb1 = { x: x1, y: y1 };
          this.curOrb2 = { x: x2, y: y2 };

          // 1. Bolinha Central (no centro da trajetória)
          if (this.bCenterAlive) {
            let hitCenterTank = null;
            for (const t of tanks) {
              if (!t.alive) continue;
              if (t === this.owner && this.age < 0.25) continue;
              const c = t.center();
              if (GB.dist(c.x, c.y, this.x, this.y) < t.mobile.hitR + 4) { hitCenterTank = t; break; }
            }
            const hitCenterTerrain = (this.age >= 0.15) && terrain.isSolid(this.x, this.y);
            if (hitCenterTank || hitCenterTerrain) {
              this.bCenterAlive = false;
              cb.explode(this, this.x, this.y, false, { dmg: 80, r: 26, isSubOrb: true, hitTank: hitCenterTank });
            }
          }

          // 2. Bolinha Orbital 1
          if (this.b1Alive) {
            let hit1Tank = null;
            for (const t of tanks) {
              if (!t.alive) continue;
              if (t === this.owner && this.age < 0.25) continue;
              const c = t.center();
              if (GB.dist(c.x, c.y, x1, y1) < t.mobile.hitR + 4) { hit1Tank = t; break; }
            }
            const hit1Terrain = (this.age >= 0.25) && terrain.isSolid(x1, y1);
            if (hit1Tank || hit1Terrain) {
              this.b1Alive = false;
              cb.explode(this, x1, y1, false, { dmg: 80, r: 26, isSubOrb: true, hitTank: hit1Tank });
            }
          }

          // 3. Bolinha Orbital 2
          if (this.b2Alive) {
            let hit2Tank = null;
            for (const t of tanks) {
              if (!t.alive) continue;
              if (t === this.owner && this.age < 0.25) continue;
              const c = t.center();
              if (GB.dist(c.x, c.y, x2, y2) < t.mobile.hitR + 4) { hit2Tank = t; break; }
            }
            const hit2Terrain = (this.age >= 0.25) && terrain.isSolid(x2, y2);
            if (hit2Tank || hit2Terrain) {
              this.b2Alive = false;
              cb.explode(this, x2, y2, false, { dmg: 80, r: 26, isSubOrb: true, hitTank: hit2Tank });
            }
          }

          if (!this.bCenterAlive && !this.b1Alive && !this.b2Alive) {
            this.dead = true;
            break;
          }
          if (this.x < -120 || this.x > GB.WORLD_W + 120 || this.y > GB.WORLD_H + 90) {
            this.dead = true;
            break;
          }
          continue;
        }

        if (this.hasBounced) {
          this.bounceTimer += h;
          if (this.bounceTimer >= 3.0) {
            cb.explode(this, this.x, this.y, true);
            this.dead = true;
            break;
          }
        }

        if (this.x < -80 || this.x > GB.WORLD_W + 80 || this.y > GB.WORLD_H + 60) {
            if (this.shot.isKhanSS || this.isTeleport) {
               cb.explode(this, this.x, this.y, true);
            }
            this.dead = true;
            break;
        }

        // tanques
        if (this.isKudaSS) {
          if (!this.hitLivingEntities) this.hitLivingEntities = new Set();
          for (const t of tanks) {
            if (!t.alive) continue;
            if (t === this.owner && this.age < 0.25) continue;
            if (this.hitLivingEntities.has(t)) continue;
            const c = t.center();
            if (GB.dist(c.x, c.y, this.x, this.y) < t.mobile.hitR + 6) {
              this.hitLivingEntities.add(t);
              if (cb.hitKudaSS) cb.hitKudaSS(this, t);
            }
          }
          if (cb.checkKudaLivingTarget) {
            cb.checkKudaLivingTarget(this);
          }
        } else {
          let hitTank = false;
          for (const t of tanks) {
            if (!t.alive) continue;
            if (t === this.owner && this.age < 0.35) continue;
            if (this.shot.isKhanT2 || this.shot.isDrillerT2) continue; // Khan T2 e Driller T2 ignoram contato direto com jogadores
            const c = t.center();
            if (GB.dist(c.x, c.y, this.x, this.y) < t.mobile.hitR + (this.isDrillerAirDrill ? 4 : 0)) { hitTank = true; break; }
          }
          if (hitTank) { cb.explode(this, this.x, this.y, true); this.dead = true; break; }
        }

        if (this.isThorBeam) {
          if (this.targetX !== undefined && this.targetY !== undefined) {
             const distToTgt = GB.dist(this.x, this.y, this.targetX, this.targetY);
             if (distToTgt <= Math.max(22, speed * h * 1.5)) {
                cb.explode(this, this.targetX, this.targetY, true);
                this.dead = true;
                break;
             }
          }
        }

        if (this.isDrillerAirDrill) {
          // Colisão da broca do Air Strike com outras entidades com vida (robôs ou minas terrestres)
          if (cb.checkLivingEntity && cb.checkLivingEntity(this.x, this.y)) {
            cb.explode(this, this.x, this.y, true);
            this.dead = true;
            break;
          }
          // Broca aérea perfura e destrói 100% de todo chão em que tocar
          if (terrain.isSolid(this.x, this.y)) {
            terrain.carve(this.x, this.y, 14, false);
          }
        }

        let hitTerrain = terrain.isSolid(this.x, this.y);
        
        if (this.shot.isKhanSS || this.shot.isKudaSS || this.isDrillerAirDrill) {
           hitTerrain = false; // Khan SS, Kuda SS e Brocas do Air Strike ignoram parada em terreno (perfuram direto)
        }
        
        if (this.shot.isKhanT2) {
           if (!this.underground && hitTerrain) {
              this.underground = true; // Entrou no chão
           } else if (this.underground && !hitTerrain) {
              cb.explode(this, this.x, this.y, true); // Saiu do chão, explode!
              this.dead = true;
              break;
           }
           if (this.underground) hitTerrain = false; // Enquanto está no chão, não colide normalmente
        }

        if (hitTerrain) {
          if (this.bouncy) {
            this.hasBounced = true;
            let nx = 0, ny = 0;
            const sr = 4;
            for(let sy = -sr; sy <= sr; sy++) {
              for(let sx = -sr; sx <= sr; sx++) {
                if (terrain.isSolid(this.x + sx, this.y + sy)) {
                  nx -= sx; ny -= sy;
                }
              }
            }
            let len = Math.hypot(nx, ny);
            if (len === 0) { nx = 0; ny = -1; len = 1; }
            nx /= len; ny /= len;

            for(let k=0; k<6; k++) {
              if (!terrain.isSolid(this.x, this.y)) break;
              this.x += nx * 2; this.y += ny * 2;
            }

            const dot = this.vx * nx + this.vy * ny;
            if (dot < 0) {
               this.vx -= 1.65 * dot * nx;
               this.vy -= 1.65 * dot * ny;
            }
            const tanx = -ny, tany = nx;
            const tanDot = this.vx * tanx + this.vy * tany;
            this.vx -= tanDot * tanx * 0.15;
            this.vy -= tanDot * tany * 0.15;
          } else if (this.drillLeft > 0) {
            if (!this.drilling) {
              this.drilling = true;
              const k = 0.55;
              this.vx *= k; this.vy *= k;
              cb.explode(this, this.x, this.y, false);
              this.drillLeft--;
            }
            this.drillDist += Math.hypot(this.x - ox, this.y - oy);
            if (this.drillDist >= this.shot.drillStep) {
              this.drillDist = 0;
              this.drillLeft--;
              cb.explode(this, this.x, this.y, this.drillLeft <= 0);
              if (this.drillLeft <= 0) { this.dead = true; break; }
            }
          } else if (this.shot.spawnRobots) {
            cb.spawnRobots(this);
            this.dead = true;
            break;
          } else {
            cb.explode(this, this.x, this.y, true);
            this.dead = true;
            break;
          }
        } else if (this.drilling) {
          this.drillDist += Math.hypot(this.x - ox, this.y - oy) * 0.5;
        }
      }
      if (this.bCenterAlive || (!this.isFrigoT1 && !this.isFrigoT2)) {
        this.trail.push(this.x, this.y);
        if (this.trail.length > 36) this.trail.splice(0, 2);
      }
      if (this.b1Alive && this.curOrb1) {
        this.b1Trail.push(this.curOrb1.x, this.curOrb1.y);
        if (this.b1Trail.length > 28) this.b1Trail.splice(0, 2);
      }
      if (this.b2Alive && this.curOrb2) {
        this.b2Trail.push(this.curOrb2.x, this.curOrb2.y);
        if (this.b2Trail.length > 28) this.b2Trail.splice(0, 2);
      }
      if (this.tornadoCooldown > 0) this.tornadoCooldown -= dt;
      if (this.inTornadoSwirl > 0) this.inTornadoSwirl -= dt;
    }

    draw(ctx) {
      if (!this.launched || this.dead) return;
      const s = this.shot;

      if (this.isFrigoT1) {
        // Rastro orbital das 2 balas de gelo (apenas das que estão vivas)
        const drawOrbTrail = (tr) => {
          if (tr && tr.length >= 4) {
            ctx.save();
            ctx.lineCap = 'round';
            for (let i = 2; i < tr.length; i += 2) {
              const a = i / tr.length;
              ctx.strokeStyle = '#b2e6ff';
              ctx.globalAlpha = a * 0.7;
              ctx.lineWidth = s.size * 1.2 * a;
              ctx.beginPath();
              ctx.moveTo(tr[i - 2], tr[i - 1]);
              ctx.lineTo(tr[i], tr[i + 1]);
              ctx.stroke();
            }
            ctx.restore();
          }
        };
        if (this.b1Alive) drawOrbTrail(this.b1Trail);
        if (this.b2Alive) drawOrbTrail(this.b2Trail);

        const drawIceOrb = (ox, oy) => {
          ctx.save();
          ctx.translate(ox, oy);
          const orbR = s.size * 1.6;
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, orbR);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(0.35, '#85d2ff');
          g.addColorStop(0.75, '#29b6f6');
          g.addColorStop(1, 'rgba(41, 182, 246, 0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(0, 0, orbR, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(0, 0, s.size * 0.65, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        };

        if (this.b1Alive && this.curOrb1) drawIceOrb(this.curOrb1.x, this.curOrb1.y);
        if (this.b2Alive && this.curOrb2) drawIceOrb(this.curOrb2.x, this.curOrb2.y);
        return;
      }

      if (this.isFrigoT2) {
        // Circunferência imaginária REMOVIDA conforme pedido!

        const drawOrbTrail = (tr) => {
          if (tr && tr.length >= 4) {
            ctx.save();
            ctx.lineCap = 'round';
            for (let i = 2; i < tr.length; i += 2) {
              const a = i / tr.length;
              ctx.strokeStyle = '#80d4ff';
              ctx.globalAlpha = a * 0.6;
              ctx.lineWidth = s.size * 1.1 * a;
              ctx.beginPath();
              ctx.moveTo(tr[i - 2], tr[i - 1]);
              ctx.lineTo(tr[i], tr[i + 1]);
              ctx.stroke();
            }
            ctx.restore();
          }
        };

        if (this.bCenterAlive) drawOrbTrail(this.trail);
        if (this.b1Alive) drawOrbTrail(this.b1Trail);
        if (this.b2Alive) drawOrbTrail(this.b2Trail);

        // Todas as 3 bolinhas possuem exatamente o mesmo tamanho e efeito visual!
        const drawIceOrb = (ox, oy) => {
          ctx.save();
          ctx.translate(ox, oy);
          const orbR = s.size * 1.6; // Mesmo tamanho para as 3
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, orbR);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(0.35, '#6cd0ff');
          g.addColorStop(0.75, '#1e88e5');
          g.addColorStop(1, 'rgba(30, 136, 229, 0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(0, 0, orbR, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(0, 0, s.size * 0.65, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        };

        if (this.bCenterAlive) drawIceOrb(this.x, this.y);
        if (this.b1Alive && this.curOrb1) drawIceOrb(this.curOrb1.x, this.curOrb1.y);
        if (this.b2Alive && this.curOrb2) drawIceOrb(this.curOrb2.x, this.curOrb2.y);
        return;
      }

      if (this.isFrigoSS) {
        // Rastro grosso de cometa
        const tr = this.trail;
        if (tr.length >= 4) {
          ctx.save();
          ctx.lineCap = 'round';
          for (let i = 2; i < tr.length; i += 2) {
            const a = i / tr.length;
            ctx.strokeStyle = '#d4f0ff';
            ctx.globalAlpha = a * 0.8;
            ctx.lineWidth = s.size * 1.8 * a;
            ctx.beginPath();
            ctx.moveTo(tr[i - 2], tr[i - 1]);
            ctx.lineTo(tr[i], tr[i + 1]);
            ctx.stroke();
          }
          ctx.restore();
        }
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.atan2(this.vy, this.vx));
        const gSS = ctx.createRadialGradient(0, 0, 0, 0, 0, s.size * 2.4);
        gSS.addColorStop(0, '#ffffff');
        gSS.addColorStop(0.4, '#90dcff');
        gSS.addColorStop(0.75, '#1e88e5');
        gSS.addColorStop(1, 'rgba(30, 136, 229, 0)');
        ctx.fillStyle = gSS;
        ctx.beginPath(); ctx.arc(0, 0, s.size * 2.4, 0, Math.PI * 2); ctx.fill();
        // Cristal de gelo pontiagudo
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(s.size * 1.6, 0);
        ctx.lineTo(0, -s.size * 0.85);
        ctx.lineTo(-s.size * 1.4, 0);
        ctx.lineTo(0, s.size * 0.85);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0288d1'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.restore();
        return;
      }

      // rastro
      const tr = this.trail;
      if (tr.length >= 4) {
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 2; i < tr.length; i += 2) {
          const a = i / tr.length;
          ctx.strokeStyle = this.isTeleport ? '#aaddff' : (s.trail || 'rgba(255,255,255,.9)');
          ctx.globalAlpha = a * (this.isTeleport ? 0.9 : 0.55);
          ctx.lineWidth = s.size * (this.isTeleport ? 2.5 : 1.3) * a;
          ctx.beginPath();
          ctx.moveTo(tr[i - 2], tr[i - 1]);
          ctx.lineTo(tr[i], tr[i + 1]);
          ctx.stroke();
        }
        ctx.restore();
      }
      ctx.save();
      ctx.translate(this.x, this.y);
      if (this.isTeleport) {
        ctx.rotate(Math.atan2(this.vy, this.vx));
        // Brilho exterior azul-ciano
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, s.size * 2.8);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.3, '#b3ecff');
        g.addColorStop(0.7, '#4dc3ff');
        g.addColorStop(1, 'rgba(77, 195, 255, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, s.size * 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Núcleo luminoso em formato aerodinâmico
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(2, 0, s.size * 1.5, s.size * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Anel de pulso
        ctx.strokeStyle = '#80d4ff';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, s.size * 1.8, s.size * 1.1, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (s.missile) {
        ctx.rotate(Math.atan2(this.vy, this.vx));
        ctx.fillStyle = '#ffcf5c';
        ctx.beginPath(); ctx.moveTo(-s.size * 2.6, 0); ctx.lineTo(-s.size * 1.4, -s.size * 0.6); ctx.lineTo(-s.size * 1.4, s.size * 0.6); ctx.fill();
        GB.roundRect(ctx, -s.size * 1.5, -s.size * 0.55, s.size * 3, s.size * 1.1, s.size * 0.5);
        ctx.fillStyle = s.color; ctx.fill();
        ctx.lineWidth = 1.2; ctx.strokeStyle = '#222'; ctx.stroke();
      } else if (s.chains) {
        ctx.rotate(Math.atan2(this.vy, this.vx));
        const rotAge = this.age * 12;
        ctx.fillStyle = '#bbb';
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) {
           ctx.save();
           const chainAngle = rotAge + (k * Math.PI * 2 / 3);
           const dist = Math.sin(chainAngle) * s.size * 1.5;
           ctx.translate(0, dist);
           GB.roundRect(ctx, -s.size * 1.5, -2, s.size * 3, 4, 2);
           ctx.fill(); ctx.stroke();
           ctx.restore();
        }
      } else if (this.isDrillerAirDrill) {
        ctx.rotate(Math.atan2(this.vy, this.vx));
        const sz = s.size || 7;
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(-sz * 1.5, 0, sz * 1.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#55606d';
        ctx.fillRect(-sz * 2.2, -sz * 0.8, sz * 2.2, sz * 1.6);
        ctx.strokeStyle = '#222'; ctx.lineWidth = 1.2;
        ctx.strokeRect(-sz * 2.2, -sz * 0.8, sz * 2.2, sz * 1.6);

        ctx.beginPath();
        ctx.moveTo(0, -sz * 1.1);
        ctx.lineTo(sz * 2.8, 0);
        ctx.lineTo(0, sz * 1.1);
        ctx.closePath();
        ctx.fillStyle = '#b0bcc8';
        ctx.fill();
        ctx.strokeStyle = '#222'; ctx.stroke();

        ctx.strokeStyle = '#3e4854';
        ctx.lineWidth = 1.4;
        for (let i = 0; i < 3; i++) {
           const offX = sz * 0.7 * i;
           ctx.beginPath();
           ctx.moveTo(offX, -sz * 0.9 * (1 - offX / (sz * 2.8)));
           ctx.lineTo(offX + sz * 0.5, sz * 0.9 * (1 - offX / (sz * 2.8)));
           ctx.stroke();
        }
      } else if (s.isDrillerSSMarker) {
        ctx.rotate(Math.atan2(this.vy, this.vx));
        const sz = s.size || 7;
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, sz * 2.5);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.3, '#ff3333');
        g.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, sz * 2.5, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#ff2222';
        ctx.fillRect(-sz * 1.2, -sz * 0.5, sz * 2.4, sz);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2;
        ctx.strokeRect(-sz * 1.2, -sz * 0.5, sz * 2.4, sz);
      } else if (s.isDrillerT1) {
        ctx.rotate(Math.atan2(this.vy, this.vx));
        const sz = s.size || 6;
        ctx.fillStyle = '#3ea022';
        ctx.fillRect(-sz * 1.8, -sz * 0.7, sz * 2, sz * 1.4);
        ctx.strokeStyle = '#1e3814'; ctx.lineWidth = 1.2;
        ctx.strokeRect(-sz * 1.8, -sz * 0.7, sz * 2, sz * 1.4);

        ctx.beginPath();
        ctx.moveTo(sz * 0.2, -sz * 0.7);
        ctx.lineTo(sz * 2.2, 0);
        ctx.lineTo(sz * 0.2, sz * 0.7);
        ctx.closePath();
        ctx.fillStyle = '#9aa5b0';
        ctx.fill();
        ctx.stroke();
      } else if (s.isDrillerT2) {
        ctx.rotate(Math.atan2(this.vy, this.vx));
        const sz = s.size || 6;
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, sz * 2.2);
        g.addColorStop(0, '#fff');
        g.addColorStop(0.4, '#ffd700');
        g.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, sz * 2.2, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#cc9a00';
        ctx.fillRect(-sz * 1.5, -sz * 0.6, sz * 1.8, sz * 1.2);
        ctx.beginPath();
        ctx.moveTo(sz * 0.3, -sz * 0.8);
        ctx.lineTo(sz * 2.2, 0);
        ctx.lineTo(sz * 0.3, sz * 0.8);
        ctx.closePath();
        ctx.fillStyle = '#ffd700'; ctx.fill();
        ctx.strokeStyle = '#553e00'; ctx.lineWidth = 1.2; ctx.stroke();
      } else if (this.isThorBeam || s.isThorBeam) {
        // Raio Laser do THOR
        ctx.rotate(Math.atan2(this.vy, this.vx));
        const sz = s.size || 7;

        // Feixe contínuo de energia vindo da posição do Thor
        if (this.thorX !== undefined && this.thorY !== undefined) {
           ctx.save();
           ctx.rotate(-Math.atan2(this.vy, this.vx)); // reseta para coordenadas mundiais
           ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
           ctx.lineWidth = 12;
           ctx.beginPath();
           ctx.moveTo(this.thorX - this.x, this.thorY - this.y);
           ctx.lineTo(0, 0);
           ctx.stroke();

           ctx.strokeStyle = '#ffffff';
           ctx.lineWidth = 3.5;
           ctx.beginPath();
           ctx.moveTo(this.thorX - this.x, this.thorY - this.y);
           ctx.lineTo(0, 0);
           ctx.stroke();
           ctx.restore();
        }

        // Cabeça do projétil: plasma brilhante
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, sz * 2.8);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.35, '#00f0ff');
        g.addColorStop(0.75, 'rgba(0, 120, 255, 0.6)');
        g.addColorStop(1, 'rgba(0, 240, 255, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, sz * 2.8, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(sz * 2.5, 0);
        ctx.lineTo(-sz * 1.5, -sz * 0.8);
        ctx.lineTo(-sz * 0.8, 0);
        ctx.lineTo(-sz * 1.5, sz * 0.8);
        ctx.closePath();
        ctx.fill();
      } else if (s.isKudaT2) {
        // Míssil Marcador do T2 da Kuda
        ctx.rotate(Math.atan2(this.vy, this.vx));
        const sz = s.size || 5;

        // Aura de mira rosa/magenta
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, sz * 2.5);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.4, '#ff2c70');
        g.addColorStop(1, 'rgba(255, 44, 112, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, sz * 2.5, 0, Math.PI * 2); ctx.fill();

        // Corpo do míssil com bico apontado
        ctx.fillStyle = '#ff2c70';
        ctx.beginPath();
        ctx.moveTo(sz * 2.2, 0);
        ctx.lineTo(-sz * 1.2, -sz * 0.8);
        ctx.lineTo(-sz * 1.8, 0);
        ctx.lineTo(-sz * 1.2, sz * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Luz piscante de laser na ponta
        ctx.fillStyle = '#ffff66';
        ctx.beginPath(); ctx.arc(sz * 2.2, 0, 2, 0, Math.PI * 2); ctx.fill();
      } else if (s.isKudaSS) {
        // SS Perfurante da Kuda: Esfera de plasma maciça que atravessa o mundo
        ctx.rotate(Math.atan2(this.vy, this.vx));
        const sz = s.size || 8;
        const pulse = 1 + Math.sin(this.age * 20) * 0.15;

        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, sz * 2.6 * pulse);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.25, '#d488ff');
        g.addColorStop(0.65, '#8800ff');
        g.addColorStop(1, 'rgba(136, 0, 255, 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, sz * 2.6 * pulse, 0, Math.PI * 2); ctx.fill();

        // Anel giratório de energia
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.ellipse(0, 0, sz * 1.8, sz * 0.9, this.age * 10, 0, Math.PI * 2);
        ctx.stroke();

        // Núcleo
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, 0, sz * 0.8, 0, Math.PI * 2); ctx.fill();
      } else {
        const g = ctx.createRadialGradient(-s.size * 0.3, -s.size * 0.3, 0, 0, 0, s.size * 2.2);
        g.addColorStop(0, '#fff');
        g.addColorStop(0.35, s.color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0, 0, s.size * 2.2, 0, 7); ctx.fill();
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(0, 0, s.size, 0, 7); ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(30,10,30,.8)'; ctx.stroke();
      }

      // ================= EFEITOS CLIMÁTICOS NO PROJÉTIL =================
      const pSz = Math.max(6, (s && s.size) || 6);

      // 1. Force: Aura branca dourada radiante com raios solares
      if (this.hasForce) {
        const auraR = pSz * 2.8;
        const gAura = ctx.createRadialGradient(0, 0, 1, 0, 0, auraR);
        gAura.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        gAura.addColorStop(0.35, 'rgba(255, 215, 0, 0.7)');
        gAura.addColorStop(0.75, 'rgba(255, 170, 0, 0.35)');
        gAura.addColorStop(1, 'rgba(255, 140, 0, 0)');
        ctx.fillStyle = gAura;
        ctx.beginPath(); ctx.arc(0, 0, auraR, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = '#ffe57f';
        ctx.lineWidth = 1.6;
        for (let a = 0; a < 6; a++) {
          const ang = this.age * 9 + (a * Math.PI / 3);
          const r1 = auraR * 0.55, r2 = auraR * 1.25;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
          ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
          ctx.stroke();
        }
      }

      // 2. Black: Projétil todo preto com aura de névoa escura/roxa
      if (this.hasBlack) {
        const auraR = pSz * 2.6;
        // Núcleo completamente preto cobrindo o projétil
        ctx.fillStyle = '#050505';
        ctx.beginPath(); ctx.arc(0, 0, pSz * 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#581c87';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Névoa roxa sombria
        const gDark = ctx.createRadialGradient(0, 0, 2, 0, 0, auraR);
        gDark.addColorStop(0, 'rgba(10, 5, 20, 0.9)');
        gDark.addColorStop(0.45, 'rgba(88, 28, 135, 0.5)');
        gDark.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gDark;
        ctx.beginPath(); ctx.arc(0, 0, auraR, 0, Math.PI * 2); ctx.fill();
      }

      // 3. Thunder: Projétil eletrocutado com faíscas e arcos voltaicos
      if (this.hasThunder) {
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 9;
        ctx.lineWidth = 1.8;
        for (let k = 0; k < 3; k++) {
          const baseAng = this.age * 26 + k * 2.09;
          const r1 = pSz * 0.6, r2 = pSz * 2.4;
          const midAng = baseAng + 0.35 * (k % 2 === 0 ? 1 : -1);
          ctx.beginPath();
          ctx.moveTo(Math.cos(baseAng) * r1, Math.sin(baseAng) * r1);
          ctx.lineTo(Math.cos(midAng) * (r1 + r2) * 0.5, Math.sin(midAng) * (r1 + r2) * 0.5);
          ctx.lineTo(Math.cos(baseAng + 0.15) * r2, Math.sin(baseAng + 0.15) * r2);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }

      // 4. Tornado: Efeito de rotação e redemoinho ao passar pelo ciclone
      if (this.inTornadoSwirl > 0) {
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.75)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 9, this.age * 20, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }
  GB.Projectile = Projectile;

  // ---------------- Efeitos ----------------
  class Effects {
    constructor() { this.parts = []; this.texts = []; }
    clear() { this.parts.length = 0; this.texts.length = 0; }

    explosion(x, y, r, color, terrainRGB) {
      const P = this.parts;
      P.push({ t: 'flash', x, y, r: r * 1.35, life: 0.28, max: 0.28 });
      P.push({ t: 'ring', x, y, r: r, life: 0.45, max: 0.45 });
      const n = Math.min(40, 10 + r * 0.5);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = GB.rand(80, 260) * (r / 35);
        P.push({ t: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, life: GB.rand(0.3, 0.7), max: 0.7, size: GB.rand(1.5, 3.5), color: Math.random() < 0.5 ? '#ffe36b' : color });
      }
      for (let i = 0; i < n * 0.5; i++) {
        const a = Math.random() * Math.PI * 2, sp = GB.rand(60, 220);
        P.push({ t: 'debris', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 140, life: GB.rand(0.6, 1.3), max: 1.3, size: GB.rand(2, 4.5), color: terrainRGB });
      }
      for (let i = 0; i < 8 + r * 0.15; i++) {
        P.push({ t: 'smoke', x: x + GB.rand(-r, r) * 0.5, y: y + GB.rand(-r, r) * 0.5, vx: GB.rand(-20, 20), vy: GB.rand(-50, -15), life: GB.rand(0.8, 1.6), max: 1.6, size: GB.rand(r * 0.35, r * 0.7) });
      }
    }

    emp(x, y, r) {
      const P = this.parts;
      P.push({ t: 'emp_flash', x, y, r: r * 1.5, life: 0.4, max: 0.4 });
      P.push({ t: 'emp_ring', x, y, r: r * 1.2, life: 0.6, max: 0.6 });
      const n = Math.min(60, 20 + r * 0.8);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, sp = GB.rand(100, 350) * (r / 40);
        P.push({ t: 'emp_spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: GB.rand(0.3, 0.8), max: 0.8, size: GB.rand(2, 5), color: Math.random() < 0.5 ? '#7ad4ff' : '#ffffff' });
      }
    }

    muzzle(x, y, dx, dy) {
      for (let i = 0; i < 10; i++) {
        const sp = GB.rand(60, 200);
        this.parts.push({ t: 'spark', x, y, vx: dx * sp + GB.rand(-40, 40), vy: dy * sp + GB.rand(-40, 40), life: 0.3, max: 0.3, size: 2.5, color: '#ffd27a' });
      }
      this.parts.push({ t: 'smoke', x, y, vx: dx * 30, vy: dy * 30 - 20, life: 0.8, max: 0.8, size: 12 });
    }

    text(x, y, str, color, big) {
      this.texts.push({ x, y, str, color, life: 1.4, max: 1.4, big });
    }

    update(dt) {
      for (const p of this.parts) {
        p.life -= dt;
        if (p.vx != null) {
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.t === 'smoke') { p.vx *= 0.97; p.vy *= 0.97; p.size *= 1 + dt * 0.6; }
          else if (p.t === 'emp_spark') { p.vx *= 0.88; p.vy *= 0.88; }
          else p.vy += GB.GRAVITY * 0.9 * dt;
        }
      }
      this.parts = this.parts.filter(p => p.life > 0);
      for (const t of this.texts) { t.life -= dt; t.y -= 38 * dt; }
      this.texts = this.texts.filter(t => t.life > 0);
    }

    draw(ctx) {
      for (const p of this.parts) {
        const k = p.life / p.max;
        if (p.t === 'smoke') {
          ctx.globalAlpha = k * 0.35;
          ctx.fillStyle = '#3b3346';
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.parts) {
        const k = p.life / p.max;
        if (p.t === 'flash') {
          const rr = p.r * (1.15 - k * 0.4);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
          g.addColorStop(0, `rgba(255,255,230,${k})`);
          g.addColorStop(0.4, `rgba(255,180,60,${k * 0.9})`);
          g.addColorStop(1, 'rgba(255,60,20,0)');
          ctx.globalAlpha = 1;
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 7); ctx.fill();
        } else if (p.t === 'emp_flash') {
          const rr = p.r * (1.2 - k * 0.5);
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
          g.addColorStop(0, `rgba(200,240,255,${k})`);
          g.addColorStop(0.3, `rgba(100,200,255,${k * 0.8})`);
          g.addColorStop(1, 'rgba(0,100,255,0)');
          ctx.globalAlpha = 1;
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 7); ctx.fill();
        } else if (p.t === 'ring') {
          ctx.globalAlpha = k * 0.8;
          ctx.strokeStyle = '#ffe9b0';
          ctx.lineWidth = 3 * k + 1;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.6 - k * 0.9), 0, 7); ctx.stroke();
        } else if (p.t === 'emp_ring') {
          ctx.globalAlpha = k * 0.9;
          ctx.strokeStyle = '#aaddff';
          ctx.lineWidth = 6 * k + 2;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (2.0 - k * 1.5), 0, 7); ctx.stroke();
        } else if (p.t === 'spark' || p.t === 'emp_spark') {
          ctx.globalAlpha = k;
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * k + 0.5, 0, 7); ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const p of this.parts) {
        if (p.t !== 'debris') continue;
        ctx.globalAlpha = Math.min(1, p.life * 2);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      for (const t of this.texts) {
        const k = t.life / t.max;
        const pop = k > 0.85 ? 1 + (k - 0.85) * 3 : 1;
        ctx.globalAlpha = Math.min(1, k * 2.5);
        ctx.font = `${t.big ? 28 : 20}px 'Lilita One', sans-serif`;
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.scale(pop, pop);
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(20,0,20,.85)';
        ctx.strokeText(t.str, 0, 0);
        ctx.fillStyle = t.color;
        ctx.fillText(t.str, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }
  GB.Effects = Effects;
})(window.GB);
