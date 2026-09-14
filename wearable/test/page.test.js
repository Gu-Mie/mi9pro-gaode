const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { lines, errorText, details } = require('../src/common/presentation');

const source = fs.readFileSync(path.join(__dirname, '../src/pages/index/index.ux'), 'utf8')
  .match(/<script>([\s\S]*?)<\/script>/)[1].replace('export default', 'module.exports =');

function launch(options = {}) {
  let now = 100000;
  let loads = 0;
  let tick;
  let due = 0;
  let timerRuns = 0;
  const sent = [];
  const pending = [];
  const screenRequests = [];
  const screenCallbacks = [];
  const connection = {
    getReadyState(callbacks) {
      if (options.stateThrows) throw new Error('state unavailable');
      if (options.pending) pending.push(callbacks);
      else callbacks.success({ status: options.connected ? 1 : 2 });
    },
    send(callbacks) {
      if (options.sendThrows) throw new Error('transport unavailable');
      sent.push(JSON.parse(callbacks.data));
    }
  };
  const context = {
    module: { exports: {} },
    Date: { now: () => now },
    setTimeout: (callback, delay) => { tick = callback; due = now + delay; return 1; },
    clearTimeout: () => { tick = null; },
    require(name) {
      if (name === '@system.brightness') {
        if (options.brightnessMissing) throw new Error('brightness unavailable');
        return { setKeepScreenOn(callbacks) {
          screenRequests.push(callbacks.keepScreenOn);
          screenCallbacks.push(callbacks);
          if (options.brightnessFails) callbacks.fail('unsupported', 201);
        } };
      }
      if (name === '@system.interconnect') {
        loads++;
        if (options.loadThrows) throw new Error('API missing');
        return { instance() {
          if (options.instanceThrows) throw new Error('instance unavailable');
          return connection;
        } };
      }
      return require(path.resolve(__dirname, '../src/pages/index', name));
    }
  };
  vm.runInNewContext(source, context);
  const definition = context.module.exports;
  const page = Object.assign({}, definition.private, definition);
  page.onInit();
  return { page, connection, sent, pending, screenRequests, screenCallbacks, loads: () => loads,
    advance(ms) { now += ms; if (tick && now >= due) { const run = tick; tick = null; timerRuns++; run(); } },
    timerRuns: () => timerRuns, running: () => !!tick };
}

const navigation = seq => ({ v: 1, type: 'navigation', session: 'phone', seq, status: 'active', title: '高德地图', rawText: '前方200米右转', maneuver: 'right', instruction: '右转', distance: '200 米' });

test('page creates visible initial data before loading interconnect', () => {
  const app = launch({ loadThrows: true });
  assert.equal(app.loads(), 0);
  assert.equal(app.page.status, '等待连接');
  assert.doesNotThrow(() => app.page.onReady());
  assert.equal(app.page.status, '连接不可用');
  assert.match(app.page.rawLines.join(''), /API missing/);
});

test('instance and state exceptions preserve a readable failure state', () => {
  for (const options of [{ instanceThrows: true }, { stateThrows: true }]) {
    const app = launch(options);
    assert.doesNotThrow(() => app.page.onReady());
    app.page.onShow();
    assert.equal(app.page.status, '连接不可用');
    assert.equal(app.page.icon, '/common/unknown.png');
    assert.equal(app.page.distance, '');
    assert.equal(app.running(), false);
  }
});

test('phone updates acknowledge, reject duplicates, and expire normally', () => {
  const app = launch({ connected: true });
  app.page.onReady();
  app.page.onShow();
  assert.equal(app.sent[0].type, 'ready');
  app.connection.onmessage({ data: JSON.stringify(navigation(1)) });
  assert.equal(app.page.status, '高德导航');
  assert.deepEqual(app.sent.at(-1), { v: 1, type: 'ack', session: 'phone', seq: 1 });
  const count = app.sent.length;
  app.connection.onmessage({ data: JSON.stringify(navigation(1)) });
  app.connection.onmessage(null);
  assert.equal(app.sent.length, count);
  app.advance(20000);
  assert.equal(app.page.status, '导航已过期');
  assert.equal(app.page.distance, '');
});

