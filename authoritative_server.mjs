#!/usr/bin/env node
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { stat, realpath } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';

const MARKER = 'ring-out-v2';
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8787);
const STATIC_ROOT = resolve(process.env.STATIC_ROOT || join(dirname(fileURLToPath(import.meta.url)), '../dist'));
// Phase deadlines and seat expiry only. There is no physics tick: each client moves its own ball.
const HOUSEKEEPING_HZ = 20;
const RECONNECT_GRACE_MS = 60_000;
const ROOM_IDLE_MS = 10 * 60_000;

// Gameplay rules. The server owns these numbers and sends them in `welcome.rules`; every client
// runs the same movement and contact code with them (src/game/localBall.ts).
const ARENA_RADIUS = 10;
const BALL_RADIUS = 0.8;
const ACCEL = 16;
const DAMPING = 1.1;
const MAX_SPEED = 9;
const RESTITUTION = 0.95;
const SPAWN_DISTANCE = 4;
const WIN_SCORE = 3;
const COUNTDOWN_MS = 3000;
const POINT_MS = 1500;
const ENDED_MS = 5000;
const MIN_PLAYERS = 2;
const SEATS = ['p1', 'p2', 'p3', 'p4'];
// Opposite pairs first: two players face each other, four sit on a cross.
const SPAWN = {
  p1: { x: 0, z: SPAWN_DISTANCE }, p2: { x: 0, z: -SPAWN_DISTANCE },
  p3: { x: SPAWN_DISTANCE, z: 0 }, p4: { x: -SPAWN_DISTANCE, z: 0 },
};
// Relay bounds: loose enough for a full-speed bump and a ball leaving the edge, tight enough to
// drop garbage. They are not a cheat check; clients report their own ball (README: trust model).
const POSE_POSITION_LIMIT = ARENA_RADIUS + 4;
const POSE_SPEED_LIMIT = MAX_SPEED * 2;
// A contact impulse is at most (1 + RESTITUTION) * closing / 2 with closing up to 2 * MAX_SPEED.
const HIT_IMPULSE_LIMIT = MAX_SPEED * 2;
const MAX_LATENCY_MS = 1000;
const MAX_MESSAGES_PER_SECOND = 90;
// A playing seat that sends no pose for this long is out of the round (a hidden tab stops sending
// but keeps its socket), so a round always ends.
const SILENT_MS = 3000;
// When at most one ball is left, wait this long before scoring: a near-simultaneous fall is no point.
const RING_OUT_GRACE_MS = 250;
// A hit is relayed only when the two balls' last poses are within reach of each other, and at most
// once per pair in this interval (clients send one per pair per `HIT_WINDOW`, at least 250 ms).
const HIT_REACH_SLACK = 1;
const HIT_MIN_INTERVAL_MS = 150;

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.ttf', 'font/ttf'],
  ['.woff2', 'font/woff2'],
  ['.glb', 'model/gltf-binary'],
  ['.ogg', 'audio/ogg'],
  ['.mp3', 'audio/mpeg'],
  ['.wav', 'audio/wav'],
]);

const rooms = new Map();
const MAX_ROOMS = 128;
const MAX_CLIENTS = 256;
const MAX_SPECTATORS = 8;
const MAX_BUFFERED_BYTES = 64 * 1024;
const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean));
if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) throw new Error('Invalid PORT');

function cleanRoomCode(value) {
  const code = String(value || '').toUpperCase();
  return /^[A-Z0-9]{4,8}$/.test(code) ? code : '';
}

function token() {
  return randomBytes(18).toString('base64url');
}

function sendText(ws, text) {
  if (ws.bufferedAmount > MAX_BUFFERED_BYTES) { ws.terminate(); return; }
  if (ws.readyState === WebSocket.OPEN) ws.send(text);
}

function send(ws, payload) {
  sendText(ws, JSON.stringify(payload));
}

function emptySeat() {
  // `playing`: took part when the current round went live. `out`: left the arena or the room this round.
  // `poseAt`: when the last pose arrived (or the round went live). `hitAt`: last relayed hit per target.
  return { token: '', socket: null, disconnectedAt: 0, score: 0, playing: false, out: false, poseSeq: 0, pose: null, poseAt: 0, hitAt: {} };
}

