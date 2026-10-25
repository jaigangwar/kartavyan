import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 8787);
const rooms = new Map();

function send(socket, message) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

function roomFor(name) {
  if (!rooms.has(name)) rooms.set(name, new Set());
  return rooms.get(name);
}

function broadcast(room, sender, message) {
  for (const peer of room) {
    if (peer !== sender && peer.readyState === peer.OPEN) send(peer, message);
  }
}

const server = http.createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true, service: 'KARTAVYA RELAY', rooms: rooms.size }));
    return;
  }
  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'not_found' }));
});

const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '/', `http://${request.headers.host}`);
  if (url.pathname !== '/ws') {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(request, socket, head, (client) => wss.emit('connection', client, request, url));
});

wss.on('connection', (socket, request, url) => {
  const roomName = url.searchParams.get('room') || 'KV-DEMO';
  const token = url.searchParams.get('token') || process.env.KARTAVYA_TOKEN || 'KV-902A';
  const expected = process.env.KARTAVYA_TOKEN || 'KV-902A';
  if (token !== expected) {
    send(socket, { action: 'error', payload: { code: 'TOKEN_REJECTED' }, id: randomUUID(), ts: Date.now(), token: expected });
    socket.close(1008, 'invalid token');
    return;
  }

  const room = roomFor(roomName);
  socket.roomName = roomName;
  room.add(socket);
  send(socket, { action: 'relay.joined', payload: { room: roomName, peers: room.size - 1 }, id: randomUUID(), ts: Date.now(), token: expected });
  broadcast(room, socket, { action: 'relay.peer_joined', payload: { room: roomName }, id: randomUUID(), ts: Date.now(), token: expected });

  socket.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());
      broadcast(room, socket, { ...message, relay: true, source: socket.id });
    } catch {
      send(socket, { action: 'error', payload: { code: 'INVALID_JSON' }, id: randomUUID(), ts: Date.now(), token: expected });
    }
  });

  socket.on('close', () => {
    room.delete(socket);
    broadcast(room, socket, { action: 'relay.peer_left', payload: { room: roomName }, id: randomUUID(), ts: Date.now(), token: expected });
    if (!room.size) rooms.delete(roomName);
  });
});

const heartbeatInterval = setInterval(() => {
  for (const room of rooms.values()) {
    for (const socket of room) {
      if (socket.isAlive === false) {
        socket.terminate();
        continue;
      }
      socket.isAlive = false;
      socket.ping();
    }
  }
}, 30_000);

function shutdown(signal) {
  console.log(`KARTAVYA RELAY ${signal} // graceful shutdown`);
  clearInterval(heartbeatInterval);
  for (const room of rooms.values()) {
    for (const socket of room) socket.close(1001, 'server shutdown');
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 25_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

wss.on('connection', (socket) => {
  socket.id = randomUUID();
  socket.isAlive = true;
  socket.on('pong', () => { socket.isAlive = true; });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`KARTAVYA RELAY listening on :${PORT}`);
});
