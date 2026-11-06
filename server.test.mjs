import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { WebSocket } from 'ws';

async function startServer(env = {}) {
  const child = spawn(process.execPath, ['authoritative_server.mjs'], {
    cwd: import.meta.dirname, env: { ...process.env, HOST: '127.0.0.1', PORT: '0', ALLOWED_ORIGINS: '', ...env }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let errors = '';
  child.stderr.on('data', chunk => { errors += chunk; });
  const ready = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server startup timeout: ' + errors)), 10000);
    child.once('exit', code => { clearTimeout(timer); reject(new Error('server exit ' + code + ': ' + errors)); });
    let output = '';
    child.stdout.on('data', chunk => {
      output += chunk;
      if (output.includes('\n')) {
        try { const value = JSON.parse(output.split('\n')[0]); clearTimeout(timer); resolve(value); } catch (error) { reject(error); }
      }
    });
  }).catch(error => { child.kill(); throw error; });
  return { child, port: ready.port, url: `ws://127.0.0.1:${ready.port}/ws` };
}

async function client(url, room, resume, options) {
  const ws = new WebSocket(`${url}?room=${room}${resume ? '&resume=' + encodeURIComponent(resume) : ''}`, options);
  const messages = [];
  const waiters = new Set();
  ws.on('error', () => {});
  ws.on('message', bytes => {
    const value = JSON.parse(bytes.toString());
    messages.push(value);
    if (messages.length > 200) messages.shift();
    for (const waiter of waiters) if (waiter.predicate(value)) { waiters.delete(waiter); clearTimeout(waiter.timer); waiter.resolve(value); }
  });
  function wait(predicate, timeout = 6000) {
    const existing = messages.find(predicate);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, timer: setTimeout(() => { waiters.delete(waiter); reject(new Error('packet timeout')); }, timeout) };
      waiters.add(waiter);
    });
  }
  let seq = 0;
  const welcome = await wait(value => value.type === 'welcome');
  const pose = (round, x, z, extra = {}) => ws.send(JSON.stringify({ type: 'pose', seq: ++seq, round, x, z, vx: 0, vz: 0, lat: 10, ...extra }));
  return { ws, welcome, wait, messages, pose };
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const live = value => value.type === 'room' && value.phase === 'live';
const poseFrom = seat => value => value.type === 'pose' && value.seat === seat;