const finite = value => typeof value === 'number' && Number.isFinite(value);

/**
 * One room: seats, phases, scores and the ring-out referee. Clients simulate and draw their own
 * balls; the room forwards each owner's pose to everyone else at once and only decides outcomes.
 */
class Room {
  constructor(code) {
    this.code = code;
    this.lastActivity = Date.now();
    this.seq = 0;
    this.round = 0;
    this.event = { seq: 0, kind: '', seat: '' };
    this.winner = '';
    this.phase = 'waiting';
    this.phaseEndsAt = 0;
    // While live: when the last ball standing scores, unless it also falls first.
    this.settleAt = 0;
    this.seats = Object.fromEntries(SEATS.map(side => [side, emptySeat()]));
    this.observers = new Set();
  }

  connected(side) {
    return this.seats[side].socket?.readyState === WebSocket.OPEN;
  }

  connectedSeats() {
    return SEATS.filter(side => this.connected(side));
  }

  alive() {
    return SEATS.filter(side => this.seats[side].playing && !this.seats[side].out && this.connected(side));
  }

  attach(ws, side) {
    Object.assign(this.seats[side], { socket: ws, disconnectedAt: 0, poseSeq: 0 });
  }

  claim(ws, resumeToken) {
    this.lastActivity = Date.now();
    let role = 'spectator';
    let resumedMidRound = false;
    for (const side of SEATS) {
      const seat = this.seats[side];
      if (resumeToken && seat.token === resumeToken && (!seat.disconnectedAt || Date.now() - seat.disconnectedAt <= RECONNECT_GRACE_MS)) {
        if (seat.socket && seat.socket !== ws && seat.socket.readyState === WebSocket.OPEN) {
          seat.socket.close(4001, 'seat resumed elsewhere');
        }
        // A seat that comes back mid-round is out of it, like one that left: the new page cannot
        // restore its ball, and a spawn pose would move it.
        if (this.phase === 'live' && seat.playing && !seat.out) {
          seat.out = true;
          resumedMidRound = true;
        }
        role = side;
        this.attach(ws, side);
        break;
      }
    }
    if (role === 'spectator') {
      for (const side of SEATS) {
        if (!this.seats[side].token) {
          role = side;
          // A new player starts at 0 and joins at the next round that goes live.
          Object.assign(this.seats[side], { token: token(), score: 0, playing: false, out: false, pose: null });
          this.attach(ws, side);
          break;
        }
      }
    }
    if (role === 'spectator') {
      if (this.observers.size >= MAX_SPECTATORS) { ws.close(1013, 'room full'); return; }
      this.observers.add(ws);
    }
    ws.room = this;
    ws.role = role;
    const resume = role === 'spectator' ? '' : this.seats[role].token;
    send(ws, { type: 'welcome', marker: MARKER, room: this.code, role, resume_token: resume,
      rules: { arena_radius: ARENA_RADIUS, ball_radius: BALL_RADIUS, accel: ACCEL, damping: DAMPING, max_speed: MAX_SPEED, restitution: RESTITUTION, win_score: WIN_SCORE },
      spawn: SPAWN });
    if (resumedMidRound) this.checkRoundEnd(Date.now());
    this.tryStart(Date.now());
    this.broadcast();
    // A late joiner sees every ball still in play at once instead of waiting for its next pose.
    for (const side of SEATS) {
      const pose = this.seats[side].pose;
      if (pose && side !== role && this.seats[side].playing && !this.seats[side].out) send(ws, this.poseMessage(side, pose));
    }
  }

  release(ws) {
    this.lastActivity = Date.now();
    if (ws.role in this.seats) {
      const seat = this.seats[ws.role];
      if (seat.socket === ws) {
        Object.assign(seat, { socket: null, disconnectedAt: Date.now() });
        if (this.phase !== 'waiting' && this.connectedSeats().length < MIN_PLAYERS) {
          // Not enough players left: the round is void and nobody scores.
          this.setPhase('waiting', 0);
        } else if (this.phase === 'live' && seat.playing && !seat.out) {
          // A player who leaves mid-round is out of it, without a ring-out event.
          seat.out = true;
          this.checkRoundEnd(Date.now());
        }
      }
    } else {
      this.observers.delete(ws);
    }
    this.broadcast();
  }

