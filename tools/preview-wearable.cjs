// Execute the actual UX page script and template in a browser adapter.
// Native APIs and rendering are simulated; this is not a Vela firmware emulator.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'wearable/src/pages/index/index.ux'), 'utf8');
const manifest = require('../wearable/src/manifest.json');
const bundle = {
  template: source.match(/<template>([\s\S]*?)<\/template>/)[1],
  script: source.match(/<script>([\s\S]*?)<\/script>/)[1].replace('export default', 'module.exports ='),
  modules: {}, images: {}
};
for (const name of ['protocol', 'presentation', 'settings', 'font-coverage']) {
  bundle.modules['../../common/' + name] = fs.readFileSync(path.join(root, 'wearable/src/common', name + '.js'), 'utf8');
}
bundle.modules['../../manifest.json'] = 'module.exports = ' + JSON.stringify(manifest);
function images(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) images(file);
    else if (entry.name.endsWith('.png')) bundle.images['/' + path.relative(path.join(root, 'wearable/src'), file).replace(/\\/g, '/')] =
      'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
  }
}
images(path.join(root, 'wearable/src/common'));
const styles = source.match(/<style>([\s\S]*?)<\/style>/)[1].replace(/url\('\/common\/fonts\/([^']+)'\)/g,
  (_, name) => "url('data:font/ttf;base64," + fs.readFileSync(path.join(root, 'wearable/src/common/fonts', name)).toString('base64') + "')");
const runtime = fs.readFileSync(path.join(__dirname, 'preview-runtime.js'), 'utf8');
const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>腕上导航 · ${manifest.versionName} 本地调试</title><style>
*{box-sizing:border-box}body{margin:0;background:#f0f3ed;color:#25382c;font-family:"Microsoft YaHei",sans-serif;padding:32px}
h1{font-size:28px;margin:0 0 12px}.intro{font-size:14px;line-height:1.8;margin:0 0 22px;max-width:1000px}
main{display:flex;gap:28px;flex-wrap:wrap}.caption{font-size:14px;margin:16px 4px 0}.controls{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px}
button{border:1px solid #afbeb1;border-radius:9px;padding:9px 14px;background:#fff;color:#25382c;cursor:pointer}
button.selected{background:#25382c;color:#fff}.band{width:352px;height:496px;padding:8px;border-radius:52px;background:#26372c;box-shadow:0 16px 30px #17261a20;overflow:hidden}
.page{border-radius:44px;overflow:hidden}.page :where(div){display:flex;position:relative}.page{display:flex}
.page :where(p){margin:0;white-space:pre-wrap;overflow:hidden;font-weight:400}.page img{display:block}
.page [style*="font-family: sans-serif"]{font-family:"Microsoft YaHei",sans-serif!important}
.page [role=button]{cursor:pointer}.page [role=button]:focus-visible{outline:2px solid #80f5be;outline-offset:-3px}
.page [data-type=list]{display:block;overflow-y:auto;scrollbar-width:none}.page [data-type=list-item]{display:block}
${styles}
@media(max-width:600px){body{padding:16px}h1{font-size:24px}main{gap:24px}}
</style><h1>腕上导航 · ${manifest.versionName} 本地交互调试</h1>
<p class="intro">点击手环中的齿轮、加减和返回，执行与安装包相同的页面代码。设置保存在当前浏览器。下方按钮切换第一个手环的模拟状态。<br>336 × 480；浏览器模拟通信、存储与亮屏接口，不是 Vela 模拟器或真机验收。</p>
<div class="controls" aria-label="模拟状态">
${[['active','正常导航'],['long','长文字'],['idle','等待导航'],['disconnected','断开连接'],['ended','导航结束'],['paused','同步暂停'],['expired','消息过期'],['error','连接错误']].map(([state,label]) => `<button data-scene="${state}">${label}</button>`).join('')}
<button id="reset">恢复预览默认值</button></div>
<main>${['导航 / 可操作','等待导航 / 可操作','显示设置 / 可操作','长文字与最大字号'].map((caption,i)=>`<section><div class="band" id="band-${i}"></div><p class="caption">${caption}</p></section>`).join('')}</main>
<script>const bundle=${JSON.stringify(bundle).replace(/</g,'\\u003c')};\n${runtime}</script></html>`;
const output = path.join(root, 'outputs/previews/wearable-source.html');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html);
console.log(output);
