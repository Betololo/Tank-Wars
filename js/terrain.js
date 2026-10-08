/* Terreno destrutível: gerado a partir de uma seed (igual nos dois aparelhos online), com máscara de colisão por pixel. */
(function (GB) {
  'use strict';

  const THEMES = [
    { name: 'Campos', grass: [120, 214, 72], grass2: [64, 150, 52], dirt: [150, 96, 58], dirt2: [112, 68, 44], deep: [70, 42, 34], rim: 'rgba(40,20,10,' },
    { name: 'Neve',   grass: [240, 250, 255], grass2: [176, 214, 240], dirt: [110, 140, 190], dirt2: [80, 102, 156], deep: [48, 58, 104], rim: 'rgba(20,30,60,' },
    { name: 'Deserto', grass: [255, 214, 120], grass2: [232, 170, 82], dirt: [204, 126, 70], dirt2: [168, 92, 56], deep: [110, 54, 44], rim: 'rgba(60,24,10,' },
  ];
  GB.THEMES = THEMES;

  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  class Terrain {
    constructor(seed) {
      this.seed = seed;
      this.W = GB.WORLD_W;
      this.H = GB.WORLD_H;
      this.mask = new Uint8Array(this.W * this.H);
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.W;
      this.canvas.height = this.H;
      this.ctx = this.canvas.getContext('2d');
      this.craters = [];
      this.theme = THEMES[seed % THEMES.length];
      this.generate();
    }

    generate() {
      const { W, H, mask } = this;
      const rng = GB.makeRng(this.seed);

      // ---- Relevo base: soma de senoides ----
      const waves = [];
      for (let i = 0; i < 4; i++) {
        waves.push({ f: rng.range(0.6, 1.4) * (i + 1) * 0.0022, p: rng.range(0, Math.PI * 2), a: rng.range(40, 110) / (i + 1) });
      }
      const base = H * rng.range(0.56, 0.64);
      const heights = new Float32Array(W);
      for (let x = 0; x < W; x++) {
        let h = base;
        for (const w of waves) h += Math.sin(x * w.f + w.p) * w.a;
        heights[x] = GB.clamp(h, H * 0.3, H * 0.86);
      }

      // ---- Abismo opcional no meio (bom para "bunge") ----
      let gap = null;
      if (rng() < 0.65) {
        const gw = rng.range(50, 110);
        const gx = W / 2 + rng.range(-180, 180);
        gap = { a: gx - gw / 2, b: gx + gw / 2 };
      }

      for (let x = 0; x < W; x++) {
        if (gap && x > gap.a && x < gap.b) continue;
        const top = heights[x] | 0;
        for (let y = top; y < H; y++) mask[y * W + x] = 1;
      }

      // ---- Plataformas flutuantes ----
      const plats = rng.int(2, 4);
      for (let i = 0; i < plats; i++) {
        const cx = rng.range(W * 0.15, W * 0.85);
        const cy = rng.range(H * 0.18, H * 0.4);
        const rx = rng.range(70, 150);
        const ry = rng.range(22, 40);
        for (let y = Math.floor(cy - ry); y < cy + ry * 1.6; y++) {
          for (let x = Math.floor(cx - rx); x < cx + rx; x++) {
            if (x < 0 || x >= W || y < 0 || y >= H) continue;
            const dx = (x - cx) / rx;
            const dy = (y - cy) / (y < cy ? ry : ry * 1.6);
            const wob = Math.sin(x * 0.07 + i) * 0.08;
            if (dx * dx + dy * dy < 1 + wob) mask[y * W + x] = 1;
          }
        }
      }

      // ---- Cavernas ----
      const caves = rng.int(1, 3);
      for (let i = 0; i < caves; i++) {
        const cx = rng.range(W * 0.2, W * 0.8);
        const cy = rng.range(H * 0.75, H * 0.92);
        this.carveMask(cx, cy, rng.range(30, 60));
      }

      this.paint();
    }

    // Pinta a textura do terreno pixel a pixel (grama no topo, terra com estratos).
    paint() {
      const { W, H, mask, theme } = this;
      const img = this.ctx.createImageData(W, H);
      const buf = new Uint32Array(img.data.buffer);
      const pack = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;
      for (let x = 0; x < W; x++) {
        let depth = 999;
        for (let y = 0; y < H; y++) {
          const i = y * W + x;
          if (!mask[i]) { depth = -1; continue; }
          depth = depth < 0 ? 0 : depth + 1;
          let c;
          const n = hash(x >> 2, y >> 2) * 0.22 + hash(x, y) * 0.08;
          if (depth < 6) c = theme.grass;
          else if (depth < 11) c = theme.grass2;
          else {
            const s = Math.sin(y * 0.045 + Math.sin(x * 0.008) * 3) * 0.5 + 0.5;
            const t = GB.clamp((depth - 11) / 260, 0, 1);
            const a = s > 0.55 ? theme.dirt : theme.dirt2;
            c = [GB.lerp(a[0], theme.deep[0], t), GB.lerp(a[1], theme.deep[1], t), GB.lerp(a[2], theme.deep[2], t)];
          }
          const k = 0.9 + n;
          buf[i] = pack(Math.min(255, c[0] * k) | 0, Math.min(255, c[1] * k) | 0, Math.min(255, c[2] * k) | 0);
        }
      }
      this.ctx.putImageData(img, 0, 0);
    }

    isSolid(x, y) {
      x |= 0; y |= 0;
      if (x < 0 || x >= this.W || y < 0 || y >= this.H) return false;
      return this.mask[y * this.W + x] === 1;
    }

    // Primeiro pixel sólido descendo a partir de y (ou -1).
    surfaceBelow(x, y) {
      x |= 0;
      if (x < 0 || x >= this.W) return -1;
      for (let yy = Math.max(0, y | 0); yy < this.H; yy++) if (this.mask[yy * this.W + x]) return yy;
      return -1;
    }

    carveMask(cx, cy, r) {
      const { W, H, mask } = this;
      const r2 = r * r;
      const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W - 1, Math.ceil(cx + r));
      const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
      for (let y = y0; y <= y1; y++) {
        const dy = y - cy;
        for (let x = x0; x <= x1; x++) {
          const dx = x - cx;
          if (dx * dx + dy * dy <= r2) mask[y * W + x] = 0;
        }
      }
    }

    // Cratera: remove da máscara e do desenho, e queima a borda.
    carve(cx, cy, r, record = true) {
      if (r <= 0) return;
      this.carveMask(cx, cy, r);
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-atop';
      const g = ctx.createRadialGradient(cx, cy, r, cx, cy, r + 9);
      g.addColorStop(0, this.theme.rim + '0.75)');
      g.addColorStop(1, this.theme.rim + '0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (record) this.craters.push([Math.round(cx), Math.round(cy), Math.round(r)]);
    }

    carveMaskFlat(cx, cy, w, h) {
      const { W, H, mask } = this;
      const x0 = Math.max(0, Math.floor(cx - w/2)), x1 = Math.min(W - 1, Math.ceil(cx + w/2));
      const y0 = Math.max(0, Math.floor(cy - h/2)), y1 = Math.min(H - 1, Math.ceil(cy + h/2));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          mask[y * W + x] = 0;
        }
      }
    }

    carveFlat(cx, cy, w, h, record = true) {
      if (w <= 0 || h <= 0) return;
      this.carveMaskFlat(cx, cy, w, h);
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(cx - w/2, cy - h/2, w, h);
      
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = this.theme.rim + '0.45)';
      ctx.fillRect(cx - w/2 - 6, cy - h/2 - 6, w + 12, h + 12);
      ctx.restore();
      
      if (record) {
         this.craters.push([Math.round(cx), Math.round(cy), -Math.round(w), Math.round(h)]);
      }
    }

    // Escava uma faixa que acompanha o relevo: para cada coluna x0+i remove de tops[i] até tops[i]+depth.
    // (tops[i] = -1 ignora a coluna). Usado pelo Napalm: cava toda a área em chamas, em linha, não em círculo.
    carveColumns(x0, tops, depth, record = true) {
      if (!tops || !tops.length || depth <= 0) return;
      const { W, H, mask } = this;
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      for (let i = 0; i < tops.length; i++) {
        const x = x0 + i, t = tops[i];
        if (t < 0 || x < 0 || x >= W) continue;
        const yEnd = Math.min(H, t + depth);
        for (let y = Math.max(0, t - 1); y < yEnd; y++) mask[y * W + x] = 0;
        ctx.rect(x, t - 1, 1, depth + 1);
      }
      ctx.fill();
      // borda queimada logo abaixo do novo fundo
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = this.theme.rim + '0.6)';
      ctx.beginPath();
      for (let i = 0; i < tops.length; i++) {
        const t = tops[i];
        if (t < 0) continue;
        ctx.rect(x0 + i, t + depth, 1, 8);
      }
      ctx.fill();
      ctx.restore();
      if (record) this.craters.push({ k: 'col', x0, d: depth, t: tops.slice() });
    }

    applyCraters(list) {
      for (const c of list) {
         if (!Array.isArray(c)) { if (c.k === 'col') this.carveColumns(c.x0, c.t, c.d, false); }
         else if (c[2] < 0) this.carveFlat(c[0], c[1], -c[2], c[3], false);
         else this.carve(c[0], c[1], c[2], false);
      }
    }
  }

  GB.Terrain = Terrain;
})(window.GB);