  /** Relays an owner's pose and referees it. Returns nothing; invalid or stale poses are dropped. */
  pose(side, message) {
    const seat = this.seats[side];
    if (this.phase !== 'live' || !seat.playing || seat.out || message.round !== this.round) return;
    if (!Number.isSafeInteger(message.seq) || message.seq <= seat.poseSeq) return;
    const { x, z, vx, vz, lat } = message;
    if (![x, z, vx, vz].every(finite) || Math.hypot(x, z) > POSE_POSITION_LIMIT || Math.hypot(vx, vz) > POSE_SPEED_LIMIT) return;
    if (!Number.isSafeInteger(lat) || lat < 0 || lat > MAX_LATENCY_MS) return;
    seat.poseSeq = message.seq;
    seat.pose = { seq: message.seq, x, z, vx, vz, lat };
    seat.poseAt = Date.now();
    this.lastActivity = seat.poseAt;
    const text = JSON.stringify(this.poseMessage(side, seat.pose));
    for (const other of SEATS) {
      if (other !== side && this.connected(other)) sendText(this.seats[other].socket, text);
    }
    for (const socket of this.observers) sendText(socket, text);
    // Referee: the first reported pose outside the arena puts that ball out of the round.
    if (Math.hypot(x, z) > ARENA_RADIUS) {
      seat.out = true;
      this.emit('ringout', side);
      this.checkRoundEnd(Date.now());
    }
  }

  /**
   * Relays one contact to the owner of the ball that was hit: the client that detected the contact
   * applied its own half and sends the other half here. The server does not simulate it; it only
   * drops hits between balls that are out of reach of each other, and repeats within an interval.
   */
  hit(side, message) {
    const seat = this.seats[side];
    const target = message.to;
    if (this.phase !== 'live' || !seat.playing || seat.out || message.round !== this.round) return;
    if (!SEATS.includes(target) || target === side || !this.connected(target)) return;
    if (!this.seats[target].playing || this.seats[target].out) return;
    const { jx, jz } = message;
    if (![jx, jz].every(finite) || Math.hypot(jx, jz) > HIT_IMPULSE_LIMIT) return;
    const now = Date.now();
    if (!this.withinReach(side, target, now) || now - (seat.hitAt[target] || 0) < HIT_MIN_INTERVAL_MS) return;
    seat.hitAt[target] = now;
    send(this.seats[target].socket, { type: 'hit', marker: MARKER, room: this.code, seat: side, round: this.round, jx, jz });
  }

  /**
   * Whether two balls can touch now: their last poses (spawn before the first one) are at most two
   * radii apart, plus a slack and the distance each ball may have moved since its pose was taken.
   */
  withinReach(a, b, now) {
    const ball = side => {
      const seat = this.seats[side];
      const pose = seat.pose || { ...SPAWN[side], vx: 0, vz: 0, lat: 0 };
      const age = (Math.min(now - seat.poseAt, MAX_LATENCY_MS) + pose.lat) / 1000;
      return { ...pose, travel: Math.hypot(pose.vx, pose.vz) * age };
    };
    const from = ball(a), to = ball(b);
    return Math.hypot(from.x - to.x, from.z - to.z) <= 2 * BALL_RADIUS + HIT_REACH_SLACK + from.travel + to.travel;
  }

  poseMessage(side, pose) {
    return { type: 'pose', marker: MARKER, room: this.code, seat: side, round: this.round, ...pose };
  }

  setPhase(phase, durationMs, now = Date.now()) {
    this.phase = phase;
    this.phaseEndsAt = durationMs > 0 ? now + durationMs : 0;
    this.settleAt = 0;
    if (phase === 'waiting') {
      for (const side of SEATS) Object.assign(this.seats[side], { playing: false, out: false, pose: null });
    }
  }

  tryStart(now) {
    if (this.phase !== 'waiting' || this.connectedSeats().length < MIN_PLAYERS) return;
    if (this.winner) this.resetMatch();
    this.startRound(now);
  }

  resetMatch() {
    this.winner = '';
    for (const side of SEATS) this.seats[side].score = 0;
  }

