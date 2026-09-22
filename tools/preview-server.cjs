// Local developer preview only. No ADB, credentials, signing or third-party packages.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1..65535');
const routes = new Map([
  ['/', 'wearable-source.html'],
  ['/settings', 'wearable-settings-preview.html']
]);
function generate(script) { execFileSync(process.execPath, [path.join(__dirname, script)], { stdio: 'inherit' }); }
generate('preview-wearable.cjs');
generate('preview-settings.cjs');
let revision = 0;
let timer;
const inputs = ['wearable/src/pages/index/index.ux', 'wearable/src/common/presentation.js', 'wearable/src/common/protocol.js', 'wearable/src/common/settings.js', 'wearable/src/common/font-coverage.js', 'wearable/src/manifest.json', 'tools/preview-wearable.cjs', 'tools/preview-runtime.js', 'tools/preview-settings.cjs', 'tools/preview-settings.html', 'tools/preview-preferences.cjs'];
const watchers = inputs.map(file => fs.watch(path.join(root, file), () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try { generate('preview-wearable.cjs'); generate('preview-settings.cjs'); revision++; }
    catch (error) { console.error('预览生成失败；保留上次结果。', error.message); }
  }, 150);
}));
const server = http.createServer((request, response) => {
  // Serve only public previews, never the repository, phone screenshots or signing files.
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
  response.setHeader('Cache-Control', 'no-store');
  if (pathname === '/revision') { response.end(String(revision)); return; }
  const file = routes.get(pathname);
  if (!file) { response.writeHead(404); response.end('Not found'); return; }
  try {
    const html = fs.readFileSync(path.join(root, 'outputs/previews', file), 'utf8');
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    const reload = `<script>let revision=${revision};setInterval(async()=>{try{const next=await(await fetch('/revision')).text();if(Number(next)!==revision)location.reload()}catch{}},1000)</script>`;
    response.end(request.method === 'HEAD' ? undefined : html.replace('</html>', reload + '</html>'));
  } catch { response.writeHead(500); response.end('Preview unavailable'); }
});
server.on('error', error => { console.error(error.message); watchers.forEach(watcher => watcher.close()); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => {
  console.log(`源码预览 http://127.0.0.1:${port}/`);
  console.log(`显示设置 http://127.0.0.1:${port}/settings`);
  console.log('修改手环页面后自动刷新；Ctrl+C 停止。浏览器预览不等于真机验收。');
});
