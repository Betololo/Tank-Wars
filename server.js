const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg'
};

const server = http.createServer((req, res) => {
  const start = Date.now();
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.normalize(path.join(ROOT, reqPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    const acceptEncoding = req.headers['accept-encoding'] || '';

    const headers = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff'
    };

    const isCompressible = /^(text\/|application\/javascript|application\/json)/.test(contentType);

    if (isCompressible && /\bgzip\b/.test(acceptEncoding)) {
      headers['Content-Encoding'] = 'gzip';
      res.writeHead(200, headers);
      const raw = fs.createReadStream(filePath);
      const gz = zlib.createGzip();
      raw.pipe(gz).pipe(res);
    } else {
      headers['Content-Length'] = stats.size;
      res.writeHead(200, headers);
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  });
});

// ==========================================
// SERVIDOR WEBSOCKET PARA MULTIPLAYER (1v1 até 4v4)
// ==========================================
const rooms = new Map(); // roomCode -> { hostWs, clients: Map(clientId -> ws) }

const wss = new WebSocketServer({ server, path: '/ws' });

function safeSend(ws, obj) {
  if (ws && ws.readyState === 1) { // 1 = OPEN
    try {
      ws.send(JSON.stringify(obj));
    } catch (e) {
      console.error('[WS Send Error]', e.message);
    }
  }
}

let clientCounter = 1;

wss.on('connection', (ws, req) => {
  ws.id = 'p_' + (clientCounter++) + '_' + Math.random().toString(36).substring(2, 6);
  ws.roomCode = null;
  ws.isHost = false;
  ws.isAlive = true;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`[WS CONNECT] ${ws.id} IP=${ip}`);

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (msgRaw) => {
    let msg;
    try {
      msg = JSON.parse(msgRaw);
    } catch (e) {
      console.log(`[WS BAD JSON from ${ws.id}]:`, msgRaw.toString().slice(0, 100));
      return;
    }
    if (!msg || !msg.t) return;

    // 1. Host cria a sala
    if (msg.t === 'host_create') {
      const code = (msg.code || '').toUpperCase().trim();
      if (!code) {
        console.log(`[WS HOST ERR] ${ws.id} código vazio`);
        return safeSend(ws, { t: 'host_err', msg: 'Código inválido.' });
      }

      const existing = rooms.get(code);
      if (existing && existing.hostWs && existing.hostWs.readyState === 1 && existing.hostWs !== ws) {
        console.log(`[WS HOST ERR] ${ws.id} sala ${code} já em uso`);
        return safeSend(ws, { t: 'host_err', msg: 'Código já em uso.' });
      }

      ws.roomCode = code;
      ws.isHost = true;
      rooms.set(code, {
        hostWs: ws,
        clients: new Map()
      });

      console.log(`[WS] Sala ${code} criada pelo Host (${ws.id}). Salas ativas: [${[...rooms.keys()].join(', ')}]`);
      safeSend(ws, { t: 'host_ok', code: code, myId: 'host' });
      return;
    }

    // 2. Convidado entra na sala
    if (msg.t === 'guest_join') {
      const code = (msg.code || '').toUpperCase().trim();
      const room = rooms.get(code);
      if (!room || !room.hostWs || room.hostWs.readyState !== 1) {
        const activeRooms = [...rooms.keys()].join(', ') || 'nenhuma';
        console.log(`[WS JOIN FAILED] Jogador ${ws.id} tentou entrar na sala "${code}", mas não foi encontrada! Salas abertas: [${activeRooms}]`);
        return safeSend(ws, { t: 'join_err', msg: `Sala "${code}" não encontrada ou Host offline. Salas abertas no momento: ${activeRooms}.` });
      }

      if (room.clients.size >= 7) {
        console.log(`[WS JOIN CHEIA] Sala ${code} cheia!`);
        return safeSend(ws, { t: 'join_err', msg: 'A sala está cheia (máximo 8 jogadores).' });
      }

      ws.roomCode = code;
      ws.isHost = false;
      room.clients.set(ws.id, ws);

      console.log(`[WS] Jogador ${ws.id} CONECTOU na sala ${code} (Total de convidados: ${room.clients.size})`);
      safeSend(ws, { t: 'join_ok', code: code, myId: ws.id });

      // Notifica o Host sobre a nova conexão do jogador
      safeSend(room.hostWs, { t: 'client_connect', peerId: ws.id });
      return;
    }

    // 3. Convidado envia dados para o Host
    if (msg.t === 'to_host') {
      const room = rooms.get(ws.roomCode);
      if (room && room.hostWs && room.hostWs.readyState === 1) {
        console.log(`[WS TO_HOST] from=${ws.id} act=${msg.data && msg.data.t}`);
        safeSend(room.hostWs, { t: 'data', from: ws.id, data: msg.data });
      } else {
        console.log(`[WS TO_HOST FAILED] room ${ws.roomCode} não encontrada para ${ws.id}`);
      }
      return;
    }

    // 4. Host envia dados para um convidado específico
    if (msg.t === 'to_client') {
      const room = rooms.get(ws.roomCode);
      if (room && ws.isHost) {
        const clientWs = room.clients.get(msg.targetId);
        if (clientWs) {
          safeSend(clientWs, { t: 'data', from: 'host', data: msg.data });
        } else {
          console.log(`[WS TO_CLIENT FAILED] target ${msg.targetId} não encontrado na sala ${ws.roomCode}`);
        }
      }
      return;
    }

    // 5. Host envia dados para todos os convidados (Broadcast)
    if (msg.t === 'broadcast') {
      const room = rooms.get(ws.roomCode);
      if (room && ws.isHost) {
        for (const [clientId, clientWs] of room.clients.entries()) {
          if (clientId !== msg.except) {
            safeSend(clientWs, { t: 'data', from: 'host', data: msg.data });
          }
        }
      }
      return;
    }

    // 6. Ping / Pong
    if (msg.t === 'ping') {
      safeSend(ws, { t: 'pong', t0: msg.t0 });
      return;
    }
  });

  ws.on('close', (code, reason) => {
    console.log(`[WS CLOSE] ${ws.id} (room=${ws.roomCode || 'nenhuma'})`);
    if (ws.roomCode) {
      const room = rooms.get(ws.roomCode);
      if (room) {
        if (ws.isHost) {
          console.log(`[WS] Host da sala ${ws.roomCode} desconectou. Fechando sala.`);
          for (const clientWs of room.clients.values()) {
            safeSend(clientWs, { t: 'host_left', msg: 'A sala foi encerrada pelo Host.' });
            try { clientWs.close(); } catch (e) {}
          }
          rooms.delete(ws.roomCode);
        } else {
          console.log(`[WS] Jogador ${ws.id} desconectou da sala ${ws.roomCode}`);
          room.clients.delete(ws.id);
          if (room.hostWs && room.hostWs.readyState === 1) {
            safeSend(room.hostWs, { t: 'client_leave', peerId: ws.id });
          }
        }
      }
    }
  });

  ws.on('error', (err) => {
    console.error(`[WS Error ${ws.id}]`, err.message);
  });
});

// Heartbeat a cada 20s para manter conexões Cloudflare Tunnel ativas sem timeout
const heartbeat = setInterval(() => {
  for (const client of wss.clients) {
    if (!client.isAlive) {
      try { client.terminate(); } catch (e) {}
      continue;
    }
    client.isAlive = false;
    try { client.ping(); } catch (e) {}
  }
}, 20000);

wss.on('close', () => clearInterval(heartbeat));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Tank Wars Server + WebSocket Relay running on http://localhost:${PORT}`);
});