  startRound(now) {
    this.round += 1;
    for (const side of SEATS) Object.assign(this.seats[side], { playing: false, out: false, pose: null, poseAt: 0, hitAt: {} });
    this.setPhase('countdown', COUNTDOWN_MS, now);
  }

  /**
   * Ends the round once at most one ball is left. The last ball standing takes the point after
   * `RING_OUT_GRACE_MS`; if it also goes out within that time, nobody scores.
   */
  checkRoundEnd(now) {
    if (this.phase !== 'live') return;
    const alive = this.alive();
    if (alive.length > 1) return;
    if (alive.length === 1) {
      if (!this.settleAt) this.settleAt = now + RING_OUT_GRACE_MS;
      if (now < this.settleAt) return;
    }
    const winner = alive[0] || '';
    if (winner) this.seats[winner].score += 1;
    if (winner && this.seats[winner].score >= WIN_SCORE) {
      this.winner = winner;
      this.setPhase('ended', ENDED_MS, now);
      this.emit('match', winner);
    } else {
      this.setPhase('point', POINT_MS, now);
      this.emit('point', winner);
    }
  }

  tick(now) {
    for (const side of SEATS) {
      const seat = this.seats[side];
      if (seat.token && seat.disconnectedAt && now - seat.disconnectedAt > RECONNECT_GRACE_MS) {
        seat.token = '';
        seat.disconnectedAt = 0;
        seat.score = 0;
      }
    }
    if (this.phase !== 'waiting' && this.connectedSeats().length < MIN_PLAYERS) {
      this.setPhase('waiting', 0, now);
      this.broadcast();
      return;
    }
    if (this.phase === 'live') {
      // A silent seat is out without a ring-out event, like one that left.
      const silent = this.alive().filter(side => now - this.seats[side].poseAt > SILENT_MS);
      for (const side of silent) this.seats[side].out = true;
      this.checkRoundEnd(now);
      if (silent.length && this.phase === 'live') this.broadcast();
      return;
    }
    if (!this.phaseEndsAt || now < this.phaseEndsAt) return;
    if (this.phase === 'countdown') {
      // Everyone seated when the round goes live plays it; later arrivals wait for the next one.
      for (const side of this.connectedSeats()) Object.assign(this.seats[side], { playing: true, poseAt: now });
      this.setPhase('live', 0, now);
      this.emit('round', '');
    } else {
      if (this.phase === 'ended') this.resetMatch();
      this.startRound(now);
      this.broadcast();
    }
  }

  emit(kind, seat) {
    this.event = { seq: this.event.seq + 1, kind, seat };
    this.broadcast();
  }

  snapshot() {
    this.seq += 1;
    const seats = {};
    for (const side of SEATS) {
      const seat = this.seats[side];
      seats[side] = { connected: this.connected(side), playing: seat.playing, out: seat.out, score: seat.score };
    }
    return {
      type: 'room', marker: MARKER, room: this.code, seq: this.seq, round: this.round,
      phase: this.phase,
      phase_ends_in_ms: this.phaseEndsAt ? Math.max(0, this.phaseEndsAt - Date.now()) : 0,
      seats,
      winner: this.winner,
      event: { ...this.event },
    };
  }

  /** Room state goes out only when it changes; poses carry all movement. */
  broadcast() {
    const text = JSON.stringify(this.snapshot());
    for (const side of SEATS) {
      if (this.connected(side)) sendText(this.seats[side].socket, text);
    }
    for (const socket of this.observers) {
      if (socket.readyState === WebSocket.OPEN) sendText(socket, text);
      else this.observers.delete(socket);
    }
  }
}

function roomFor(code) {
  if (!rooms.has(code)) rooms.set(code, new Room(code));
  return rooms.get(code);
}