test('four seats, spectators, isolated rooms, strict pose and hit relay, and seat resume', { timeout: 20000 }, async () => {
  const { child, url } = await startServer();
  const clients = [];
  const open = async (...args) => { const value = await client(url, ...args); clients.push(value); return value; };
  try {
    const [p1, p2, p3, p4] = [await open('ROOM'), await open('ROOM'), await open('ROOM'), await open('ROOM')];
    const spectator = await open('ROOM');
    const other = await open('ELSE');
    assert.deepEqual([p1, p2, p3, p4, spectator, other].map(value => value.welcome.role), ['p1', 'p2', 'p3', 'p4', 'spectator', 'p1']);
    assert.deepEqual(p1.welcome.rules, { arena_radius: 10, ball_radius: 0.8, accel: 16, damping: 1.1, max_speed: 9, restitution: 0.95, win_score: 3 });
    assert.deepEqual(p1.welcome.spawn, { p1: { x: 0, z: 4 }, p2: { x: 0, z: -4 }, p3: { x: 4, z: 0 }, p4: { x: -4, z: 0 } });
    const started = await p2.wait(live);
    assert.deepEqual(Object.values(started.seats).map(seat => seat.playing), [true, true, true, true]);
    const round = started.round;
    spectator.pose(round, 1, 0);
    p1.pose(round + 1, 1, 0);
    p1.pose(round, '1', 0);
    p1.pose(round, 0, 0, { vx: 30 });
    p1.pose(round, 0, 20);
    p1.pose(round, 0, 0, { lat: 5000 });
    p1.ws.send(JSON.stringify({ type: 'pose', seq: 0, round, x: 0, z: 0, vx: 0, vz: 0, lat: 0 }));
    p1.ws.send(JSON.stringify({ type: 'pose', seq: 1.5, round, x: 0, z: 0, vx: 0, vz: 0, lat: 0 }));
    p1.pose(round, 0.5, 3.5, { vx: 1, vz: -2 });
    const relayed = await p2.wait(poseFrom('p1'));
    assert.deepEqual(relayed, { type: 'pose', marker: 'ring-out-v2', room: 'ROOM', seat: 'p1', round, seq: 6, x: 0.5, z: 3.5, vx: 1, vz: -2, lat: 10 });
    assert.equal(p2.messages.filter(poseFrom('p1')).length, 1, 'invalid poses must not be relayed');
    await spectator.wait(poseFrom('p1'));
    await p4.wait(poseFrom('p1'));
    assert.equal(p2.messages.some(poseFrom('spectator')), false);
    p1.ws.send(JSON.stringify({ type: 'pose', seq: 6, round, x: 1, z: 1, vx: 0, vz: 0, lat: 0 }));
    await sleep(150);
    assert.equal(p1.messages.some(poseFrom('p1')), false, 'the owner never receives its own pose back');
    assert.equal(p2.messages.filter(poseFrom('p1')).length, 1, 'a repeated sequence must not be relayed');
    // A contact half goes only to the owner of the ball that was hit, and only within reach.
    p2.pose(round, 0.5, 2.2);
    await p1.wait(poseFrom('p2'));
    const hit = (from, extra = {}) => from.ws.send(JSON.stringify({ type: 'hit', to: 'p2', round, jx: 3, jz: -1, ...extra }));
    // p3 is still on its spawn, out of reach of p1.
    for (const extra of [{ to: 'p1' }, { to: 'p9' }, { to: 'p3' }, { round: round + 1 }, { jx: 40 }, { jz: 'x' }]) hit(p1, extra);
    hit(spectator);
    hit(p1);
    hit(p1);
    assert.deepEqual(await p2.wait(value => value.type === 'hit'), { type: 'hit', marker: 'ring-out-v2', room: 'ROOM', seat: 'p1', round, jx: 3, jz: -1 });
    await sleep(150);
    assert.equal(p2.messages.filter(value => value.type === 'hit').length, 1, 'invalid hits and a repeat within the interval must not be relayed');
    assert.equal([p1, p3, p4, spectator].some(value => value.messages.some(message => message.type === 'hit')), false, 'a hit goes only to its target');
    const isolated = await other.wait(value => value.type === 'room');
    assert.equal(isolated.phase, 'waiting');
    assert.equal(isolated.seats.p1.connected, true);
    assert.equal(other.messages.some(value => value.type === 'pose'), false);
    other.ws.send(JSON.stringify({ type: 'ping', t: 1234 }));
    assert.deepEqual(await other.wait(value => value.type === 'pong'), { type: 'pong', marker: 'ring-out-v2', room: 'ELSE', t: 1234 });
    const closed = once(p1.ws, 'close');
    const resumed = await open('ROOM', p1.welcome.resume_token);
    assert.equal(resumed.welcome.role, 'p1');
    assert.equal((await closed)[0], 4001);
    resumed.ws.send('not json');
    const rejected = await resumed.wait(value => value.type === 'error');
    assert.deepEqual(rejected, { type: 'error', marker: 'ring-out-v2', room: 'ROOM', code: 'invalid_message' });
    const response = await fetch(url.replace('ws:', 'http:').replace('/ws', '/healthz'));
    assert.equal((await response.json()).marker, 'ring-out-v2');
  } finally {
    for (const value of clients) value.ws.terminate();
    child.kill('SIGTERM');
    await once(child, 'exit');
  }
});

