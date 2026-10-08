/* Entrada: botões de toque (segurar), teclado para PC e arrastar a câmera no campo. */
(function (GB) {
  'use strict';

  const Input = {
    held: { left: false, right: false, up: false, down: false, fire: false },
    handlers: { fireStart: null, fireEnd: null, shot: null, pan: null, interact: null },

    init(canvas) {
      const bindHold = (id, key, onDown, onUp) => {
        const el = document.getElementById(id);
        const down = (e) => {
          e.preventDefault();
          GB.Sfx.init(); GB.Sfx.resume();
          try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignora */ }
          if (this.held[key]) return;
          this.held[key] = true;
          el.classList.add('pressed');
          onDown && onDown();
        };
        const up = (e) => {
          if (!this.held[key]) return;
          this.held[key] = false;
          el.classList.remove('pressed');
          onUp && onUp();
        };
        el.addEventListener('pointerdown', down);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        el.addEventListener('lostpointercapture', up);
        el.addEventListener('contextmenu', (e) => e.preventDefault());
      };

      bindHold('btn-left', 'left');
      bindHold('btn-right', 'right');
      bindHold('btn-up', 'up');
      bindHold('btn-down', 'down');
      bindHold('btn-fire', 'fire', () => this.emit('fireStart'), () => this.emit('fireEnd'));

      document.querySelectorAll('.shot-btn').forEach((b) => {
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.emit('shot', +b.dataset.shot); });
      });

      // Teclado
      const keyMap = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down' };
      window.addEventListener('keydown', (e) => {
        if (e.target && e.target.tagName === 'INPUT') return;
        GB.Sfx.init(); GB.Sfx.resume();
        if (keyMap[e.key]) { this.held[keyMap[e.key]] = true; e.preventDefault(); }
        if (e.code === 'Space') {
          e.preventDefault();
          if (!this.held.fire) { this.held.fire = true; this.emit('fireStart'); }
        }
        if (e.key === '1' || e.key === '2' || e.key === '3') this.emit('shot', +e.key - 1);
        
        // Atalhos de Itens (4, 5, 6, 7)
        if (e.key === '4') document.getElementById('item-btn-0')?.click();
        if (e.key === '5') document.getElementById('item-btn-1')?.click();
        if (e.key === '6') document.getElementById('item-btn-2')?.click();
        if (e.key === '7') document.getElementById('item-btn-3')?.click();
      });
      window.addEventListener('keyup', (e) => {
        if (keyMap[e.key]) this.held[keyMap[e.key]] = false;
        if (e.code === 'Space' && this.held.fire) { this.held.fire = false; this.emit('fireEnd'); }
      });
      window.addEventListener('blur', () => {
        for (const k in this.held) this.held[k] = false;
      });

      // Arrastar câmera
      let drag = null;
      canvas.addEventListener('pointerdown', (e) => {
        GB.Sfx.init(); GB.Sfx.resume();
        drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
        try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignora */ }
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!drag || drag.id !== e.pointerId) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        drag.x = e.clientX; drag.y = e.clientY;
        this.emit('pan', dx, dy);
      });
      const end = (e) => { if (drag && drag.id === e.pointerId) drag = null; };
      canvas.addEventListener('pointerup', end);
      canvas.addEventListener('pointercancel', end);
      document.addEventListener('contextmenu', (e) => e.preventDefault());
    },

    emit(name, a, b) { const h = this.handlers[name]; if (h) h(a, b); },
    releaseAll() {
      for (const k in this.held) this.held[k] = false;
      document.querySelectorAll('.pressed').forEach((el) => el.classList.remove('pressed'));
    },
  };

  GB.Input = Input;
})(window.GB);
