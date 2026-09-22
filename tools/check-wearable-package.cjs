// Smoke-check the JavaScript actually shipped in an RPK, with native APIs mocked.
// This validates packaging and startup behavior, not the Vela native renderer.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Zip = require('../wearable/node_modules/adm-zip');
const project = path.resolve(__dirname, '..');
const sourceManifest = JSON.parse(fs.readFileSync(path.join(project, 'wearable/src/manifest.json'), 'utf8'));
const rpk = path.resolve(process.argv[2] || path.join(project, 'wearable/dist', sourceManifest.package + '.debug.' + sourceManifest.versionName + '.rpk'));
const archive = new Zip(rpk);
const manifest = JSON.parse(archive.readAsText('manifest.json'));
assert.equal(manifest.versionName, sourceManifest.versionName);
assert.equal(manifest.versionCode, sourceManifest.versionCode);
let apiLoads = 0;
let available = false;
const connection = { getReadyState: callbacks => callbacks.success({ status: 1 }), send() {} };
const screenRequests = [];
const saved = [];
const system = {
  setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {},
  $app_require$(name) {
    apiLoads++;
    if (name === '@app-module/system.storage') return {
      get: callbacks => callbacks.success(''),
      set: callbacks => { saved.push(JSON.parse(callbacks.value)); callbacks.success(); }
    };
    if (name === '@app-module/system.brightness') return { setKeepScreenOn({ keepScreenOn }) { screenRequests.push(keepScreenOn); } };
    if (available && name === '@app-module/system.interconnect') return { instance: () => connection };
    throw new Error('mock unavailable firmware API');
  }
};
const context = vm.createContext({
  $app_require$: system.$app_require$, console,
  aiot: {
    __ce__(type, binding, children) { return { type, options: binding.__opts__, children: children.flat() }; },
    __cf__(binding, create) { return binding.__opts__.exp().flatMap((item, index) => create(index, item)); },
    __ci__(binding, create) { return binding.__opts__.shown() ? create() : []; }
  }
});
function load(file) {
  const source = archive.readAsText(file).replace(/^export default /, '');
  const entry = vm.runInContext('(' + source + ')', context, { filename: file });
  const container = {};
  entry(system, system, system, container, () => {});
  if (container.entry) container.entry(container);
  return container.default;
}
assert.ok(load('app.js'));
const definition = load('pages/index/index.js');
const page = Object.assign({}, definition.data, definition);
page.onInit();
assert.equal(apiLoads, 0, 'native APIs must not load before initial rendering');
page.onReady();
assert.match(page.status, /连接不可用/);
page.onShow();
available = true;
page.retry();
connection.onmessage({ data: JSON.stringify({ v: 1, type: 'navigation', session: 'package-check', seq: 1,
  status: 'active', title: '高德地图', rawText: '右转进入示例路', maneuver: 'right', instruction: '右转', distance: '200 米' }) });
assert.equal(page.distance, '200 米');
assert.equal(page.status, '高德导航');
assert.equal(typeof page.localDemo, 'undefined');
assert.ok(manifest.features.some(feature => feature.name === 'system.brightness'));
assert.deepEqual(screenRequests, [true]);
const tree = page.template(page);
const styles = Object.fromEntries(definition.style.map(rule => [rule[0][0][1], rule[1]]));
assert.equal(tree.type, 'div');
let rows = 0;
function visit(node) {
  if (node.type === 'list' || node.type === 'list-item') {
    const style = Object.assign({}, ...node.options.classList.map(name => styles[name]));
    assert.ok(parseInt(style.height) > 0, node.type + ' needs an explicit height');
    assert.ok(parseInt(style.width) > 0, node.type + ' needs an explicit width');
    if (node.type === 'list-item') rows++;
  }
  if (node.type === 'image') {
    const source = typeof node.options.src === 'function' ? node.options.src() : node.options.src;
    assert.ok(archive.getEntry(source.replace(/^\//, '')), 'image missing: ' + source);
  }
  node.children.forEach(visit);
}
visit(tree);
assert.ok(rows > 0);
function byClass(node, name) {
  if ((node.options.classList || []).includes(name)) return node;
  for (const child of node.children) { const found = byClass(child, name); if (found) return found; }
  return null;
}
function click(name, within) {
  const node = byClass(within || page.template(page), name);
  assert.ok(node, 'missing clickable node: ' + name);
  node.options.events.click({});
}
click('settings-entry');
assert.equal(page.settingsOpen, true);
assert.equal(byClass(page.template(page), 'home'), null, 'home must be removed, not left behind the settings page');
const settingsTree = byClass(page.template(page), 'settings');
assert.ok(settingsTree);
for (const name of ['settings', 'home']) {
  assert.equal(styles[name].position, 'absolute');
  assert.equal(styles[name].top, '0px');
  assert.equal(styles[name].left, '0px');
}
for (let i = 0; i < 6; i++) click('increase', byClass(page.template(page), 'font-size-row'));
assert.equal(page.fontSize, 36);
assert.equal(saved.at(-1).fontSize, 36);
assert.equal(page.versionName, manifest.versionName);
click('font-selector');
assert.equal(page.fontPickerOpen, true);
assert.equal(byClass(page.template(page), 'settings-list'), null);
const fontChoices = byClass(page.template(page), 'font-options').children;
for (let i = 1; i <= 3; i++) {
  if (!page.fontPickerOpen) click('font-selector');
  click('font-choice', byClass(page.template(page), 'font-options').children[i]);
  assert.equal(page.font, ['default', 'song', 'kai', 'round'][i]);
  assert.equal(saved.at(-1).font, page.font);
  assert.equal(page.fontPickerOpen, false);
  const family = page.fontFamily;
  assert.ok(archive.getEntry('common/fonts/' + family + '.ttf'));
  assert.ok(archive.getEntry('common/fonts/' + family + '-OFL.txt'));
  assert.ok(styles[family].fontface, 'compiled font-face definition: ' + family);
  assert.ok(archive.readFile('common/fonts/' + family + '.ttf').equals(
    fs.readFileSync(path.join(project, 'wearable/src/common/fonts', family + '.ttf'))));
}
click('reset-defaults');
assert.equal(page.font, 'default');
assert.equal(page.fontSize, 30);
assert.equal(page.arrowSize, 42);
assert.equal(page.arrowWeight, 8);
click('back');
assert.equal(byClass(page.template(page), 'settings'), null);
assert.ok(byClass(page.template(page), 'navigation-stage'));
assert.equal(byClass(page.template(page), 'rest'), null);
assert.equal(page.guidanceLines.join(''), '右转进入示例路');
assert.ok(archive.getEntry('common/settings.png'));
for (let i = 0; i < 3; i++) { click('settings-entry'); click('back'); }
for (let weight = 4; weight <= 10; weight++) {
  for (const maneuver of ['left', 'right', 'straight', 'slight_left', 'slight_right', 'sharp_left', 'sharp_right', 'uturn', 'roundabout', 'arrive', 'unknown']) {
    assert.ok(archive.getEntry('common/arrows/' + weight + '/' + maneuver + '.png'));
  }
}
page.onDestroy();
assert.deepEqual(screenRequests, [true, false, true, false, true, false, true, false, true, false]);
console.log('RPK ' + manifest.versionName + ': startup, compiled click handlers, font choices/resources, exclusive page trees, settings persistence/reset, navigation, screen lifecycle and assets passed.');