test('original two-client push-out scoring and disconnect regression', { timeout: 40000 }, async () => {
  const { child, url } = await startServer();
  const runner = spawn(process.execPath, ['e2e_clients.mjs', url], { cwd: import.meta.dirname, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  runner.stdout.on('data', data => { output += data; });
  runner.stderr.on('data', data => { output += data; });
  const timeout = setTimeout(() => runner.kill('SIGKILL'), 35000);
  try {
    const [code] = await once(runner, 'exit');
    assert.equal(code, 0, output);
    assert.match(output, /"result":"PASS"/);
  } finally { clearTimeout(timeout); runner.kill(); child.kill('SIGTERM'); await once(child, 'exit'); }
});

test('referee: last ball standing scores; stale rounds, late joiners and leavers', { timeout: 30000 }, async () => {
  const { child, url } = await startServer();
  const clients = [];
  const open = async (...args) => { const value = await client(url, ...args); clients.push(value); return value; };
  try {
    const [p1, p2, p3] = [await open('REFS'), await open('REFS'), await open('REFS')];
    const first = await p1.wait(live);
    p1.pose(first.round, 0, 3);
    p3.pose(first.round, 10.5, 0, { vx: 3 });
    const out = await p1.wait(value => value.type === 'room' && value.event.kind === 'ringout');
    assert.equal(out.event.seat, 'p3');
    assert.equal(out.phase, 'live', 'two balls are still in, so the round goes on');
    assert.equal(out.seats.p3.out, true);
    p3.pose(first.round, 12, 0);
    p2.pose(first.round, 0, -10.2, { vz: -2 });
    const point = await p3.wait(value => value.type === 'room' && value.event.kind === 'point');
    assert.equal(point.event.seat, 'p1');
    assert.equal(point.phase, 'point');
    assert.deepEqual(Object.values(point.seats).map(seat => seat.score), [1, 0, 0, 0]);
    const outs = new Set(p1.messages.filter(value => value.type === 'room' && value.event.kind === 'ringout').map(value => value.event.seq));
    assert.equal(outs.size, 2, 'p3 out once, then p2');

    const second = await p2.wait(value => live(value) && value.round > first.round, 8000);
    p2.pose(first.round, 1, 1);
    p2.pose(second.round, 0, -3);
    p1.pose(second.round, 0, 3);
    const fresh = await p1.wait(value => poseFrom('p2')(value) && value.round === second.round);
    assert.equal(fresh.seq, 3, 'the stale-round pose was dropped, not relayed');
    assert.equal(p1.messages.filter(value => poseFrom('p2')(value) && value.round === first.round).length, 1);

    const late = await open('REFS');
    assert.equal(late.welcome.role, 'p4');
    const joined = await late.wait(value => value.type === 'room');
    assert.equal(joined.seats.p4.playing, false, 'a late joiner waits for the next round');
    assert.equal(joined.seats.p4.score, 0);
    await late.wait(poseFrom('p2'), 2000);
    late.pose(second.round, 0, 0);
    await sleep(150);
    assert.equal(p1.messages.some(poseFrom('p4')), false, 'a seat outside the round cannot publish');

    p3.ws.close();
    const left = await p1.wait(value => value.type === 'room' && value.round === second.round && value.seats.p3.connected === false);
    assert.equal(left.seats.p3.out, true);
    assert.equal(left.phase, 'live');
    assert.equal(left.event.kind, 'round', 'leaving is not a ring-out event');
    p2.pose(second.round, 0, -11);
    const won = await p1.wait(value => value.type === 'room' && value.event.kind === 'point' && value.event.seq > left.event.seq);
    assert.equal(won.event.seat, 'p1');
    assert.equal(won.seats.p1.score, 2);
    const third = await late.wait(value => live(value) && value.round > second.round, 8000);
    assert.equal(third.seats.p4.playing, true, 'the late joiner plays the next round');
    assert.equal(third.seats.p3.playing, false);
  } finally {
    for (const value of clients) value.ws.terminate();
    child.kill('SIGTERM');
    await once(child, 'exit');
  }
});

test('referee safeguards: hit reach and rate, mid-round resume, simultaneous falls, silent seats', { timeout: 30000 }, async () => {
  const { child, url } = await startServer();
  const clients = [];
  const open = async (...args) => { const value = await client(url, ...args); clients.push(value); return value; };
  try {
    const [p1, p2, p3] = [await open('SAFE'), await open('SAFE'), await open('SAFE')];
    const { round } = await p1.wait(live);
    p1.pose(round, 0, 3);
    p2.pose(round, 0, -3);
    await Promise.all([p1.wait(poseFrom('p2')), p2.wait(poseFrom('p1'))]);
    const hit = () => p1.ws.send(JSON.stringify({ type: 'hit', to: 'p2', round, jx: 0, jz: -2 }));
    hit();
    await sleep(150);
    assert.equal(p2.messages.some(value => value.type === 'hit'), false, 'a hit across the arena must not be relayed');
    p2.pose(round, 0, 1.5);
    await p1.wait(value => poseFrom('p2')(value) && value.z === 1.5);
    hit();
    hit();
    await p2.wait(value => value.type === 'hit');
    await sleep(100);
    assert.equal(p2.messages.filter(value => value.type === 'hit').length, 1, 'one hit per pair within the interval');

    // A seat that resumes mid-round is out of that round; the others play on.
    const closed = once(p3.ws, 'close');
    const resumed = await open('SAFE', p3.welcome.resume_token);
    assert.equal(resumed.welcome.role, 'p3');
    assert.equal((await closed)[0], 4001);
    const after = await resumed.wait(value => value.type === 'room');
    assert.equal(after.phase, 'live');
    assert.equal(after.seats.p3.out, true);
    assert.equal(after.event.kind, 'round', 'a resume is not a ring-out event');

    // Both remaining balls fall within the grace period: nobody scores.
    p1.pose(round, 0, 10.5, { vz: 3 });
    p2.pose(round, 0, -10.5, { vz: -3 });
    const draw = await p1.wait(value => value.type === 'room' && value.event.kind === 'point');
    assert.equal(draw.event.seat, '');
    assert.deepEqual(Object.values(draw.seats).map(seat => seat.score), [0, 0, 0, 0]);

    // p1 keeps publishing; p2 and p3 stay silent and are out after SILENT_MS, so p1 scores.
    const second = await p1.wait(value => live(value) && value.round > round, 8000);
    const liveAt = Date.now();
    const keepAlive = setInterval(() => p1.pose(second.round, 0, 3), 100);
    try {
      const won = await p1.wait(value => value.type === 'room' && value.event.kind === 'point' && value.event.seq > second.event.seq, 8000);
      assert.ok(Date.now() - liveAt >= 2500, 'silent seats get the full timeout');
      assert.equal(won.event.seat, 'p1');
      assert.equal(won.seats.p2.out && won.seats.p3.out, true);
      assert.equal(p1.messages.some(value => value.type === 'room' && value.event.seq > second.event.seq && value.event.kind === 'ringout'), false, 'silence is not a ring-out event');
    } finally { clearInterval(keepAlive); }
  } finally {
    for (const value of clients) value.ws.terminate();
    child.kill('SIGTERM');
    await once(child, 'exit');
  }
});

test('browser origins: same-origin and ALLOWED_ORIGINS connect, other origins are refused', { timeout: 15000 }, async () => {
  const { child, port, url } = await startServer({ ALLOWED_ORIGINS: 'http://127.0.0.1:3000' });
  const clients = [];
  try {
    const refused = new WebSocket(`${url}?room=ORIGIN`, { origin: 'http://127.0.0.1:3001' });
    const outcome = await new Promise(resolve => {
      refused.once('open', () => resolve('open'));
      refused.once('error', () => resolve('refused'));
    });
    assert.equal(outcome, 'refused');
    for (const origin of ['http://127.0.0.1:3000', `http://127.0.0.1:${port}`]) {
      const value = await client(url, 'ORIGIN', undefined, { origin });
      clients.push(value);
      assert.equal(value.welcome.type, 'welcome', origin);
    }
  } finally {
    for (const value of clients) value.ws.close();
    child.kill();
  }
});