const httpServer = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    if (url.pathname === '/healthz') {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ ok: true, marker: MARKER, rooms: rooms.size, uptime: process.uptime() }));
      return;
    }
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const relative = normalize(pathname).replace(/^([/\\])+/, '');
    const filePath = resolve(STATIC_ROOT, relative);
    if (!filePath.startsWith(STATIC_ROOT + '/') && filePath !== STATIC_ROOT) throw new Error('invalid path');
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not a file');
    const physicalRoot = await realpath(STATIC_ROOT);
    const physicalFile = await realpath(filePath);
    if (!physicalFile.startsWith(physicalRoot + '/') || relative.split('/').some(part => part.startsWith('.'))) throw new Error('invalid path');
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    response.writeHead(200, {
      'content-type': MIME.get(extname(filePath).toLowerCase()) || 'application/octet-stream',
      'cache-control': filePath.endsWith('index.html') || filePath.endsWith('bootstrap.json') ? 'no-store' : 'public, max-age=3600',
      'x-content-type-options': 'nosniff',
      'content-length': info.size,
    });
    if (request.method === 'HEAD') response.end();
    else await pipeline(createReadStream(physicalFile), response);
  } catch {
    if (response.headersSent) { response.destroy(); return; }
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
});

const websocketServer = new WebSocketServer({ noServer: true, maxPayload: 4096 });
httpServer.on('upgrade', (request, socket, head) => {
  let url;
  try { url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`); }
  catch { socket.destroy(); return; }
  const origin = request.headers.origin;
  let sameOrigin = false;
  try { sameOrigin = Boolean(origin) && ['http:', 'https:'].includes(new URL(origin).protocol) && new URL(origin).host === request.headers.host; } catch {}
  if (websocketServer.clients.size >= MAX_CLIENTS || (origin && !sameOrigin && !allowedOrigins.has(origin))) { socket.destroy(); return; }
  if (url.pathname !== '/ws') {
    socket.destroy();
    return;
  }
  const roomCode = cleanRoomCode(url.searchParams.get('room'));
  if (!roomCode || (!rooms.has(roomCode) && rooms.size >= MAX_ROOMS)) {
    socket.destroy();
    return;
  }
  websocketServer.handleUpgrade(request, socket, head, ws => {
    websocketServer.emit('connection', ws, request, roomCode, url.searchParams.get('resume') || '');
  });
});


websocketServer.on('connection', (ws, _request, roomCode, resumeToken) => {
  const room = roomFor(roomCode);
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });
  let messageWindow = Date.now();
  let messageCount = 0;
  room.claim(ws, resumeToken);
  ws.on('message', data => {
    try {
      if (Date.now() - messageWindow >= 1000) { messageWindow = Date.now(); messageCount = 0; }
      if (++messageCount > MAX_MESSAGES_PER_SECOND) { ws.close(1008, 'message rate exceeded'); return; }
      const message = JSON.parse(data.toString());
      if (message?.type === 'pose' && room.seats[ws.role]?.socket === ws) room.pose(ws.role, message);
      else if (message?.type === 'hit' && room.seats[ws.role]?.socket === ws) room.hit(ws.role, message);
      // Clients measure their latency with this echo; it also keeps their idle timer fed.
      else if (message?.type === 'ping' && Number.isSafeInteger(message.t) && message.t >= 0) send(ws, { type: 'pong', marker: MARKER, room: room.code, t: message.t });
    } catch {
      send(ws, { type: 'error', marker: MARKER, room: room.code, code: 'invalid_message' });
    }
  });
  ws.on('close', () => room.release(ws));
  ws.on('error', () => room.release(ws));
});

setInterval(() => {
  for (const ws of websocketServer.clients) {
    if (!ws.alive) { ws.terminate(); continue; }
    ws.alive = false;
    ws.ping();
  }
}, 15_000).unref();

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    room.tick(now);
    const hasSockets = room.connectedSeats().length > 0 || room.observers.size > 0;
    if (!hasSockets && now - room.lastActivity > ROOM_IDLE_MS) rooms.delete(code);
  }
}, 1000 / HOUSEKEEPING_HZ).unref();

httpServer.listen(PORT, HOST, () => {
  console.log(JSON.stringify({ marker: MARKER, status: 'listening', host: HOST, port: httpServer.address().port, staticRoot: STATIC_ROOT }));
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const room of rooms.values()) {
      for (const side of SEATS) room.seats[side].socket?.close(1012, 'server restart');
      for (const observer of room.observers) observer.close(1012, 'server restart');
    }
    httpServer.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 3000).unref();
  });
}