test('disconnect exposes firmware error code and clears stale directions', () => {
  const app = launch({ connected: true });
  app.page.onReady();
  app.page.onShow();
  app.connection.onmessage({ data: JSON.stringify(navigation(1)) });
  app.connection.onerror({ code: 1006, data: 'disconnected' });
  assert.equal(app.page.distance, '');
  assert.equal(app.page.icon, '/common/unknown.png');
  assert.match(app.page.rawLines.join(''), /1006/);
  app.connection.onopen();
  assert.equal(app.page.status, '高德导航');
});

test('send exceptions do not abort opening the page', () => {
  const app = launch({ connected: true, sendThrows: true });
  assert.doesNotThrow(() => app.page.onReady());
  assert.match(app.page.rawLines.join(''), /发送失败/);
});

test('late callbacks after page destruction do not update or send', () => {
  const app = launch({ pending: true });
  app.page.onReady();
  app.page.onShow();
  const message = app.connection.onmessage;
  app.page.onDestroy();
  const status = app.page.status;
  assert.equal(app.running(), false);
  app.pending.forEach(callback => callback.success({ status: 1 }));
  message({ data: JSON.stringify(navigation(1)) });
  assert.equal(app.page.status, status);
  assert.equal(app.sent.length, 0);
});

test('fixed rows preserve long navigation text, line breaks and Unicode pairs', () => {
  const text = '前往下一路口右转请注意路况🚦再继续直行'.repeat(20);
  const rows = lines(text);
  assert.equal(rows.join(''), text);
  for (const row of rows) {
    assert.ok(Array.from(row).length <= 14);
    assert.ok(!/^[\udc00-\udfff]|[\ud800-\udbff]$/.test(row));
  }
  assert.deepEqual(lines('第一行\r\n第二行'), ['第一行', '第二行']);
  assert.match(errorText('检查失败', 'disconnected', 1006), /1006/);
  assert.ok(lines('').length > 0);
});

test('keeps active navigation lit across updates and releases on expiry', () => {
  const app = launch({ connected: true });
  app.page.onReady();
  app.page.onShow();
  assert.deepEqual(app.screenRequests, [], 'waiting must not keep the display awake');
  app.connection.onmessage({ data: JSON.stringify(navigation(1)) });
  app.advance(8000);
  app.connection.onmessage({ data: JSON.stringify(navigation(2)) });
  assert.deepEqual(app.screenRequests, [true], 'heartbeats must not reissue the same native request');
  app.advance(20000);
  assert.deepEqual(app.screenRequests, [true, false]);
});

test('idle, end, pause, listener loss and disconnection each release the screen', () => {
  for (const status of ['idle', 'ended', 'paused', 'unavailable', 'disconnect']) {
    const app = launch({ connected: true });
    app.page.onReady();
    app.page.onShow();
    app.connection.onmessage({ data: JSON.stringify(navigation(1)) });
    if (status === 'disconnect') app.connection.onclose({ code: 1006 });
    else app.connection.onmessage({ data: JSON.stringify({ ...navigation(2), status }) });
    assert.deepEqual(app.screenRequests, [true, false], status);
  }
});

test('hidden pages do not relight from incoming data and showing restores fresh navigation', () => {
  const app = launch({ connected: true });
  app.page.onReady();
  app.page.onShow();
  app.connection.onmessage({ data: JSON.stringify(navigation(1)) });
  app.page.onHide();
  app.connection.onmessage({ data: JSON.stringify(navigation(2)) });
  assert.deepEqual(app.screenRequests, [true, false]);
  app.page.onShow();
  assert.deepEqual(app.screenRequests, [true, false, true]);
  app.page.onDestroy();
  assert.deepEqual(app.screenRequests, [true, false, true, false]);
});

