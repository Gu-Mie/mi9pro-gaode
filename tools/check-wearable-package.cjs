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
const system = {
  setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {},
  $app_require$(name) {
    apiLoads++;
    if (name === '@app-module/system.brightness') return { setKeepScreenOn({ keepScreenOn }) { screenRequests.push(keepScreenOn); } };
    if (available && name === '@app-module/system.interconnect') return { instance: () => connection };
    throw new Error('mock unavailable firmware API');
  }
};
const context = vm.createContext({
  $app_require$: system.$app_require$, console,
  aiot: {
    __ce__(type, binding, children) { return { type, options: binding.__opts__, children: children.flat() }; },
    __cf__(binding, create) { return binding.__opts__.exp().flatMap((item, index) => create(index, item)); }
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
page.onDestroy();
assert.deepEqual(screenRequests, [true, false]);
console.log('RPK ' + manifest.versionName + ': app/page entry, API failure fallback, navigation rendering, screen-on lifecycle, list dimensions and image assets passed.');
