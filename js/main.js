/* UI principal: fluxo de telas, GunBound Room Lobby (1v1 até 4v4), estados e integração DOM. */
(function (GB) {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const UI = {
    game: null,
    screens: {
      menu: $('scr-menu'), select: $('scr-select'), online: $('scr-online'), lobby: $('scr-lobby'),
      mobileModal: $('scr-mobile-modal'), help: $('scr-help'), pass: $('scr-pass'),
      pause: $('scr-pause'), result: $('scr-result'), coinFlip: $('scr-coin-flip')
    },
    setup: { mode: null, diff: 1 },
    room: {
      code: '----',
      title: 'SALA 01',
      format: '4v4', // '1v1', '2v2', '3v3', '4v4'
      map: 'large',
      slots: Array(8).fill(null) // 0..3: Time A, 4..7: Time B
    },
    mySlotIdx: 0,
    myName: 'Jogador',

    init() {
      // Impede arrasto elástico (bouncing) na página
      document.addEventListener('touchmove', (e) => {
        if (e.target.tagName !== 'INPUT') e.preventDefault();
      }, { passive: false });

      // Carrega nickname salvo
      const savedName = localStorage.getItem('gb_player_name');
      if (savedName) this.myName = savedName;
      const nickInput = $('on-name');
      if (nickInput) {
        nickInput.value = this.myName;
        nickInput.addEventListener('input', (e) => {
          const val = e.target.value.trim() || 'Jogador';
          this.myName = val;
          localStorage.setItem('gb_player_name', val);
          if (this.room.slots[this.mySlotIdx]) {
            this.room.slots[this.mySlotIdx].name = val;
            if (this.setup.mode === 'online') {
              if (GB.Net.isHost) GB.Net.broadcast({ t: 'room_state', room: this.room });
              else GB.Net.send({ t: 'room_act', act: 'rename', name: val });
            }
            this.updateRoomLobbyUI();
          }
        });
      }

      GB.Input.init($('game'));
      this.game = new GB.Game($('game'), this);

      // Popula Cards de Mobile no Modal F3 e na seleção legada
      this.populateMobileCards();

      // Botões do Menu Principal
      $('m-pve').addEventListener('click', () => this.startOfflineLobby('pve'));
      $('m-local').addEventListener('click', () => this.startOfflineLobby('local'));
      $('m-online').addEventListener('click', () => {
        GB.Sfx.init(); GB.Sfx.click();
        this.resetOnline();
        this.showScreen('online');
      });
      $('m-help').addEventListener('click', () => { GB.Sfx.init(); GB.Sfx.click(); this.showScreen('help'); });
      $('help-back').addEventListener('click', () => { GB.Sfx.init(); GB.Sfx.click(); this.showScreen('menu'); });

      // Botões da Tela Online
      $('on-back').addEventListener('click', () => { GB.Sfx.click(); GB.Net.close(); this.showScreen('menu'); });
      $('on-create').addEventListener('click', () => this.hostOnline());
      $('on-join').addEventListener('click', () => this.joinOnline($('on-code').value));

      // Botões da Sala GunBound (Lobby)
      $('lobby-back').addEventListener('click', () => {
        GB.Sfx.click();
        GB.Net.close();
        this.showScreen('menu');
      });

      $('gb-btn-copy').addEventListener('click', () => {
        GB.Sfx.click();
        const code = this.room.code;
        if (!code || code === '----') return;
        const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${code}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(inviteUrl).then(() => {
            this.game.toast(`Link de convite copiado! Envie aos amigos.`);
          }).catch(() => {
            this.game.toast(`Código: ${code}`);
          });
        } else {
          this.game.toast(`Código da sala: ${code}`);
        }
      });

      $('gb-btn-mobile').addEventListener('click', () => {
        GB.Sfx.click();
        this.showScreen('mobileModal');
      });
      $('gb-modal-close').addEventListener('click', () => {
        GB.Sfx.click();
        this.showScreen('lobby');
      });

      $('gb-modal-x')?.addEventListener('click', () => {
        GB.Sfx.click();
        this.showScreen('lobby');
      });

      $('gb-modal-random')?.addEventListener('click', () => {
        GB.Sfx.init(); GB.Sfx.click();
        const allIds = ['launcher', 'grub', 'doc', 'frigo', 'khan', 'armor', 'driller', 'bigfoot', 'kuda', 'dj'];
        const rnd = allIds[Math.floor(Math.random() * allIds.length)];
        const modalBox = $('gb-modal-cards');
        if (modalBox) {
          modalBox.querySelectorAll('.gb-mob-cell').forEach(c => {
            c.classList.toggle('selected', c.dataset.id === rnd);
          });
        }
        this.changeMyMobile(rnd);
        this.showScreen('lobby');
      });

      $('gb-btn-team').addEventListener('click', () => {
        GB.Sfx.click();
        this.switchMyTeam();
      });

      $('lobby-start').addEventListener('click', () => {
        GB.Sfx.click();
        if (GB.Net.isHost || this.setup.mode !== 'online') {
          this.tryStartGame();
        } else {
          this.toggleMyReady();
        }
      });

      // Opções da Sala (Host Only)
      $('gb-opt-format').addEventListener('change', (e) => {
        if (!GB.Net.isHost && this.setup.mode === 'online') return;
        this.room.format = e.target.value;
        if (this.setup.mode === 'online' && GB.Net.isHost) {
          GB.Net.broadcast({ t: 'room_state', room: this.room });
        }
        this.updateRoomLobbyUI();
      });

      $('gb-opt-mode').addEventListener('change', (e) => {
        if (!GB.Net.isHost && this.setup.mode === 'online') return;
        this.room.mode = e.target.value;
        if (this.setup.mode === 'online' && GB.Net.isHost) {
          GB.Net.broadcast({ t: 'room_state', room: this.room });
        }
        this.updateRoomLobbyUI();
      });

      $('gb-opt-map').addEventListener('change', (e) => {
        if (!GB.Net.isHost && this.setup.mode === 'online') return;
        this.room.map = e.target.value;
        if (this.setup.mode === 'online' && GB.Net.isHost) {
          GB.Net.broadcast({ t: 'room_state', room: this.room });
        }
        this.updateRoomLobbyUI();
      });

      // Paleta de Itens
      document.querySelectorAll('.item-btn').forEach(b => {
        b.innerHTML = GB.itemLabelHTML(b.dataset.item);
        b.addEventListener('click', () => {
          GB.Sfx.click();
          this.equipItem(b.dataset.item, b.classList.contains('i2'));
        });
      });

      // Clique nos Slots de Itens Equipados para Desequipar
      $('gb-equipped-items').addEventListener('click', (e) => {
        const slotEl = e.target.closest('.item-slot');
        if (!slotEl) return;
        const slotIdx = +slotEl.dataset.slot;
        this.unequipItem(slotIdx);
      });

      // Clique nos Slots da Sala para Entrar no Time A ou B
      document.querySelectorAll('.gb-slot').forEach(slotEl => {
        slotEl.addEventListener('click', (e) => {
          const joinBtn = e.target.closest('.gb-btn-join-slot');
          if (joinBtn) {
            GB.Sfx.click();
            const targetSlot = +joinBtn.dataset.slot;
            this.moveMySlot(targetSlot);
          }
        });
      });

      // Chat da Sala
      $('lobby-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const inp = $('lobby-input');
        const text = inp.value.trim();
        if (!text) return;
        inp.value = '';

        const myP = this.room.slots[this.mySlotIdx] || { name: this.myName, team: 0 };
        if (this.setup.mode === 'online') {
          if (GB.Net.isHost) {
            this.addChatMsg(myP.name, myP.team, text);
            GB.Net.broadcast({ t: 'chat', sender: myP.name, team: myP.team, msg: text });
          } else {
            GB.Net.send({ t: 'chat', sender: myP.name, team: myP.team, msg: text });
          }
        } else {
          this.addChatMsg(myP.name, myP.team, text);
        }
      });

      // Outros Modais
      $('pass-ok').addEventListener('click', () => { GB.Sfx.click(); this.hideScreens(); if (this._onPassOk) this._onPassOk(); });
      $('pause-resume').addEventListener('click', () => { GB.Sfx.click(); this.hideScreens(); this.game.paused = false; });
      $('pause-quit').addEventListener('click', () => { GB.Sfx.click(); this.game.stop(); GB.Net.close(); this.showScreen('menu'); });
      $('btn-pause').addEventListener('click', () => {
        GB.Sfx.click();
        if (this.setup.mode === 'online') return this.game.toast('Pausa desativada no modo online');
        this.game.paused = true;
        this.showScreen('pause');
      });

      $('res-again').addEventListener('click', () => {
        GB.Sfx.click();
        if (this.setup.mode === 'online') {
          if (GB.Net.isHost) {
            this.showScreen('lobby');
            this.updateRoomLobbyUI();
          } else {
            this.showScreen('lobby');
          }
        } else {
          this.showScreen('lobby');
          this.updateRoomLobbyUI();
        }
      });
      $('res-menu').addEventListener('click', () => { GB.Sfx.click(); GB.Net.close(); this.game.stop(); this.showScreen('menu'); });

      // Configuração de Callbacks da Rede P2P
      this.setupNetCallbacks();

      const urlParams = new URLSearchParams(window.location.search);
      const urlRoom = urlParams.get('room') || urlParams.get('sala');
      if (urlRoom) {
        const cleanCode = urlRoom.trim().toUpperCase();
        const codeInp = $('on-code');
        if (codeInp) codeInp.value = cleanCode;
        this.resetOnline();
        this.showScreen('online');
        setTimeout(() => {
          this.game.toast(`Código ${cleanCode} carregado! Clique em 'Entrar na Sala'`);
        }, 400);
      } else {
        this.showScreen('menu');
      }
      $('app').style.opacity = '1';
    },

    showScreen(id) {
      Object.values(this.screens).forEach(el => el && el.classList.remove('active'));
      if (id && this.screens[id]) this.screens[id].classList.add('active');
      GB.Input.releaseAll();
    },
    hideScreens() { this.showScreen(null); },

    // --- População de Mobiles ---
    populateMobileCards() {
      const modalBox = $('gb-modal-cards');
      if (!modalBox) return;
      modalBox.innerHTML = '';

      const categories = [
        {
          id: 'dano',
          name: '💥 DANO',
          cls: 'dano',
          mobiles: ['launcher', 'grub']
        },
        {
          id: 'suporte',
          name: '🩹 SUPORTE',
          cls: 'suporte',
          mobiles: ['doc', 'frigo']
        },
        {
          id: 'tank',
          name: '🛡️ TANK',
          cls: 'tank',
          mobiles: ['khan', 'armor']
        },
        {
          id: 'escavacao',
          name: '⛏️ ESCAVAÇÃO',
          cls: 'escavacao',
          mobiles: ['driller', 'bigfoot']
        },
        {
          id: 'utilidade',
          name: '⚡ UTILIDADE',
          cls: 'utilidade',
          mobiles: ['kuda', 'dj']
        }
      ];

      const currentMob = this.myMobileId || 'armor';

      categories.forEach(cat => {
        const col = document.createElement('div');
        col.className = `gb-cat-col ${cat.cls}`;
        col.innerHTML = `
          <div class="gb-cat-header">${cat.name}</div>
          <div class="gb-cat-mobiles"></div>
        `;
        const list = col.querySelector('.gb-cat-mobiles');

        cat.mobiles.forEach(mobId => {
          const m = GB.MOBILES[mobId];
          if (!m) return;
          const cell = document.createElement('div');
          cell.className = 'gb-mob-cell' + (mobId === currentMob ? ' selected' : '');
          cell.dataset.id = mobId;
          cell.title = `${m.name}: ${m.desc}`;
          cell.innerHTML = `
            <canvas width="90" height="52"></canvas>
            <span class="gb-mob-cell-name">${m.name}</span>
            <span class="gb-mob-cell-role">${cat.name.split(' ')[1]}</span>
          `;
          cell.addEventListener('click', () => {
            GB.Sfx.init(); GB.Sfx.click();
            modalBox.querySelectorAll('.gb-mob-cell').forEach(c => c.classList.remove('selected'));
            cell.classList.add('selected');
            this.changeMyMobile(mobId);
            this.showScreen('lobby');
          });
          list.appendChild(cell);
          GB.drawMobilePreview(cell.querySelector('canvas'), mobId);
        });

        modalBox.appendChild(col);
      });
    },

    // --- Lobby Offline (PvE / Local) ---
    startOfflineLobby(mode) {
      GB.Sfx.init(); GB.Sfx.click();
      this.setup.mode = mode;
      this.mySlotIdx = 0;
      this.room = {
        code: 'LOCAL',
        title: mode === 'pve' ? 'TREINO VS CPU' : 'PARTIDA LOCAL 1v1',
        format: '1v1',
        map: 'large',
        mode: 'single_life',
        slots: Array(8).fill(null)
      };

      // Slot 0: Jogador
      this.room.slots[0] = {
        id: 'p1', name: this.myName || 'Jogador 1',
        team: 0, slotIdx: 0, mobile: 'armor',
        items: ['dual'], items2: 'nuclear', ready: true, isHost: true, ping: 0
      };

      // Slot 4: Oponente (CPU ou Jogador 2)
      this.room.slots[4] = {
        id: 'p2', name: mode === 'pve' ? 'CPU' : 'Jogador 2',
        team: 1, slotIdx: 4, mobile: mode === 'pve' ? 'bigfoot' : 'grub',
        items: ['teleport'], items2: null, ready: true, isHost: false, ping: 0
      };

      $('lobby-chat').innerHTML = '';
      this.addChatMsg('Sistema', -1, `Modo ${mode.toUpperCase()} pronto! Escolha seu mobile e itens.`);
      this.showScreen('lobby');
      this.updateRoomLobbyUI();
    },

    // --- Rede e Multiplayer Online ---
    resetOnline() {
      $('on-choose').classList.remove('hidden');
      $('on-wait').classList.add('hidden');
      $('on-msg').textContent = '';
      $('on-code').value = '';
    },

    hostOnline() {
      GB.Sfx.click();
      if (!GB.Net.available()) return $('on-msg').textContent = 'Biblioteca PeerJS não carregou. Verifique sua conexão.';
      $('on-choose').classList.add('hidden');
      $('on-wait').classList.remove('hidden');
      $('on-room').textContent = '...';
      $('on-status').textContent = 'Conectando ao servidor WebRTC...';

      this.setup.mode = 'online';
      this.mySlotIdx = 0;
      this.room = {
        code: '----',
        title: 'SALA 01 - MINI GUNBOUND',
        format: '4v4',
        map: 'large',
        mode: 'single_life',
        slots: Array(8).fill(null)
      };

      // Adiciona o Host no Slot 0 (Time A)
      this.room.slots[0] = {
        id: 'host', name: this.myName,
        team: 0, slotIdx: 0, mobile: 'armor',
        items: [], items2: null, ready: true, isHost: true, ping: 0
      };

      GB.Net.host({
        onCode: (code) => {
          this.room.code = code;
          $('lobby-chat').innerHTML = '';
          this.addChatMsg('Sistema', -1, `Sala criada! Código: ${code}. Envie para seus amigos entrarem.`);
          this.showScreen('lobby');
          this.updateRoomLobbyUI();
        },
        onError: (err) => {
          this.resetOnline();
          $('on-msg').textContent = err;
        }
      });
    },

    joinOnline(code) {
      GB.Sfx.click();
      if (!code) return $('on-msg').textContent = 'Digite ou cole o código da sala.';
      code = code.trim();
      const match = code.match(/[?&](?:room|sala)=([A-Za-z0-9]{4})/i);
      if (match) {
        code = match[1].toUpperCase();
      } else {
        const clean = code.replace(/[^A-Za-z0-9]/g, '');
        if (clean.length >= 4) {
          code = clean.slice(-4).toUpperCase();
        } else {
          return $('on-msg').textContent = 'Digite um código válido de 4 caracteres.';
        }
      }
      $('on-code').value = code;

      $('on-choose').classList.add('hidden');
      $('on-wait').classList.remove('hidden');
      $('on-room').textContent = code;
      $('on-status').textContent = 'Conectando à sala...';

      this.setup.mode = 'online';

      let stateReceived = false;
      const joinWatchdog = setTimeout(() => {
        if (!stateReceived && $('scr-online').classList.contains('active')) {
          this.resetOnline();
          $('on-msg').textContent = 'O Host não respondeu à entrada. Verifique se a sala ainda existe.';
          GB.Net.close();
        }
      }, 7000);

      this._cancelJoinWatchdog = () => {
        stateReceived = true;
        clearTimeout(joinWatchdog);
      };

      GB.Net.join(code, {
        onConnect: () => {
          $('on-status').textContent = 'Entrando na sala...';
          // Conectado com sucesso ao Host! Envia solicitação de entrada
          GB.Net.send({
            t: 'join_req',
            name: this.myName,
            mobile: 'armor',
            items: [],
            items2: null
          });
        },
        onError: (err) => {
          if (this._cancelJoinWatchdog) this._cancelJoinWatchdog();
          this.resetOnline();
          $('on-msg').textContent = err;
        }
      });
    },

    setupNetCallbacks() {
      // Recebimento de Mensagens
      GB.Net.onMessage = (m, fromPeerId) => {
        if (!m || !m.t) return;

        // --- Mensagens do Host ---
        if (GB.Net.isHost) {
          if (m.t === 'join_req') {
            this.handlePlayerJoinRequest(m, fromPeerId);
            return;
          }
          if (m.t === 'room_act') {
            this.handlePlayerRoomAction(m, fromPeerId);
            return;
          }
          if (m.t === 'chat') {
            this.addChatMsg(m.sender, m.team, m.msg);
            GB.Net.broadcast({ t: 'chat', sender: m.sender, team: m.team, msg: m.msg });
            return;
          }
        }

        // --- Mensagens do Convidado ---
        if (m.t === 'room_state') {
          if (this._cancelJoinWatchdog) this._cancelJoinWatchdog();
          this.room = m.room;
          // Identifica qual é o meu slot
          const mySlot = this.room.slots.find(s => s && s.id === GB.Net.myId);
          if (mySlot) this.mySlotIdx = mySlot.slotIdx;
          this.showScreen('lobby');
          this.updateRoomLobbyUI();
          return;
        }

        if (m.t === 'chat') {
          this.addChatMsg(m.sender, m.team, m.msg);
          return;
        }

        if (m.t === 'start_match') {
          this.launchGame(m);
          return;
        }

        if (m.t === 'error_msg') {
          if (this._cancelJoinWatchdog) this._cancelJoinWatchdog();
          alert(m.msg || 'Erro na sala.');
          this.showScreen('online');
          return;
        }

        // Mensagens in-game (tiro, mira, sync)
        if (this.game && this.game.running) {
          this.game.onNetMessage(m);
        }
      };

      // Quando um jogador desconecta
      GB.Net.onPeerLeave = (peerId) => {
        if (GB.Net.isHost) {
          const slot = this.room.slots.find(s => s && s.id === peerId);
          if (slot) {
            this.addChatMsg('Sistema', -1, `${slot.name} saiu da sala.`);
            this.room.slots[slot.slotIdx] = null;
            GB.Net.broadcast({ t: 'room_state', room: this.room });
            this.updateRoomLobbyUI();
          }
          if (this.game && this.game.running) {
            const dcTank = this.game.tanks.find(t => (slot && t.playerIdx === slot.slotIdx) || (t.id === peerId));
            if (dcTank && dcTank.alive) {
              dcTank.alive = false;
              dcTank.hp = 0;
              this.game.toast(`${dcTank.name} desconectou.`);
              if (this.game.active === dcTank) {
                this.game.phase = 'settle';
                this.game.settleT = 0;
              }
            }
          }
        }
      };

      // Perda de conexão
      GB.Net.onClose = () => {
        if (this.game && this.game.running) {
          this.game.stop();
          alert('Conexão perdida com a sala.');
          this.showScreen('menu');
        } else if (this.screens.lobby.classList.contains('active')) {
          alert('A sala foi encerrada pelo host.');
          this.showScreen('menu');
        }
      };
    },

    // --- Tratamento de Entrada e Ações da Sala (Host) ---
    handlePlayerJoinRequest(m, peerId) {
      // Conta jogadores atuais em cada time (Time A: slots 0..3, Time B: slots 4..7)
      const teamACount = this.room.slots.slice(0, 4).filter(Boolean).length;
      const teamBCount = this.room.slots.slice(4, 8).filter(Boolean).length;
      const maxPerTeam = this.getMaxSlotsPerTeam();

      let assignedSlot = null;

      // Balanceamento inteligente:
      // Se Time B tem menos jogadores que Time A, prioriza Time B.
      // Caso contrário, prioriza Time A.
      const teamBOrder = [4, 5, 6, 7];
      const teamAOrder = [1, 2, 3]; // slot 0 é sempre do Host

      const firstChoice = (teamBCount < teamACount) ? teamBOrder : teamAOrder;
      const secondChoice = (teamBCount < teamACount) ? teamAOrder : teamBOrder;

      // 1. Tenta colocar no time prioritário dentro do limite do formato atual (ex: 2v2)
      for (const idx of firstChoice) {
        const teamSlot = idx < 4 ? idx : (idx - 4);
        if (!this.room.slots[idx] && teamSlot < maxPerTeam) {
          assignedSlot = idx;
          break;
        }
      }

      // 2. Se o time prioritário estiver cheio dentro do formato, tenta o outro time
      if (assignedSlot === null) {
        for (const idx of secondChoice) {
          const teamSlot = idx < 4 ? idx : (idx - 4);
          if (!this.room.slots[idx] && teamSlot < maxPerTeam) {
            assignedSlot = idx;
            break;
          }
        }
      }

      // 3. Se ambos estiverem cheios para o formato atual, procura qualquer vaga nos 8 slots e expande o formato
      if (assignedSlot === null) {
        for (const idx of [...firstChoice, ...secondChoice]) {
          if (!this.room.slots[idx]) {
            assignedSlot = idx;
            break;
          }
        }
      }

      if (assignedSlot === null) {
        // Sala totalmente cheia (máximo 8 jogadores)
        GB.Net.sendTo(peerId, { t: 'error_msg', msg: 'A sala está totalmente cheia (máximo 8 jogadores).' });
        return;
      }

      // Se o slot atribuído necessitar de um formato maior, expande automaticamente a capacidade da sala!
      const teamSlot = assignedSlot < 4 ? assignedSlot : (assignedSlot - 4);
      if (teamSlot >= maxPerTeam) {
        if (teamSlot === 1) this.room.format = '2v2';
        else if (teamSlot === 2) this.room.format = '3v3';
        else if (teamSlot === 3) this.room.format = '4v4';
      }

      const newPlayer = {
        id: peerId,
        name: m.name || 'Jogador',
        team: assignedSlot < 4 ? 0 : 1,
        slotIdx: assignedSlot,
        mobile: m.mobile || 'armor',
        items: m.items || [],
        items2: m.items2 || null,
        ready: false,
        isHost: false,
        ping: 0
      };

      this.room.slots[assignedSlot] = newPlayer;
      // Garante envio direto ao novo jogador para ele entrar na sala sem atraso:
      GB.Net.sendTo(peerId, { t: 'room_state', room: this.room });
      // E sincroniza com todos os outros convidados conectados:
      GB.Net.broadcast({ t: 'room_state', room: this.room });
      this.addChatMsg('Sistema', -1, `${newPlayer.name} entrou na sala! (Time ${newPlayer.team === 0 ? 'A' : 'B'})`);
      this.updateRoomLobbyUI();
    },

    handlePlayerRoomAction(m, peerId) {
      const slot = this.room.slots.find(s => s && s.id === peerId);
      if (!slot) return;

      if (m.act === 'mobile') {
        slot.mobile = m.mobile;
      } else if (m.act === 'items') {
        slot.items = m.items || [];
        slot.items2 = m.items2 || null;
      } else if (m.act === 'ready') {
        slot.ready = !!m.ready;
      } else if (m.act === 'rename') {
        slot.name = m.name || slot.name;
      } else if (m.act === 'move_slot') {
        const tgt = m.targetSlot;
        if (tgt >= 0 && tgt < 8 && !this.room.slots[tgt]) {
          const teamSlot = tgt < 4 ? tgt : (tgt - 4);
          const curMax = this.getMaxSlotsPerTeam();
          if (teamSlot >= curMax) {
            if (teamSlot === 1) this.room.format = '2v2';
            else if (teamSlot === 2) this.room.format = '3v3';
            else if (teamSlot === 3) this.room.format = '4v4';
          }
          this.room.slots[slot.slotIdx] = null;
          slot.slotIdx = tgt;
          slot.team = tgt < 4 ? 0 : 1;
          this.room.slots[tgt] = slot;
        }
      }

      GB.Net.broadcast({ t: 'room_state', room: this.room });
      this.updateRoomLobbyUI();
    },

    // --- Ações Locais do Jogador ---
    getMaxSlotsPerTeam() {
      const f = this.room.format || '4v4';
      if (f === '1v1') return 1;
      if (f === '2v2') return 2;
      if (f === '3v3') return 3;
      return 4;
    },

    moveMySlot(targetSlot) {
      const myP = this.room.slots[this.mySlotIdx];
      if (!myP) return;
      if (myP.slotIdx === targetSlot) return;

      if (targetSlot < 0 || targetSlot >= 8 || this.room.slots[targetSlot]) return;

      const teamSlot = targetSlot < 4 ? targetSlot : (targetSlot - 4);
      const curMax = this.getMaxSlotsPerTeam();
      if (teamSlot >= curMax) {
        if (teamSlot === 1) this.room.format = '2v2';
        else if (teamSlot === 2) this.room.format = '3v3';
        else if (teamSlot === 3) this.room.format = '4v4';
      }

      if (this.setup.mode === 'online' && !GB.Net.isHost) {
        GB.Net.send({ t: 'room_act', act: 'move_slot', targetSlot });
      } else {
        this.room.slots[this.mySlotIdx] = null;
        myP.slotIdx = targetSlot;
        myP.team = targetSlot < 4 ? 0 : 1;
        this.room.slots[targetSlot] = myP;
        this.mySlotIdx = targetSlot;
        if (this.setup.mode === 'online' && GB.Net.isHost) {
          GB.Net.broadcast({ t: 'room_state', room: this.room });
        }
        this.updateRoomLobbyUI();
      }
    },

    switchMyTeam() {
      const myP = this.room.slots[this.mySlotIdx];
      if (!myP) return;

      const isCurrentTeamA = this.mySlotIdx < 4;
      const targetTeamSlots = isCurrentTeamA ? [4, 5, 6, 7] : [0, 1, 2, 3];

      for (const s of targetTeamSlots) {
        if (!this.room.slots[s]) {
          this.moveMySlot(s);
          return;
        }
      }
      this.game.toast('O outro time está sem vagas no momento!');
    },

    changeMyMobile(mobileId) {
      const myP = this.room.slots[this.mySlotIdx];
      if (!myP) return;
      myP.mobile = mobileId;

      if (this.setup.mode === 'online') {
        if (GB.Net.isHost) GB.Net.broadcast({ t: 'room_state', room: this.room });
        else GB.Net.send({ t: 'room_act', act: 'mobile', mobile: mobileId });
      }
      this.updateRoomLobbyUI();
    },

    equipItem(item, isItem2) {
      const myP = this.room.slots[this.mySlotIdx];
      if (!myP) return;

      if (isItem2) {
        myP.items2 = item;
      } else {
        if (!myP.items) myP.items = [];
        if (myP.items.length < 3) myP.items.push(item);
        else return;
      }

      if (this.setup.mode === 'online') {
        if (GB.Net.isHost) GB.Net.broadcast({ t: 'room_state', room: this.room });
        else GB.Net.send({ t: 'room_act', act: 'items', items: myP.items, items2: myP.items2 });
      }
      this.updateRoomLobbyUI();
    },

    unequipItem(slotIdx) {
      const myP = this.room.slots[this.mySlotIdx];
      if (!myP) return;

      if (slotIdx === 3) {
        myP.items2 = null;
      } else {
        if (myP.items && myP.items[slotIdx]) {
          myP.items.splice(slotIdx, 1);
        }
      }

      if (this.setup.mode === 'online') {
        if (GB.Net.isHost) GB.Net.broadcast({ t: 'room_state', room: this.room });
        else GB.Net.send({ t: 'room_act', act: 'items', items: myP.items, items2: myP.items2 });
      }
      this.updateRoomLobbyUI();
    },

    toggleMyReady() {
      const myP = this.room.slots[this.mySlotIdx];
      if (!myP) return;
      myP.ready = !myP.ready;

      if (this.setup.mode === 'online') {
        GB.Net.send({ t: 'room_act', act: 'ready', ready: myP.ready });
      }
      this.updateRoomLobbyUI();
    },

    // --- Início da Partida ---
    tryStartGame() {
      const teamA = this.room.slots.slice(0, 4).filter(Boolean);
      const teamB = this.room.slots.slice(4, 8).filter(Boolean);

      if (!teamA.length) return this.game.toast('Time A (Vermelho) precisa de pelo menos 1 jogador!');
      if (!teamB.length) return this.game.toast('Time B (Azul) precisa de pelo menos 1 jogador!');

      if (this.setup.mode === 'online') {
        const notReady = [...teamA, ...teamB].filter(p => !p.isHost && !p.ready);
        if (notReady.length) {
          const names = notReady.map(p => p.name).join(', ');
          return this.game.toast(`Aguardando PRONTO de: ${names}`);
        }

        // Todos prontos! Monta os jogadores da partida
        const activePlayers = [...teamA, ...teamB];
        const seed = Math.floor(Math.random() * 100000);
        const wind = Math.floor(Math.random() * 25) - 12;
        const map = this.room.map || 'large';
        const mapW = (GB.MAPS[map] || GB.MAPS.large).w;
        const thorX = Math.round(100 + Math.random() * (mapW - 200));
        // Sorteio Cara ou Coroa: 0 = Time A (Vermelho), 1 = Time B (Azul)
        const startingTeam = Math.random() < 0.5 ? 0 : 1;

        const playersPayload = activePlayers.map(p => ({
          slotIdx: p.slotIdx,
          id: p.id,
          name: p.name,
          team: p.team,
          mobileId: p.mobile,
          items: [...(p.items || [])],
          items2: p.items2
        }));

        const matchConfig = {
          t: 'start_match',
          seed, wind, map, thorX, startingTeam,
          modeType: this.room.mode || 'single_life',
          players: playersPayload
        };

        GB.Net.send(matchConfig);
        this.launchGame({ ...matchConfig, isHost: true });
      } else {
        // Modo PvE ou Local
        const activePlayers = [...teamA, ...teamB];
        const seed = Math.floor(Math.random() * 100000);
        const wind = Math.floor(Math.random() * 25) - 12;
        const map = this.room.map || 'large';
        const mapW = (GB.MAPS[map] || GB.MAPS.large).w;
        const thorX = Math.round(100 + Math.random() * (mapW - 200));
        const startingTeam = Math.random() < 0.5 ? 0 : 1;

        const playersPayload = activePlayers.map(p => ({
          slotIdx: p.slotIdx,
          id: p.id,
          name: p.name,
          team: p.team,
          mobileId: p.mobile,
          items: [...(p.items || [])],
          items2: p.items2
        }));

        this.launchGame({
          seed, wind, map, thorX, startingTeam,
          modeType: this.room.mode || 'single_life',
          players: playersPayload,
          isHost: true
        });
      }
    },

    launchGame(cfg) {
      const myId = GB.Net.myId || 'host';
      const gamePlayers = cfg.players.map(p => {
        let kind = 'remote';
        if (this.setup.mode === 'online') {
          kind = (p.id === myId || (cfg.isHost && p.id === 'host')) ? 'human' : 'remote';
        } else if (this.setup.mode === 'pve') {
          kind = (p.slotIdx === 0) ? 'human' : 'cpu';
        } else {
          // Local (mesmo aparelho)
          kind = 'human';
        }

        return {
          name: p.name,
          team: p.team,
          color: p.team === 0 ? '#ff4444' : '#3b82f6',
          mobileId: p.mobileId,
          items: p.items || [],
          items2: p.items2 || null,
          slotIdx: p.slotIdx,
          kind: kind
        };
      });

      this.hideScreens();
      this.game.start({
        mode: this.setup.mode,
        modeType: cfg.modeType || this.room.mode || 'single_life',
        isHost: cfg.isHost,
        seed: cfg.seed,
        wind: cfg.wind,
        map: cfg.map,
        thorX: cfg.thorX,
        startingTeam: cfg.startingTeam,
        players: gamePlayers
      });
    },

    // --- Renderização da Interface da Sala ---
    updateRoomLobbyUI() {
      const maxPerTeam = this.getMaxSlotsPerTeam();
      const myP = this.room.slots[this.mySlotIdx] || { mobile: 'armor', items: [], items2: null, ready: false };

      // Renderiza os 8 slots (0..3 Time A, 4..7 Time B)
      for (let i = 0; i < 8; i++) {
        const isTeamA = i < 4;
        const teamSlot = isTeamA ? i : (i - 4);
        const isActiveInFormat = teamSlot < maxPerTeam;
        const el = $('gb-slot-' + i);
        if (!el) continue;

        if (!isActiveInFormat) {
          el.className = 'gb-slot ' + (isTeamA ? 'team-a-slot' : 'team-b-slot');
          el.innerHTML = '<div class="gb-slot-locked">FECHADO</div>';
          continue;
        }

        const p = this.room.slots[i];
        if (!p) {
          el.className = 'gb-slot ' + (isTeamA ? 'team-a-slot' : 'team-b-slot');
          el.innerHTML = `<div class="gb-slot-empty"><button class="gb-btn-join-slot" data-slot="${i}">+ ENTRAR NO TIME ${isTeamA ? 'A' : 'B'}</button></div>`;
          continue;
        }

        // Slot Ocupado
        const isMe = (i === this.mySlotIdx);
        const pingMs = p.isHost ? '0ms' : ((GB.Net.pings[p.id] || p.ping || 24) + 'ms');
        const badgeHtml = p.isHost
          ? '<span class="gb-slot-badge host">HOST</span>'
          : (p.ready ? '<span class="gb-slot-badge ready">PRONTO</span>' : '<span class="gb-slot-badge waiting">AGUARDANDO</span>');

        el.className = 'gb-slot ' + (isTeamA ? 'team-a-slot' : 'team-b-slot');
        el.innerHTML = `
          <div class="gb-slot-inner occupied">
            <div class="gb-slot-canvas-wrap">
              <canvas id="gb-slot-c-${i}" width="68" height="48"></canvas>
            </div>
            <div class="gb-slot-details">
              <div class="gb-slot-name-row">
                ${p.isHost ? '<span class="gb-slot-crown">👑</span>' : ''}
                <span class="gb-slot-name">${p.name}</span>
                ${isMe ? '<span class="gb-slot-me">(Você)</span>' : ''}
              </div>
              <div class="gb-slot-subline">
                <span class="gb-slot-mob">${(GB.MOBILES[p.mobile] || {}).name || p.mobile}</span>
                <span class="gb-slot-ping">${pingMs}</span>
              </div>
            </div>
            <div class="gb-slot-status">${badgeHtml}</div>
          </div>
        `;

        const cv = $(`gb-slot-c-${i}`);
        if (cv) GB.drawMobilePreview(cv, p.mobile);
      }

      // Contadores de Equipe
      const teamACount = this.room.slots.slice(0, 4).filter(Boolean).length;
      const teamBCount = this.room.slots.slice(4, 8).filter(Boolean).length;
      $('team-a-count').textContent = `${teamACount}/${maxPerTeam}`;
      $('team-b-count').textContent = `${teamBCount}/${maxPerTeam}`;

      // Informações do Cabeçalho
      $('gb-room-code').textContent = this.room.code;
      $('gb-opt-mode').value = this.room.mode || 'single_life';
      $('gb-opt-mode').disabled = !GB.Net.isHost && this.setup.mode === 'online';
      $('gb-opt-format').value = this.room.format || '4v4';
      $('gb-opt-format').disabled = !GB.Net.isHost && this.setup.mode === 'online';
      $('gb-opt-map').value = this.room.map || 'large';
      $('gb-opt-map').disabled = !GB.Net.isHost && this.setup.mode === 'online';

      const hasKuda = this.room.slots.some(s => s && s.mobile === 'kuda');
      $('gb-weather-thor').classList.toggle('active', hasKuda);

      // Botão START / READY Central
      const startBtn = $('lobby-start');
      const startLbl = $('gb-start-label');
      if (GB.Net.isHost || this.setup.mode !== 'online') {
        startLbl.textContent = 'START';
        startBtn.classList.remove('is-ready');
      } else {
        startLbl.textContent = myP.ready ? 'CANCELAR' : 'PRONTO';
        startBtn.classList.toggle('is-ready', !!myP.ready);
      }

      // Sidebar: Status do Mobile do Jogador Local
      const mob = GB.MOBILES[myP.mobile] || GB.MOBILES.armor;
      $('gb-side-mob-name').textContent = mob.name;
      GB.drawMobilePreview($('gb-side-canvas'), myP.mobile);

      $('stat-atk').style.width = Math.round((mob.stats.Dano || 0.7) * 100) + '%';
      $('stat-def').style.width = Math.round((mob.stats.Destruição || 0.5) * 100) + '%';
      $('stat-hp').style.width = Math.round((mob.stats.HP || 0.6) * 100) + '%';
      $('stat-spd').style.width = Math.round((mob.stats.Mobilidade || 0.6) * 100) + '%';

      // Sidebar: Itens Equipados
      const eqContainer = $('gb-equipped-items');
      for (let k = 0; k < 3; k++) {
        const slot = eqContainer.children[k];
        const it = myP.items ? myP.items[k] : null;
        if (it) {
          slot.innerHTML = GB.itemLabelHTML(it);
          slot.classList.add('filled');
        } else {
          slot.innerHTML = '';
          slot.classList.remove('filled');
        }
      }

      const slot2 = eqContainer.children[3];
      if (myP.items2) {
        slot2.innerHTML = GB.itemLabelHTML(myP.items2);
        slot2.classList.add('filled', 'i2');
      } else {
        slot2.innerHTML = '';
        slot2.classList.remove('filled', 'i2');
      }
    },

    addChatMsg(sender, team, text) {
      const log = $('lobby-chat');
      if (!log) return;
      const div = document.createElement('div');
      let tagHtml = '';
      if (team === 0) tagHtml = '<b class="gb-chat-tag-team-a">[TIME A]</b> ';
      else if (team === 1) tagHtml = '<b class="gb-chat-tag-team-b">[TIME B]</b> ';
      else tagHtml = '<b class="gb-chat-tag-sys">[SISTEMA]</b> ';

      div.innerHTML = `${tagHtml}<b>${sender}:</b> ${text}`;
      log.appendChild(div);
      log.scrollTop = log.scrollHeight;
    },

    showPass(name, color, cb) {
      $('pass-title').textContent = 'Vez de ' + name;
      $('pass-title').style.color = color;
      this._onPassOk = cb;
      this.showScreen('pass');
    },

    gameOver(winnerTeam, game) {
      const t = $('res-title');
      const s = $('res-sub');
      t.classList.remove('lose');
      if (winnerTeam < 0) {
        t.textContent = 'Empate!';
        s.textContent = 'Todos os tanques foram destruídos.';
        t.classList.add('lose');
      } else {
        const teamName = winnerTeam === 0 ? 'Time A (Vermelho)' : 'Time B (Azul)';
        const teamColor = winnerTeam === 0 ? '#ff4444' : '#3b82f6';
        const myTank = game.tanks.find(tk => tk.kind === 'human');
        const won = myTank ? myTank.team === winnerTeam : false;

        t.textContent = `${teamName} Venceu!`;
        t.style.color = teamColor;
        s.textContent = won ? 'Vitória da sua equipe! Excelente mira!' : 'Derrota da sua equipe... Mais sorte na próxima!';
        if (!won) t.classList.add('lose');
        GB.Sfx[won ? 'win' : 'lose']();
      }
      this.showScreen('result');
    }
  };

  GB.UI = UI;
  window.addEventListener('load', () => UI.init());
})(window.GB);
