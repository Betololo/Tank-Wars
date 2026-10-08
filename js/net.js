/* Rede online de alta performance para Mini GunBound (1v1 até 4v4).
   Utiliza WebSocket nativo com o servidor dedicado / Cloudflare Tunnel para latência instantânea (<20ms)
   e conexão garantida para até 8 jogadores simultâneos, sem travas de NAT/STUN/TURN.
   Possui fallback automático para PeerJS caso esteja rodando offline via arquivo local. */
(function (GB) {
  'use strict';

  const PREFIX = 'minigunbound-v1-';
  const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  const PEER_CONFIG = {
    debug: 0,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' }
      ]
    }
  };

  const Net = {
    ws: null,
    mode: 'ws',          // 'ws' ou 'peerjs'
    peer: null,          // Fallback PeerJS
    conns: [],           // Host: lista de conexões [{ peer, open, send }]
    clientConn: null,    // Fallback PeerJS Convidado
    isHost: false,
    code: null,
    myId: null,
    onMessage: null,     // (data, fromPeerId) => {}
    onClose: null,       // () => {}
    onPeerJoin: null,    // (peerId) => {}
    onPeerLeave: null,   // (peerId) => {}
    _pingInterval: null,
    pings: {},           // peerId -> ms

    available() {
      return typeof window.WebSocket === 'function' || typeof window.Peer === 'function';
    },

    randomCode() {
      let s = '';
      for (let i = 0; i < 4; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
      return s;
    },

    getWsUrl() {
      if (typeof window === 'undefined' || !window.location) return null;
      if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return null;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${window.location.host}/ws`;
    },

    // ==========================================
    // CRIAÇÃO DA SALA (HOST)
    // ==========================================
    host(cb) {
      this.close();
      this.isHost = true;
      this.conns = [];
      const code = this.randomCode();
      const wsUrl = this.getWsUrl();

      if (wsUrl) {
        this.mode = 'ws';
        let socket;
        try {
          socket = new WebSocket(wsUrl);
          this.ws = socket;
        } catch (e) {
          console.warn('[Net] Falha ao criar WebSocket, usando fallback PeerJS...', e);
          return this.hostPeerJS(code, cb);
        }

        let handled = false;
        const connTimer = setTimeout(() => {
          if (!handled && (!socket || socket.readyState !== WebSocket.OPEN)) {
            console.warn('[Net] Timeout WS Host, tentando fallback PeerJS...');
            this.hostPeerJS(code, cb);
          }
        }, 3000);

        socket.onopen = () => {
          handled = true;
          clearTimeout(connTimer);
          socket.send(JSON.stringify({ t: 'host_create', code }));
        };

        socket.onmessage = (evt) => {
          let msg;
          try { msg = JSON.parse(evt.data); } catch (e) { return; }
          if (!msg || !msg.t) return;

          if (msg.t === 'host_ok') {
            this.code = msg.code || code;
            this.myId = 'host';
            cb.onCode && cb.onCode(this.code);
            this.startPingLoop();
            return;
          }

          if (msg.t === 'host_err') {
            cb.onError && cb.onError(msg.msg || 'Erro ao criar sala.');
            return;
          }

          if (msg.t === 'client_connect') {
            const peerId = msg.peerId;
            const fakeConn = {
              peer: peerId,
              open: true,
              send: (m) => this.sendTo(peerId, m)
            };
            if (!this.conns.some(c => c.peer === peerId)) {
              this.conns.push(fakeConn);
            }
            if (cb.onClientConnect) cb.onClientConnect(fakeConn);
            if (this.onPeerJoin) this.onPeerJoin(peerId);
            return;
          }

          if (msg.t === 'client_leave') {
            const peerId = msg.peerId;
            this.conns = this.conns.filter(c => c.peer !== peerId);
            delete this.pings[peerId];
            if (this.onPeerLeave) this.onPeerLeave(peerId);
            return;
          }

          if (msg.t === 'data') {
            const fromId = msg.from;
            const payload = msg.data;
            if (payload && payload.t === 'pong') {
              this.pings[fromId] = Math.max(1, Date.now() - (payload.t0 || Date.now()));
              return;
            }
            if (this.onMessage) this.onMessage(payload, fromId);
            return;
          }
        };

        socket.onclose = () => {
          if (this.isHost) {
            this.close();
            if (this.onClose) this.onClose();
          }
        };

        socket.onerror = (err) => {
          if (!handled) {
            clearTimeout(connTimer);
            console.warn('[Net] WS Error, tentando fallback PeerJS...', err);
            this.hostPeerJS(code, cb);
          }
        };
      } else {
        this.hostPeerJS(code, cb);
      }
    },

    // ==========================================
    // ENTRADA NA SALA (CONVIDADO)
    // ==========================================
    join(code, cb) {
      this.close();
      this.isHost = false;
      this.conns = [];
      code = (code || '').toUpperCase().trim();
      const wsUrl = this.getWsUrl();

      if (wsUrl) {
        this.mode = 'ws';
        let socket;
        try {
          socket = new WebSocket(wsUrl);
          this.ws = socket;
        } catch (e) {
          console.warn('[Net] Falha no WebSocket do convidado, tentando fallback...', e);
          return this.joinPeerJS(code, cb);
        }

        let connected = false;
        const joinTimeout = setTimeout(() => {
          if (!connected) {
            cb.onError && cb.onError('Tempo de conexão esgotado. Verifique se o Host está online com a sala aberta e código correto.');
            this.close();
          }
        }, 8000);

        socket.onopen = () => {
          socket.send(JSON.stringify({ t: 'guest_join', code }));
        };

        socket.onmessage = (evt) => {
          let msg;
          try { msg = JSON.parse(evt.data); } catch (e) { return; }
          if (!msg || !msg.t) return;

          if (msg.t === 'join_ok') {
            connected = true;
            clearTimeout(joinTimeout);
            this.code = msg.code || code;
            this.myId = msg.myId;
            cb.onConnect && cb.onConnect();
            return;
          }

          if (msg.t === 'join_err') {
            clearTimeout(joinTimeout);
            cb.onError && cb.onError(msg.msg || 'Não foi possível entrar na sala.');
            this.close();
            return;
          }

          if (msg.t === 'host_left') {
            if (this.onClose) this.onClose();
            this.close();
            return;
          }

          if (msg.t === 'data') {
            const fromId = msg.from;
            const payload = msg.data;
            if (payload && payload.t === 'ping') {
              this.send({ t: 'pong', t0: payload.t0 });
              return;
            }
            if (this.onMessage) this.onMessage(payload, fromId);
            return;
          }
        };

        socket.onclose = () => {
          clearTimeout(joinTimeout);
          if (this.onClose) this.onClose();
          this.close();
        };

        socket.onerror = () => {
          if (!connected) {
            clearTimeout(joinTimeout);
            console.warn('[Net] Erro no WebSocket do Convidado, tentando fallback PeerJS...');
            this.joinPeerJS(code, cb);
          }
        };
      } else {
        this.joinPeerJS(code, cb);
      }
    },

    // ==========================================
    // ENVIO DE MENSAGENS (BROADCAST / DIRETO)
    // ==========================================
    send(msg) {
      if (this.mode === 'ws' && this.ws && this.ws.readyState === WebSocket.OPEN) {
        if (this.isHost) {
          this.ws.send(JSON.stringify({ t: 'broadcast', data: msg }));
        } else {
          this.ws.send(JSON.stringify({ t: 'to_host', data: msg }));
        }
        return;
      }

      // Fallback PeerJS
      if (this.isHost) {
        for (const c of this.conns) {
          if (c && c.open) {
            try { c.send(msg); } catch (e) {}
          }
        }
      } else if (this.clientConn && this.clientConn.open) {
        try { this.clientConn.send(msg); } catch (e) {}
      }
    },

    broadcast(msg, exceptPeerId) {
      if (this.mode === 'ws' && this.ws && this.ws.readyState === WebSocket.OPEN) {
        if (this.isHost) {
          this.ws.send(JSON.stringify({ t: 'broadcast', data: msg, except: exceptPeerId }));
        }
        return;
      }

      // Fallback PeerJS
      if (!this.isHost) return;
      for (const c of this.conns) {
        if (c && c.open && c.peer !== exceptPeerId) {
          try { c.send(msg); } catch (e) {}
        }
      }
    },

    sendTo(peerId, msg) {
      if (this.mode === 'ws' && this.ws && this.ws.readyState === WebSocket.OPEN) {
        if (this.isHost) {
          this.ws.send(JSON.stringify({ t: 'to_client', targetId: peerId, data: msg }));
        }
        return;
      }

      // Fallback PeerJS
      if (!this.isHost) return;
      const c = this.conns.find(conn => conn.peer === peerId);
      if (c && c.open) {
        try { c.send(msg); } catch (e) {}
      }
    },

    startPingLoop() {
      this.stopPingLoop();
      this._pingInterval = setInterval(() => {
        if (!this.isHost) return;
        const now = Date.now();
        if (this.mode === 'ws') {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.send({ t: 'ping', t0: now });
          }
        } else {
          for (const c of this.conns) {
            if (c && c.open) {
              try { c.send({ t: 'ping', t0: now }); } catch (e) {}
            }
          }
        }
      }, 2500);
    },

    stopPingLoop() {
      if (this._pingInterval) {
        clearInterval(this._pingInterval);
        this._pingInterval = null;
      }
    },

    connected() {
      if (this.mode === 'ws') {
        return !!(this.ws && this.ws.readyState === WebSocket.OPEN);
      }
      if (this.isHost) return !!(this.peer && !this.peer.destroyed);
      return !!(this.clientConn && this.clientConn.open);
    },

    close() {
      this.stopPingLoop();
      if (this.ws) {
        try { this.ws.close(); } catch (e) {}
        this.ws = null;
      }
      for (const c of this.conns) {
        try { if (c.close) c.close(); } catch (e) {}
      }
      this.conns = [];
      if (this.clientConn) {
        try { this.clientConn.close(); } catch (e) {}
        this.clientConn = null;
      }
      if (this.peer) {
        try { this.peer.destroy(); } catch (e) {}
        this.peer = null;
      }
      this.code = null;
      this.pings = {};
    },

    // ==========================================
    // FALLBACK PEERJS (Apenas se WebSocket offline)
    // ==========================================
    hostPeerJS(code, cb) {
      if (typeof window.Peer !== 'function') {
        cb.onError && cb.onError('PeerJS indisponível.');
        return;
      }
      this.mode = 'peerjs';
      const peer = new Peer(PREFIX + code, PEER_CONFIG);
      this.peer = peer;

      peer.on('open', (id) => {
        this.code = code;
        this.myId = id;
        cb.onCode && cb.onCode(code);
        this.startPingLoop();
      });

      peer.on('connection', (conn) => {
        if (this.conns.length >= 7 && !this.conns.some(c => c.peer === conn.peer)) {
          conn.on('open', () => {
            conn.send({ t: 'error_msg', msg: 'A sala está cheia (máximo 8 jogadores).' });
            setTimeout(() => conn.close(), 200);
          });
          return;
        }

        const addConn = () => {
          if (!this.conns.some(c => c.peer === conn.peer)) {
            this.conns.push(conn);
          } else {
            const idx = this.conns.findIndex(c => c.peer === conn.peer);
            if (idx >= 0) this.conns[idx] = conn;
          }
        };
        addConn();

        conn.on('open', () => {
          addConn();
          if (cb.onClientConnect) cb.onClientConnect(conn);
          if (this.onPeerJoin) this.onPeerJoin(conn.peer);
        });

        conn.on('data', (data) => {
          addConn();
          if (data && data.t === 'pong') {
            this.pings[conn.peer] = Math.max(1, Date.now() - (data.t0 || Date.now()));
            return;
          }
          if (this.onMessage) this.onMessage(data, conn.peer);
        });

        conn.on('close', () => {
          this.conns = this.conns.filter(c => c !== conn && c.peer !== conn.peer);
          delete this.pings[conn.peer];
          if (this.onPeerLeave) this.onPeerLeave(conn.peer);
        });

        conn.on('error', () => {
          this.conns = this.conns.filter(c => c !== conn);
          delete this.pings[conn.peer];
        });
      });

      peer.on('error', (err) => {
        if (err.type === 'unavailable-id') { this.hostPeerJS(this.randomCode(), cb); return; }
        cb.onError && cb.onError(this.describe(err));
      });
    },

    joinPeerJS(code, cb) {
      if (typeof window.Peer !== 'function') {
        cb.onError && cb.onError('PeerJS indisponível.');
        return;
      }
      this.mode = 'peerjs';
      const peer = new Peer(PEER_CONFIG);
      this.peer = peer;

      peer.on('open', (id) => {
        this.myId = id;
        this.code = code;
        const conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
        this.clientConn = conn;

        let opened = false;
        const connectTimeout = setTimeout(() => {
          if (!opened) {
            cb.onError && cb.onError('Tempo de conexão esgotado (10s). Verifique se o Host está online com a sala aberta.');
            this.close();
          }
        }, 10000);

        conn.on('open', () => {
          opened = true;
          clearTimeout(connectTimeout);
          cb.onConnect && cb.onConnect();
        });

        conn.on('data', (data) => {
          if (data && data.t === 'ping') {
            conn.send({ t: 'pong', t0: data.t0 });
            return;
          }
          if (this.onMessage) this.onMessage(data, conn.peer);
        });

        conn.on('close', () => {
          clearTimeout(connectTimeout);
          this.clientConn = null;
          if (this.onClose) this.onClose();
        });

        conn.on('error', (err) => {
          clearTimeout(connectTimeout);
          cb.onError && cb.onError(this.describe(err));
        });
      });

      peer.on('error', (err) => cb.onError && cb.onError(this.describe(err)));
    },

    describe(err) {
      switch (err && err.type) {
        case 'peer-unavailable': return 'Sala não encontrada. Verifique o código e tente novamente.';
        case 'network': case 'server-error': case 'socket-error': return 'Sem conexão com o servidor de salas. Verifique sua internet.';
        case 'browser-incompatible': return 'Seu navegador não tem suporte a WebRTC P2P.';
        default: return 'Erro de conexão (' + (err && err.type || 'desconhecido') + ').';
      }
    }
  };

  GB.Net = Net;
})(window.GB);
