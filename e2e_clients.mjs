#!/usr/bin/env node
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';

const MARKER = 'ring-out-v2';
const base = process.argv.slice(2).find(arg => arg !== '--') || process.env.RING_OUT_WS_URL || 'ws://127.0.0.1:8787/ws';
const room = (process.env.RING_OUT_TEST_ROOM || `E2E${Date.now().toString(36)}`).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-8).padStart(4, 'E');
const healthUrl = base.replace(/^ws/, 'http').replace(/\/ws(?:\?.*)?$/, '/healthz');

class Client {
  constructor(name, resume = '') {
    this.name = name;
    this.seq = 0;
    this.messages = [];
    this.waiters = [];
    const url = `${base}${base.includes('?') ? '&' : '?'}room=${room}${resume ? `&resume=${resume}` : ''}`;
    this.ws = new WebSocket(url);
    this.ws.on('message', data => {
      const message = JSON.parse(data.toString());
      this.messages.push(message);
      if (this.messages.length > 200) this.messages.shift();
      for (const waiter of [...this.waiters]) {
        if (waiter.predicate(message)) {
          clearTimeout(waiter.timer);
          this.waiters.splice(this.waiters.indexOf(waiter), 1);
          waiter.resolve(message);
        }
      }
    });
  }

  waitFor(predicate, timeout = 10_000) {
    const existing = [...this.messages].reverse().find(predicate);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, timer: null };
      waiter.timer = setTimeout(() => {
        this.waiters = this.waiters.filter(value => value !== waiter);
        reject(new Error(`${this.name} timed out waiting for message`));
      }, timeout);
      this.waiters.push(waiter);
    });
  }

  /** Publishes this client's own ball, as the browser client does about 30 times a second. */
  pose(round, x, z, vx = 0, vz = 0) {
    this.ws.send(JSON.stringify({ type: 'pose', seq: ++this.seq, round, x, z, vx, vz, lat: 20 }));
  }

  /** Moves the own ball in a straight line and publishes it, like a player rolling toward the edge. */
  async roll(round, from, velocity, ms) {
    const start = Date.now();
    while (Date.now() - start < ms) {
      const t = (Date.now() - start) / 1000;
      this.pose(round, from.x + velocity.x * t, from.z + velocity.z * t, velocity.x, velocity.z);
      await sleep(33);
    }
  }

  async close() {
    if (this.ws.readyState === WebSocket.CLOSED) return;
    await new Promise(resolve => {
      const timer = setTimeout(resolve, 1000);
      this.ws.once('close', () => { clearTimeout(timer); resolve(); });
      this.ws.close(1000, 'test close');
    });
  }
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const live = message => message.type === 'room' && message.phase === 'live';
const scores = message => Object.fromEntries(Object.entries(message.seats).map(([seat, value]) => [seat, value.score]));

async function main() {
  const health = await fetch(healthUrl).then(response => response.json());
  assert.equal(health.ok, true);
  assert.equal(health.marker, MARKER);

  const first = new Client('first');
  const welcomeFirst = await first.waitFor(message => message.type === 'welcome');
  const second = new Client('second');
  const welcomeSecond = await second.waitFor(message => message.type === 'welcome');
  assert.deepEqual(new Set([welcomeFirst.role, welcomeSecond.role]), new Set(['p1', 'p2']));

  const p1 = welcomeFirst.role === 'p1' ? first : second;
  const p2 = welcomeFirst.role === 'p2' ? first : second;
  const p1Welcome = welcomeFirst.role === 'p1' ? welcomeFirst : welcomeSecond;
  const { arena_radius: radius } = p1Welcome.rules;
  const [start] = await Promise.all([p1.waitFor(live), p2.waitFor(live)]);

  // p1 holds its spawn while p2 is knocked toward -z past the edge. Each client reports only its own ball.
  const holding = p1.roll(start.round, p1Welcome.spawn.p1, { x: 0, z: 0 }, 1500);
  const pushed = p2.roll(start.round, p1Welcome.spawn.p2, { x: 0, z: -6 }, 1500);
  const relayed = await p1.waitFor(message => message.type === 'pose' && message.seat === 'p2', 3000);
  assert.equal(relayed.round, start.round);
  const [p1Scored, p2Scored] = await Promise.all([
    p1.waitFor(message => message.type === 'room' && message.event.kind === 'point', 8000),
    p2.waitFor(message => message.type === 'room' && message.event.kind === 'point', 8000),
  ]);
  await Promise.all([holding, pushed]);
  assert.deepEqual(scores(p1Scored), scores(p2Scored), 'both clients must receive the same refereed score');
  assert.deepEqual(scores(p1Scored), { p1: 1, p2: 0, p3: 0, p4: 0 });
  assert.equal(p1Scored.event.seat, 'p1');
  assert.equal(p1Scored.seats.p2.out, true, 'the pushed ball must be out');
  assert.equal(p1Scored.seats.p1.out, false, 'the standing ball must stay in');
  const lastP2 = [...p1.messages].reverse().find(message => message.type === 'pose' && message.seat === 'p2');
  assert.ok(Math.hypot(lastP2.x, lastP2.z) > radius, 'the referee used the reported position past the edge');

  const reset = await p2.waitFor(message => message.type === 'room' && message.phase === 'countdown' && message.seq > p2Scored.seq, 5000);
  assert.equal(reset.seats.p2.out, false, 'the next round brings both balls back');
  assert.deepEqual(scores(reset), { p1: 1, p2: 0, p3: 0, p4: 0 });

  const scoreBeforeReconnect = scores(reset);
  await p1.close();
  await p2.waitFor(message => message.type === 'room' && message.phase === 'waiting' && message.seats.p1.connected === false, 5000);

  const resumed = new Client('resumed-p1', p1Welcome.resume_token);
  const resumedWelcome = await resumed.waitFor(message => message.type === 'welcome');
  assert.equal(resumedWelcome.role, 'p1');
  const resumedState = await resumed.waitFor(live, 6000);
  assert.deepEqual(scores(resumedState), scoreBeforeReconnect, 'reconnect must restore the refereed score');
  await p2.waitFor(message => live(message) && message.seats.p1.connected === true, 5000);

  await resumed.roll(resumedState.round, p1Welcome.spawn.p1, { x: 2, z: 0 }, 400);
  await p2.waitFor(message => message.type === 'pose' && message.seat === 'p1' && message.round === resumedState.round && message.x > 0.3, 5000);

  await resumed.close();
  await p2.close();
  console.log(JSON.stringify({
    marker: MARKER,
    result: 'PASS',
    room,
    roles: { first: welcomeFirst.role, second: welcomeSecond.role },
    score: scoreBeforeReconnect,
    checks: ['pose-relay', 'ring-out-referee', 'shared-score', 'round-reset', 'disconnect', 'resume-token', 'post-reconnect-pose'],
  }));
}

main().catch(error => {
  console.error(JSON.stringify({ marker: MARKER, result: 'FAIL', error: error.stack || String(error) }));
  process.exitCode = 1;
});