test('optional keep-screen-on can be disabled and legacy packets keep the default', () => {
  const app = launch({ connected: true });
  app.page.onReady();
  app.page.onShow();
  app.connection.onmessage({ data: JSON.stringify(navigation(1)) });
  app.connection.onmessage({ data: JSON.stringify({ ...navigation(2), keepScreenOn: false }) });
  assert.deepEqual(app.screenRequests, [true, false]);
  assert.equal(app.page.distance, '200 米');
  app.connection.onmessage({ data: JSON.stringify({ ...navigation(3), keepScreenOn: true }) });
  assert.deepEqual(app.screenRequests, [true, false, true]);
});

test('unchanged heartbeats renew one expiry timer without changing view data', () => {
  const app = launch({ connected: true });
  app.page.onReady(); app.page.onShow();
  app.connection.onmessage({ data: JSON.stringify(navigation(1)) });
  const rows = app.page.rawLines;
  for (let seq = 2; seq <= 10; seq++) {
    app.advance(8000);
    app.connection.onmessage({ data: JSON.stringify(navigation(seq)) });
    assert.equal(app.page.rawLines, rows);
  }
  assert.equal(app.timerRuns(), 0);
  app.advance(19999);
  assert.equal(app.page.status, '高德导航');
  app.advance(1);
  assert.equal(app.page.status, '导航已过期');
  assert.equal(app.timerRuns(), 1);
  assert.equal(app.running(), false);
});

test('idle and hidden pages have no timer and hidden packets do not repaint', () => {
  const app = launch({ connected: true });
  app.page.onReady(); app.page.onShow();
  assert.equal(app.running(), false);
  app.connection.onmessage({ data: JSON.stringify(navigation(1)) });
  app.page.onHide();
  app.connection.onmessage({ data: JSON.stringify({ ...navigation(2), distance: '100 米' }) });
  assert.equal(app.page.distance, '200 米');
  assert.equal(app.running(), false);
  app.page.onShow();
  assert.equal(app.page.distance, '100 米');
  app.connection.onmessage({ data: JSON.stringify({ ...navigation(3), status: 'ended' }) });
  assert.equal(app.running(), false);
  app.advance(60000);
  assert.equal(app.page.status, '导航结束');
});

test('minimal details hide exact duplicates but preserve roads and unknown text', () => {
  assert.equal(details({ live: true, rawText: '直行152米\n高德导航中', instruction: '直行', distance: '152 米' }), '');
  assert.equal(details({ live: true, rawText: '右转进入示例路\n高德导航中', instruction: '右转', distance: '' }), '右转进入示例路');
  assert.equal(details({ live: true, rawText: '请注意特殊指引', instruction: '请查看导航原文', distance: '' }), '请注意特殊指引');
});

test('brightness API failures preserve navigation and do not retry every tick', () => {
  for (const options of [{ brightnessMissing: true }, { brightnessFails: true }]) {
    const app = launch({ connected: true, ...options });
    app.page.onReady();
    app.page.onShow();
    assert.doesNotThrow(() => app.connection.onmessage({ data: JSON.stringify(navigation(1)) }));
    app.advance(1000);
    assert.equal(app.page.distance, '200 米');
    assert.match(app.page.rawLines.join(''), /常亮开启失败/);
    assert.ok(app.screenRequests.length <= 1);
    assert.doesNotThrow(() => app.page.onDestroy());
  }
});

test('an old brightness callback cannot undo a later request', () => {
  const app = launch({ connected: true });
  app.page.onReady();
  app.page.onShow();
  app.connection.onmessage({ data: JSON.stringify(navigation(1)) });
  const oldRequest = app.screenCallbacks[0];
  app.page.onHide();
  oldRequest.fail('late failure', 201);
  assert.deepEqual(app.screenRequests, [true, false]);
  assert.doesNotMatch(app.page.rawLines.join(''), /late failure/);
});
